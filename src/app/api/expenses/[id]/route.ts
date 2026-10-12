import { NextRequest } from 'next/server'
import { requireUser } from '@/server/lib/auth'
import { expenseService } from '@/server/services/expense.service'
import { successResponse, validationErrorResponse, handleApiError } from '@/server/lib/api-response'
import { UpdateExpenseSchema } from '@/server/validators/expense.validator'
import { ForbiddenError } from '@/server/lib/errors'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const expense = await expenseService.getExpense(user, id)
    return successResponse(expense)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()

    // Explicit zero-trust payload filtering: Prevent reassigning ownership or club
    if (body.createdByUserId || body.createdById || body.creatorId || body.clubId) {
      throw new ForbiddenError('Forbidden: Cannot reassign expense ownership or club affiliation.')
    }

    const parsed = UpdateExpenseSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.format())

    const expense = await expenseService.updateExpense(user, id, parsed.data)
    return successResponse(expense)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    

    const { id } = await params
    const expense = await expenseService.softDeleteExpense(user, id)
    return successResponse(expense)
  } catch (error) {
    return handleApiError(error)
  }
}
