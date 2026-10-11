import { z } from 'zod'
import { EventStatus, EventType, ConflictType, ConflictSeverity, ConflictStatus, AuditAction } from '@prisma/client'

const isoDateSchema = z.string().datetime({ message: 'Must be a valid ISO-8601 UTC timestamp string' }).or(z.date())

export const archiveEventFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  clubId: z.string().trim().min(1).optional(),
  venueId: z.string().trim().min(1).optional(),
  semesterId: z.string().trim().min(1).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  isPast: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  submittedByUserId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ArchiveEventFilterInput = z.infer<typeof archiveEventFilterSchema>

export const archiveConflictFilterSchema = z.object({
  conflictType: z.nativeEnum(ConflictType).optional(),
  severity: z.nativeEnum(ConflictSeverity).optional(),
  status: z.nativeEnum(ConflictStatus).optional(),
  semesterId: z.string().trim().min(1).optional(),
  clubId: z.string().trim().min(1).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ArchiveConflictFilterInput = z.infer<typeof archiveConflictFilterSchema>

export const archiveAuditLogFilterSchema = z.object({
  targetType: z.string().trim().min(1).max(50).optional(),
  targetId: z.string().trim().min(1).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  actorUserId: z.string().trim().min(1).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ArchiveAuditLogFilterInput = z.infer<typeof archiveAuditLogFilterSchema>
