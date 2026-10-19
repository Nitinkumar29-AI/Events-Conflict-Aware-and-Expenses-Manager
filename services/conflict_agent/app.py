import hmac
import json
import logging
import os
from pathlib import Path
from typing import Annotated, Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Conflict Assistant", docs_url=None, redoc_url=None)
bearer_scheme = HTTPBearer(auto_error=False)


class EventContext(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    event_type: str = Field(min_length=1, max_length=50)
    club_name: str = Field(min_length=1, max_length=120)
    venue_name: str = Field(min_length=1, max_length=120)
    starts_at: str = Field(min_length=1, max_length=40)
    ends_at: str = Field(min_length=1, max_length=40)


class ConflictContext(BaseModel):
    conflict_type: str = Field(min_length=1, max_length=50)
    severity: str = Field(min_length=1, max_length=20)
    score: int | None = Field(default=None, ge=0, le=100)
    overlap_minutes: int | None = Field(default=None, ge=0)
    description: str = Field(min_length=1, max_length=1000)
    event_a: EventContext
    event_b: EventContext


class AssistantAnalysis(BaseModel):
    summary: str = Field(min_length=1, max_length=600)
    reasons: list[str] = Field(min_length=1, max_length=4)
    suggestions: list[str] = Field(min_length=1, max_length=4)
    human_review_required: Literal[True] = True


def require_service_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> None:
    expected_token = os.getenv("AGENT_ASSISTANT_TOKEN", "")
    if (
        len(expected_token) < 32
        or credentials is None
        or credentials.scheme.lower() != "bearer"
        or not hmac.compare_digest(credentials.credentials, expected_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service credentials",
        )


def _provider_url() -> str:
    base_url = os.getenv("AGENT_LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    return f"{base_url}/chat/completions"


def generate_analysis(context: ConflictContext) -> AssistantAnalysis:
    api_key = os.getenv("AGENT_LLM_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The conflict assistant model is not configured.",
        )

    system_message = (
        "You are a read-only campus event conflict assistant. Explain the supplied "
        "conflict using only the supplied facts. Suggest practical alternatives for "
        "a human coordinator to consider. Never claim that an event was changed, "
        "approved, resolved, or cancelled. Return a JSON object with exactly these "
        "fields: summary (string), reasons (array of strings), suggestions (array "
        "of strings). Keep each item concise and do not invent venue availability."
    )
    request_body = {
        "model": os.getenv("AGENT_LLM_MODEL", "gpt-4o-mini"),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": context.model_dump_json()},
        ],
    }
    request = Request(
        _provider_url(),
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=25) as response:
            completion = json.loads(response.read())
        content = completion["choices"][0]["message"]["content"]
        analysis = AssistantAnalysis.model_validate_json(content)
    except HTTPError as error:
        logger.error("Conflict assistant provider returned HTTP %s", error.code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The conflict assistant provider could not complete the request.",
        ) from error
    except (URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError) as error:
        logger.exception("Conflict assistant provider request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The conflict assistant could not generate a valid response.",
        ) from error

    return analysis


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/analyze",
    response_model=AssistantAnalysis,
    dependencies=[Depends(require_service_token)],
)
def analyze_conflict(context: ConflictContext) -> AssistantAnalysis:
    return generate_analysis(context)
