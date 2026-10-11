import { z } from 'zod'

const isoDateSchema = z.string().datetime({ message: 'Must be a valid ISO-8601 UTC timestamp string' }).or(z.date())

export const reportFilterSchema = z.object({
  semesterId: z.string().trim().min(1).optional(),
  clubId: z.string().trim().min(1).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  months: z.coerce.number().int().min(1).max(24).optional(),
})

export type ReportFilterInput = z.infer<typeof reportFilterSchema>

export const exportFilterSchema = z.object({
  type: z.enum(['events', 'conflicts', 'financial']),
  semesterId: z.string().trim().min(1).optional(),
  clubId: z.string().trim().min(1).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  status: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export type ExportFilterInput = z.infer<typeof exportFilterSchema>
