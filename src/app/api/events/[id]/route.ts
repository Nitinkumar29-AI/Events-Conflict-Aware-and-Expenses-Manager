import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { successResponse, handleApiError } from '@/server/lib/api-response'
import { eventService } from '@/server/services/event.service'
import { updateEventSchema } from '@/server/validators/event.validator'
import { ForbiddenError } from '@/server/lib/errors'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const event = await eventService.getEventById(user, id)
    return successResponse(event)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const body = await req.json()

    // Explicit zero-trust payload filtering: Prevent reassigning ownership or club
    if (body.submittedByUserId || body.submittedById || body.creatorId || body.clubId) {
      throw new ForbiddenError('Forbidden: Cannot reassign event ownership or club affiliation.')
    }

    const validatedData = updateEventSchema.parse(body)
    const updated = await eventService.updateEvent(user, id, validatedData)
    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const result = await eventService.deleteEvent(user, id)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
