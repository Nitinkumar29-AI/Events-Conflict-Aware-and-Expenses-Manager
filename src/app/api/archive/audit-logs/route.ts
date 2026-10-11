import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { successResponse, handleApiError } from '@/server/lib/api-response'
import { archiveService } from '@/server/services/archive.service'
import { archiveAuditLogFilterSchema } from '@/server/validators/archive.validator'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = archiveAuditLogFilterSchema.parse(searchParams)
    const result = await archiveService.getHistoricalAuditLogs(user, filters)
    return successResponse(result.logs, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
