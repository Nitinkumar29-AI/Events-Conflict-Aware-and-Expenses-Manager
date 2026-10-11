import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { successResponse, handleApiError } from '@/server/lib/api-response'
import { archiveService } from '@/server/services/archive.service'
import { archiveEventFilterSchema } from '@/server/validators/archive.validator'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = archiveEventFilterSchema.parse(searchParams)
    const result = await archiveService.getHistoricalEvents(user, filters)
    return successResponse(result.events, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
