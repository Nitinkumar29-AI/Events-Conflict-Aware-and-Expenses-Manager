import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { successResponse, handleApiError } from '@/server/lib/api-response'
import { archiveService } from '@/server/services/archive.service'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    const result = await archiveService.getHistoricalEventDetails(user, id)
    return successResponse(result, 200)
  } catch (error) {
    return handleApiError(error)
  }
}
