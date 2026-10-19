import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { receiptService } from '@/server/services/receipt.service'
import { successResponse, validationErrorResponse, handleApiError } from '@/server/lib/api-response'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()

    const { id } = await params
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return validationErrorResponse({ file: { _errors: ['Upload a receipt file using multipart/form-data.'] } })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return validationErrorResponse({ file: { _errors: ['A receipt file is required.'] } })
    }

    const receipt = await receiptService.uploadReceipt(user, id, file)
    return successResponse(receipt, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()

    const { id } = await params
    const receipts = await receiptService.getReceipts(user, id)
    return successResponse(receipts)
  } catch (error) {
    return handleApiError(error)
  }
}
