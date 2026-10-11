import prisma from '@/server/lib/prisma'
import { SessionUser } from '@/server/types'
import { EventStatus, Prisma } from '@prisma/client'
import {
  assertCanViewArchive,
  assertCanViewAudit,
  canAccessClub,
  canViewAudit,
} from '@/server/policies/rbac.policy'
import { ForbiddenError, NotFoundError } from '@/server/lib/errors'
import {
  ArchiveEventFilterInput,
  ArchiveConflictFilterInput,
  ArchiveAuditLogFilterInput,
} from '@/server/validators/archive.validator'

export class ArchiveService {
  /**
   * Searchable historical event archive query.
   * Distinguishes past events from cancelled, rejected, and soft-deleted events.
   */
  async getHistoricalEvents(user: SessionUser, filters: ArchiveEventFilterInput) {
    let targetClubId = filters.clubId

    // Scoping for CLUB_REP
    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view archive for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewArchive(user, targetClubId)

    const now = new Date()
    const where: Prisma.EventWhereInput = {}

    // Club scoping
    if (targetClubId) {
      where.clubId = targetClubId
    }

    // Text search on title and description
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status
    }

    // Venue filter
    if (filters.venueId) {
      where.venueId = filters.venueId
    }

    // Semester filter
    if (filters.semesterId) {
      where.semesterId = filters.semesterId
    }

    // Event type / category filter
    if (filters.eventType) {
      where.eventType = filters.eventType
    }

    // Submitter filter
    if (filters.submittedByUserId) {
      // Institutional roles can filter by submitter; Club reps can only if it matches their club
      where.submittedByUserId = filters.submittedByUserId
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.startAt = {}
      if (filters.startDate) where.startAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.startAt.lte = new Date(filters.endDate)
    }

    // Historical / Past vs Upcoming filter
    if (filters.isPast === true) {
      where.startAt = {
        ...(typeof where.startAt === 'object' ? where.startAt : {}),
        lt: now,
      }
    } else if (filters.isPast === false) {
      where.startAt = {
        ...(typeof where.startAt === 'object' ? where.startAt : {}),
        gte: now,
      }
    }

    const page = filters.page
    const limit = filters.limit
    const skip = (page - 1) * limit

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: {
          club: { select: { id: true, name: true, code: true } },
          venue: { select: { id: true, name: true, locationCode: true } },
          semester: { select: { id: true, name: true, isLocked: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: { reviewer: { select: { id: true, name: true } } },
          },
          _count: {
            select: {
              conflictsAsA: true,
              conflictsAsB: true,
              expenses: true,
            },
          },
        },
      }),
    ])

    // Enrich events with historical outcome metadata (factually unrecorded vs recorded)
    const enrichedEvents = events.map((event) => {
      const isPast = event.startAt < now
      const isCancelled = event.status === EventStatus.CANCELLED
      const isRejected = event.status === EventStatus.REJECTED
      const isDeleted = event.deletedAt !== null
      const isCompleted = event.status === EventStatus.COMPLETED || (event.status === EventStatus.VERIFIED && isPast)

      return {
        ...event,
        isPast,
        isCancelled,
        isRejected,
        isDeleted,
        isCompleted,
        totalConflicts: event._count.conflictsAsA + event._count.conflictsAsB,
        totalExpenses: event._count.expenses,
        // Recorded facts vs unrecorded metrics
        attendance: {
          expectedAttendees: event.expectedAttendees,
          actualAttendees: null, // Schema does not record actual attendance
          isRecorded: false,
        },
        outcome: {
          isRecorded: false,
          notes: null,
        },
      }
    })

    return {
      events: enrichedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Detailed historical review of an event with reviews, conflicts, expenses,
   * and audit logs where authorized.
   */
  async getHistoricalEventDetails(user: SessionUser, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: true,
        venue: true,
        semester: true,
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, name: true, email: true } } },
        },
        conflictsAsA: {
          include: {
            eventB: { select: { id: true, title: true, clubId: true } },
            resolvedBy: { select: { id: true, name: true } },
          },
        },
        conflictsAsB: {
          include: {
            eventA: { select: { id: true, title: true, clubId: true } },
            resolvedBy: { select: { id: true, name: true } },
          },
        },
        expenses: {
          where: { deletedAt: null },
          include: {
            category: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!event) {
      throw new NotFoundError('Event', eventId)
    }

    // Role-based boundary: CLUB_REP can only inspect events belonging to their club
    if (user.role === 'CLUB_REP' && user.clubId !== event.clubId) {
      throw new ForbiddenError(`Cannot inspect historical event details for club '${event.clubId}'.`)
    }

    if (user.role === 'VIEWER') {
      throw new ForbiddenError('Viewers cannot inspect institutional historical event details.')
    }

    // Audit logs for event (only for SUPER_ADMIN or ACM_CORE)
    let auditHistory: any[] = []
    if (canViewAudit(user)) {
      auditHistory = await prisma.auditLog.findMany({
        where: { targetType: 'Event', targetId: eventId },
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      })
    }

    const now = new Date()
    const allConflicts = [...event.conflictsAsA, ...event.conflictsAsB]

    return {
      event,
      isPast: event.startAt < now,
      allConflicts,
      auditHistory,
      outcomes: {
        expectedAttendees: event.expectedAttendees,
        actualAttendees: null,
        attendanceRecorded: false,
        outcomeNotes: null,
        outcomeRecorded: false,
        recordedFactsNote: 'Attendance and post-event outcomes were not recorded in the system.',
      },
    }
  }

  /**
   * Searchable historical conflict archive query.
   */
  async getHistoricalConflicts(user: SessionUser, filters: ArchiveConflictFilterInput) {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view conflicts for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewArchive(user, targetClubId)

    const where: Prisma.ConflictRecordWhereInput = {}

    // CLUB_REP scoping: must be involved in eventA or eventB
    if (user.role === 'CLUB_REP' && user.clubId) {
      where.OR = [
        { eventA: { clubId: user.clubId } },
        { eventB: { clubId: user.clubId } },
      ]
    } else if (targetClubId) {
      where.OR = [
        { eventA: { clubId: targetClubId } },
        { eventB: { clubId: targetClubId } },
      ]
    }

    if (filters.conflictType) {
      where.conflictType = filters.conflictType
    }

    if (filters.severity) {
      where.severity = filters.severity
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.semesterId) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { eventA: { semesterId: filters.semesterId } },
            { eventB: { semesterId: filters.semesterId } },
          ],
        },
      ]
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    const page = filters.page
    const limit = filters.limit
    const skip = (page - 1) * limit

    const [total, conflicts] = await Promise.all([
      prisma.conflictRecord.count({ where }),
      prisma.conflictRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          eventA: {
            select: {
              id: true,
              title: true,
              clubId: true,
              startAt: true,
              endAt: true,
              status: true,
              club: { select: { id: true, name: true, code: true } },
              venue: { select: { id: true, name: true } },
            },
          },
          eventB: {
            select: {
              id: true,
              title: true,
              clubId: true,
              startAt: true,
              endAt: true,
              status: true,
              club: { select: { id: true, name: true, code: true } },
              venue: { select: { id: true, name: true } },
            },
          },
          resolvedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    return {
      conflicts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Historical Audit Log inspection (strictly for SUPER_ADMIN & ACM_CORE).
   */
  async getHistoricalAuditLogs(user: SessionUser, filters: ArchiveAuditLogFilterInput) {
    assertCanViewAudit(user)

    const where: Prisma.AuditLogWhereInput = {}

    if (filters.targetType) {
      where.targetType = filters.targetType
    }

    if (filters.targetId) {
      where.targetId = filters.targetId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    const page = filters.page
    const limit = filters.limit
    const skip = (page - 1) * limit

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ])

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
}

export const archiveService = new ArchiveService()
