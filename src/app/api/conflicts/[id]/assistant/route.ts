import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/server/lib/auth'
import { errorResponse, handleApiError, successResponse } from '@/server/lib/api-response'
import { ForbiddenError, NotFoundError } from '@/server/lib/errors'
import prisma from '@/server/lib/prisma'

const assistantResponseSchema = z.object({
  summary: z.string().min(1).max(600),
  reasons: z.array(z.string().min(1)).min(1).max(4),
  suggestions: z.array(z.string().min(1)).min(1).max(4),
  human_review_required: z.literal(true),
})

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    if (user.role === 'VIEWER' || user.role === 'MEMBER') {
      throw new ForbiddenError('Members and viewers cannot request conflict assistant analysis.')
    }

    const { id } = await params
    const conflict = await prisma.conflictRecord.findUnique({
      where: { id },
      select: {
        id: true,
        conflictType: true,
        severity: true,
        conflictScore: true,
        overlapMinutes: true,
        description: true,
        eventA: {
          select: {
            clubId: true,
            title: true,
            eventType: true,
            startAt: true,
            endAt: true,
            club: { select: { name: true } },
            venue: { select: { name: true } },
          },
        },
        eventB: {
          select: {
            clubId: true,
            title: true,
            eventType: true,
            startAt: true,
            endAt: true,
            club: { select: { name: true } },
            venue: { select: { name: true } },
          },
        },
      },
    })

    if (!conflict) {
      throw new NotFoundError('Conflict', id)
    }

    if (
      user.role === 'CLUB_REP' &&
      user.clubId !== conflict.eventA.clubId &&
      user.clubId !== conflict.eventB.clubId
    ) {
      throw new ForbiddenError('You cannot request analysis for this conflict.')
    }

    const assistantUrl = process.env.AGENT_ASSISTANT_URL
    const assistantToken = process.env.AGENT_ASSISTANT_TOKEN
    if (!assistantUrl || !assistantToken) {
      return errorResponse(
        'ASSISTANT_NOT_CONFIGURED',
        'The conflict assistant is not configured.',
        503
      )
    }

    let response: Response
    try {
      response = await fetch(`${assistantUrl.replace(/\/$/, '')}/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assistantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflict_type: conflict.conflictType,
          severity: conflict.severity,
          score: conflict.conflictScore,
          overlap_minutes: conflict.overlapMinutes,
          description: conflict.description,
          event_a: {
            title: conflict.eventA.title,
            event_type: conflict.eventA.eventType,
            club_name: conflict.eventA.club.name,
            venue_name: conflict.eventA.venue.name,
            starts_at: conflict.eventA.startAt.toISOString(),
            ends_at: conflict.eventA.endAt.toISOString(),
          },
          event_b: {
            title: conflict.eventB.title,
            event_type: conflict.eventB.eventType,
            club_name: conflict.eventB.club.name,
            venue_name: conflict.eventB.venue.name,
            starts_at: conflict.eventB.startAt.toISOString(),
            ends_at: conflict.eventB.endAt.toISOString(),
          },
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      })
    } catch (error) {
      console.error('Could not reach the Python conflict assistant.', error)
      return errorResponse(
        'ASSISTANT_UNAVAILABLE',
        'The conflict assistant could not be reached.',
        502
      )
    }

    if (!response.ok) {
      console.error(`Conflict assistant returned HTTP ${response.status}.`)
      return errorResponse(
        'ASSISTANT_UNAVAILABLE',
        'The conflict assistant could not complete the request.',
        502
      )
    }

    const payload = assistantResponseSchema.safeParse(await response.json())
    if (!payload.success) {
      console.error('Conflict assistant returned an invalid response.', payload.error)
      return errorResponse(
        'ASSISTANT_INVALID_RESPONSE',
        'The conflict assistant returned an invalid response.',
        502
      )
    }

    return successResponse(payload.data)
  } catch (error) {
    return handleApiError(error)
  }
}
