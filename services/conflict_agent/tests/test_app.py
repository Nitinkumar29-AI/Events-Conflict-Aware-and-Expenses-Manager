import json
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.conflict_agent.app import (
    ConflictContext,
    generate_analysis,
    require_service_token,
)


CONTEXT = ConflictContext.model_validate(
    {
        "conflict_type": "VENUE",
        "severity": "HIGH",
        "score": 85,
        "overlap_minutes": 30,
        "description": "Both events use the same venue at the same time.",
        "event_a": {
            "title": "Robotics Workshop",
            "event_type": "WORKSHOP",
            "club_name": "Robotics Club",
            "venue_name": "Hall A",
            "starts_at": "2026-10-20T10:00:00Z",
            "ends_at": "2026-10-20T12:00:00Z",
        },
        "event_b": {
            "title": "Coding Session",
            "event_type": "WORKSHOP",
            "club_name": "Coding Club",
            "venue_name": "Hall A",
            "starts_at": "2026-10-20T11:30:00Z",
            "ends_at": "2026-10-20T13:00:00Z",
        },
    }
)


class ConflictAssistantTests(unittest.TestCase):
    def test_service_auth_rejects_missing_or_short_shared_token(self) -> None:
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="short",
        )
        with patch.dict(os.environ, {"AGENT_ASSISTANT_TOKEN": "short"}, clear=True):
            with self.assertRaises(HTTPException) as raised:
                require_service_token(credentials)

        self.assertEqual(raised.exception.status_code, 401)

    def test_service_auth_accepts_matching_shared_token(self) -> None:
        token = "shared-service-token-that-is-at-least-32-characters"
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token,
        )
        with patch.dict(os.environ, {"AGENT_ASSISTANT_TOKEN": token}, clear=True):
            self.assertIsNone(require_service_token(credentials))

    def test_requires_model_api_key(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as raised:
                generate_analysis(CONTEXT)

        self.assertEqual(raised.exception.status_code, 503)

    def test_validates_provider_output_and_marks_human_review_required(self) -> None:
        provider_response = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "summary": "The events overlap at Hall A.",
                                "reasons": ["Both events use Hall A."],
                                "suggestions": ["Ask both clubs about alternate times."],
                            }
                        )
                    }
                }
            ]
        }

        class MockResponse:
            def __enter__(self) -> "MockResponse":
                return self

            def __exit__(self, *_: object) -> None:
                return None

            def read(self) -> bytes:
                return json.dumps(provider_response).encode("utf-8")

        with (
            patch.dict(os.environ, {"AGENT_LLM_API_KEY": "test-key"}, clear=True),
            patch("services.conflict_agent.app.urlopen", return_value=MockResponse()),
        ):
            result = generate_analysis(CONTEXT)

        self.assertEqual(result.summary, "The events overlap at Hall A.")
        self.assertTrue(result.human_review_required)


if __name__ == "__main__":
    unittest.main()
