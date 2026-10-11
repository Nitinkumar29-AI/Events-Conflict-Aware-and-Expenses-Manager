import prisma from '@/server/lib/prisma'
import { SessionUser } from '@/server/types'
import { assertCanViewReports } from '@/server/policies/rbac.policy'
import { ForbiddenError, BusinessRuleError } from '@/server/lib/errors'
import { ExportFilterInput } from '@/server/validators/report.validator'
import { reportService } from './report.service'
import { EventStatus, ExpenseStatus, Prisma } from '@prisma/client'

/**
 * Escapes and sanitizes a cell value for safe CSV output.
 * Prevents CSV / Spreadsheet Formula Injection (OWASP guidance).
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  let str = String(value)

  // Pure numeric values (including negative integers and decimals like -2000.00) are safe numbers, not formulas.
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(str.trim())

  if (!isPureNumber) {
    const trimmed = str.trimStart()
    // Defense against CSV / Spreadsheet formula injection:
    // If the raw or trimmed string starts with formula operators '=', '+', '-', '@', '\t', '\r', prefix with single quote "'"
    if (/^[\=\+\-\@\t\r]/.test(str) || /^[\=\+\-\@\t\r]/.test(trimmed)) {
      str = `'${str}`
    }
  }

  // Standard CSV escaping: if value contains comma, quotes, or newlines, quote the field and double-up quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Converts rows into a CSV string.
 */
export function toCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(sanitizeCsvCell).join(',')
  const dataLines = rows.map((row) => row.map(sanitizeCsvCell).join(','))
  // UTF-8 BOM (\uFEFF) ensures Excel opens Unicode characters correctly
  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`
}

export class ExportService {
  /**
   * Generates authoritative CSV report.
   */
  async exportReport(user: SessionUser, filters: ExportFilterInput): Promise<{ filename: string; csv: string }> {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot export reports for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewReports(user, targetClubId)

    const limit = Math.min(1000, Math.max(1, filters.limit || 500))

    if (filters.type === 'events') {
      const where: Prisma.EventWhereInput = {
        deletedAt: null,
      }
      if (targetClubId) where.clubId = targetClubId
      if (filters.semesterId) where.semesterId = filters.semesterId
      if (filters.status) where.status = filters.status as EventStatus

      if (filters.startDate || filters.endDate) {
        where.startAt = {}
        if (filters.startDate) where.startAt.gte = new Date(filters.startDate)
        if (filters.endDate) where.startAt.lte = new Date(filters.endDate)
      }

      const events = await prisma.event.findMany({
        where,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: {
          club: { select: { name: true, code: true } },
          venue: { select: { name: true, locationCode: true } },
          semester: { select: { name: true } },
          submittedBy: { select: { name: true, email: true } },
        },
      })

      const headers = [
        'Event ID',
        'Title',
        'Status',
        'Event Type',
        'Club',
        'Club Code',
        'Venue',
        'Semester',
        'Start Time (UTC)',
        'End Time (UTC)',
        'Expected Attendees',
        'Actual Attendees (Recorded)',
        'Organizer Name',
        'Organizer Email',
      ]

      const rows = events.map((e) => [
        e.id,
        e.title,
        e.status,
        e.eventType,
        e.club.name,
        e.club.code,
        e.venue.name,
        e.semester.name,
        e.startAt.toISOString(),
        e.endAt.toISOString(),
        e.expectedAttendees,
        'Not Recorded',
        e.submittedBy.name,
        user.role === 'CLUB_REP' && e.clubId !== user.clubId ? '' : e.submittedBy.email,
      ])

      const filename = `events-report-${new Date().toISOString().slice(0, 10)}.csv`
      return { filename, csv: toCsvString(headers, rows) }
    }

    if (filters.type === 'conflicts') {
      const where: Prisma.ConflictRecordWhereInput = {}

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

      if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
      }

      const conflicts = await prisma.conflictRecord.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          eventA: { select: { id: true, title: true, clubId: true, club: { select: { name: true } } } },
          eventB: { select: { id: true, title: true, clubId: true, club: { select: { name: true } } } },
          resolvedBy: { select: { name: true } },
        },
      })

      const headers = [
        'Conflict ID',
        'Conflict Type',
        'Severity',
        'Status',
        'Event A Title',
        'Event A Club',
        'Event B Title',
        'Event B Club',
        'Overlap Minutes',
        'Score',
        'Description',
        'Resolution Status',
        'Resolved By',
        'Created At (UTC)',
      ]

      const rows = conflicts.map((c) => {
        const eventATitle =
          user.role === 'CLUB_REP' && c.eventA.clubId !== user.clubId
            ? '[Confidential - External Club Event]'
            : c.eventA.title
        const eventBTitle =
          user.role === 'CLUB_REP' && c.eventB.clubId !== user.clubId
            ? '[Confidential - External Club Event]'
            : c.eventB.title

        return [
          c.id,
          c.conflictType,
          c.severity,
          c.status,
          eventATitle,
          c.eventA.club.name,
          eventBTitle,
          c.eventB.club.name,
          c.overlapMinutes ?? '',
          c.conflictScore ?? '',
          c.description,
          c.status,
          c.resolvedBy?.name || '',
          c.createdAt.toISOString(),
        ]
      })

      const filename = `conflicts-report-${new Date().toISOString().slice(0, 10)}.csv`
      return { filename, csv: toCsvString(headers, rows) }
    }

    if (filters.type === 'financial') {
      const report = await reportService.getFinancialReport(user, filters)

      const headers = [
        'Semester',
        'Category Name',
        'Club Name',
        'Allocated Amount',
        'Approved Spent Amount',
        'Remaining Amount',
        'Utilization (%)',
        'Overspent',
      ]

      const rows = report.categoryBreakdown.map((cat) => [
        report.semester.name,
        cat.categoryName,
        cat.clubName || 'Institutional / General',
        cat.allocatedAmount,
        cat.spentAmount,
        cat.remainingAmount,
        cat.utilizationPercentage !== null && cat.utilizationPercentage !== undefined
          ? `${cat.utilizationPercentage}%`
          : 'N/A (Unallocated)',
        cat.overspent ? 'YES' : 'NO',
      ])

      const filename = `financial-report-${report.semester.name.toLowerCase().replace(/\s+/g, '-')}.csv`
      return { filename, csv: toCsvString(headers, rows) }
    }

    throw new BusinessRuleError(`Unsupported export type: ${filters.type}`)
  }
}

export const exportService = new ExportService()
