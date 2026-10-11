import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { successResponse, handleApiError } from '@/server/lib/api-response'
import { reportService } from '@/server/services/report.service'
import { reportFilterSchema } from '@/server/validators/report.validator'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = reportFilterSchema.parse(searchParams)
    const report = await reportService.getEventReport(user, filters)
    return successResponse(report, 200)
  } catch (error) {
    return handleApiError(error)
  }
}
