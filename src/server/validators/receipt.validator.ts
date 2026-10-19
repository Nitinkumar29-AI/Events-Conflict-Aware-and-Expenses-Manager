import { z } from 'zod'

export const ReceiptFileSchema = z.object({
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  fileSizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
})
