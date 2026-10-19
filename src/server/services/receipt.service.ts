import { createHash, randomUUID } from 'node:crypto'
import { AuditAction } from '@prisma/client'
import prisma from '@/server/lib/prisma'
import { SessionUser } from '@/server/types'
import { canManageExpense, assertCanAccessClub } from '@/server/policies/rbac.policy'
import { AppError, ForbiddenError, NotFoundError, BusinessRuleError, SemesterLockedError } from '@/server/lib/errors'
import { ReceiptFileSchema } from '@/server/validators/receipt.validator'
import { env } from '@/server/config/env'

const CLOUDINARY_FOLDER = 'acm-incursion/receipts'

function isCloudinaryUploadResult(
  value: unknown
): value is { secure_url: string; public_id: string; bytes: number; resource_type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'secure_url' in value &&
    typeof value.secure_url === 'string' &&
    'public_id' in value &&
    typeof value.public_id === 'string' &&
    'bytes' in value &&
    typeof value.bytes === 'number' &&
    'resource_type' in value &&
    typeof value.resource_type === 'string'
  )
}

export class ReceiptService {
  async uploadReceipt(user: SessionUser, expenseId: string, file: File) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null },
      include: { semester: true },
    })

    if (!expense) throw new NotFoundError('Expense', expenseId)

    // Zero-trust creator check: Only the expense creator can upload receipts
    if (expense.createdByUserId !== user.id) {
      throw new ForbiddenError('Forbidden: Only the expense creator can upload receipts to this expense.')
    }

    if (!canManageExpense(user, expense)) {
      throw new ForbiddenError(`Cannot add receipt to expense for club '${expense.clubId}'`)
    }
    if (expense.semester.isLocked) {
      throw new SemesterLockedError(expense.semester.name)
    }

    const fileValidation = ReceiptFileSchema.safeParse({
      mimeType: file.type,
      fileSizeBytes: file.size,
    })
    if (!fileValidation.success) {
      throw new BusinessRuleError('Receipt must be a JPEG, PNG, or PDF file no larger than 5 MB.')
    }

    const fileBytes = Buffer.from(await file.arrayBuffer())
    if (!this.hasValidFileSignature(fileBytes, file.type)) {
      throw new BusinessRuleError('The uploaded file content does not match its declared format.')
    }

    const sha256 = createHash('sha256').update(fileBytes).digest('hex')
    const existing = await prisma.receipt.findFirst({
      where: { sha256, deletedAt: null }
    })
    if (existing) {
      throw new BusinessRuleError('A receipt with the exact same content (SHA-256) already exists in the system.')
    }

    const { CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret, CLOUDINARY_CLOUD_NAME: cloudName } = env
    if (!apiKey || !apiSecret || !cloudName) {
      throw new AppError(
        'STORAGE_NOT_CONFIGURED',
        'Receipt storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
        503
      )
    }

    const publicId = randomUUID()
    const timestamp = Math.floor(Date.now() / 1000)
    const signatureParams = `folder=${CLOUDINARY_FOLDER}&public_id=${publicId}&timestamp=${timestamp}`
    const signature = createHash('sha1').update(`${signatureParams}${apiSecret}`).digest('hex')
    const uploadBody = new FormData()
    uploadBody.set('file', new Blob([fileBytes], { type: file.type }), file.name)
    uploadBody.set('api_key', apiKey)
    uploadBody.set('timestamp', String(timestamp))
    uploadBody.set('folder', CLOUDINARY_FOLDER)
    uploadBody.set('public_id', publicId)
    uploadBody.set('signature', signature)

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
      { method: 'POST', body: uploadBody }
    )
    const uploadResult: unknown = await uploadResponse.json().catch(() => null)
    if (!uploadResponse.ok) {
      throw new AppError(
        'STORAGE_UPLOAD_FAILED',
        'Cloudinary could not store the receipt. Please try again.',
        uploadResponse.status >= 500 ? 503 : 502
      )
    }

    if (
      !isCloudinaryUploadResult(uploadResult) ||
      uploadResult.bytes !== file.size ||
      !['image', 'raw'].includes(uploadResult.resource_type)
    ) {
      throw new AppError('STORAGE_INVALID_RESPONSE', 'Cloudinary returned invalid receipt metadata.', 502)
    }

    let fileUrl: URL
    try {
      fileUrl = new URL(uploadResult.secure_url)
    } catch {
      throw new AppError('STORAGE_INVALID_RESPONSE', 'Cloudinary returned invalid receipt metadata.', 502)
    }
    if (
      fileUrl.protocol !== 'https:' ||
      !fileUrl.hostname.endsWith('.cloudinary.com') ||
      (uploadResult.public_id !== publicId &&
        uploadResult.public_id !== `${CLOUDINARY_FOLDER}/${publicId}`)
    ) {
      throw new AppError('STORAGE_INVALID_RESPONSE', 'Cloudinary returned invalid receipt metadata.', 502)
    }

    const fileName = file.name.replace(/[\\/\0]/g, '_').slice(0, 255)
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          expenseId,
          fileUrl: uploadResult.secure_url,
          storagePublicId: uploadResult.public_id,
          fileName,
          mimeType: file.type,
          fileSizeBytes: file.size,
          sha256,
          uploadedByUserId: user.id,
        }
      })

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.EXPENSE_UPDATE,
          targetType: 'Expense',
          targetId: expenseId,
          metadata: { note: `Receipt added: ${receipt.id}` }
        }
      })

      return receipt
    })
  }

  private hasValidFileSignature(bytes: Buffer, mimeType: string) {
    if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-'
    if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }

  async getReceipts(user: SessionUser, expenseId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null }
    })

    if (!expense) throw new NotFoundError('Expense', expenseId)
    
    // RBAC: If not super/core, must have club access
    assertCanAccessClub(user, expense.clubId)

    return await prisma.receipt.findMany({
      where: { expenseId, deletedAt: null },
      orderBy: { createdAt: 'asc' }
    })
  }
}

export const receiptService = new ReceiptService()
