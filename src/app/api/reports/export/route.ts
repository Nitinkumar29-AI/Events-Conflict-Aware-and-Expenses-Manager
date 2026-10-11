import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { handleApiError } from '@/server/lib/api-response'
import { exportService } from '@/server/services/export.service'
import { exportFilterSchema } from '@/server/validators/report.validator'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = exportFilterSchema.parse(searchParams)
    const { filename, csv } = await exportService.exportReport(user, filters)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
