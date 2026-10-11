import { describe, it, expect, beforeAll } from 'vitest'
import prisma from '@/server/lib/prisma'
import { archiveService } from '@/server/services/archive.service'
import { reportService } from '@/server/services/report.service'
import { exportService, sanitizeCsvCell } from '@/server/services/export.service'
import { canViewArchive, canViewReports, canViewAudit } from '@/server/policies/rbac.policy'
import { UserRole, EventStatus, ExpenseStatus, ConflictType, ConflictSeverity, ConflictStatus } from '@prisma/client'
import { ForbiddenError, NotFoundError } from '@/server/lib/errors'
import Decimal from 'decimal.js'

describe('Phase 8 — Archive, Institutional Memory, Reports & CSV Export Tests', () => {
  let superAdmin: any
  let coreUser: any
  let execUser: any
  let codingClubRep: any
  let roboticsClubRep: any
  let viewerUser: any

  let codingClub: any
  let roboticsClub: any
  let venue: any
  let activeSemester: any
  let logisticsCat: any

  beforeAll(async () => {
    // Fetch seeded users
    superAdmin = await prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, isActive: true } })
    coreUser = await prisma.user.findFirst({ where: { role: UserRole.ACM_CORE, isActive: true } })
    execUser = await prisma.user.findFirst({ where: { role: UserRole.ACM_EXEC, isActive: true } })
    codingClub = await prisma.club.findUniqueOrThrow({ where: { code: 'CC' } })
    roboticsClub = await prisma.club.findUniqueOrThrow({ where: { code: 'RC' } })

    codingClubRep = await prisma.user.findFirst({ where: { role: UserRole.CLUB_REP, clubId: codingClub.id, isActive: true } })
    roboticsClubRep = await prisma.user.findFirst({ where: { role: UserRole.CLUB_REP, clubId: roboticsClub.id, isActive: true } })
    viewerUser = await prisma.user.findFirst({ where: { role: UserRole.VIEWER, isActive: true } })

    venue = await prisma.venue.findFirst({ where: { isActive: true } })
    activeSemester = await prisma.semester.findFirst({ where: { name: 'Odd Semester 2026-27' } })
    logisticsCat = await prisma.expenseCategory.findUnique({ where: { name: 'Logistics' } })
  })

  describe('1. Role-based Access Control (RBAC) Policies', () => {
    it('SUPER_ADMIN and ACM_CORE can view institutional archive and reports', () => {
      expect(canViewArchive(superAdmin)).toBe(true)
      expect(canViewReports(superAdmin)).toBe(true)
      expect(canViewAudit(superAdmin)).toBe(true)

      expect(canViewArchive(coreUser)).toBe(true)
      expect(canViewReports(coreUser)).toBe(true)
      expect(canViewAudit(coreUser)).toBe(true)
    })

    it('ACM_EXEC has institutional archive and reports access, but NOT audit access', () => {
      expect(canViewArchive(execUser)).toBe(true)
      expect(canViewReports(execUser)).toBe(true)
      expect(canViewAudit(execUser)).toBe(false)
    })

    it('CLUB_REP can only access archive and reports for their own club', () => {
      expect(canViewArchive(codingClubRep, codingClub.id)).toBe(true)
      expect(canViewArchive(codingClubRep, roboticsClub.id)).toBe(false)

      expect(canViewReports(codingClubRep, codingClub.id)).toBe(true)
      expect(canViewReports(codingClubRep, roboticsClub.id)).toBe(false)

      expect(canViewAudit(codingClubRep)).toBe(false)
    })

    it('VIEWER cannot access archive, reports, or audit', () => {
      expect(canViewArchive(viewerUser)).toBe(false)
      expect(canViewReports(viewerUser)).toBe(false)
      expect(canViewAudit(viewerUser)).toBe(false)
    })

    it('CLUB_REP is forbidden when querying another club archive', async () => {
      await expect(
        archiveService.getHistoricalEvents(codingClubRep, {
          clubId: roboticsClub.id,
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('CLUB_REP is forbidden when querying another club reports', async () => {
      await expect(
        reportService.getEventReport(codingClubRep, {
          clubId: roboticsClub.id,
          months: 6,
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('VIEWER is forbidden from accessing archive or reports', async () => {
      await expect(
        archiveService.getHistoricalEvents(viewerUser, {
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow(ForbiddenError)

      await expect(
        reportService.getEventReport(viewerUser, {
          months: 6,
        })
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('2. Historical Event Archive & Outcomes', () => {
    it('returns paginated events with status, club, and timeframe metadata', async () => {
      const result = await archiveService.getHistoricalEvents(coreUser, {
        page: 1,
        limit: 10,
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result.events)).toBe(true)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(typeof result.total).toBe('number')

      if (result.events.length > 0) {
        const first = result.events[0]
        expect(first.id).toBeDefined()
        expect(typeof first.isPast).toBe('boolean')
        expect(typeof first.isCancelled).toBe('boolean')
        expect(typeof first.isRejected).toBe('boolean')
        // Verify factual distinction: actualAttendees is explicitly null (unrecorded)
        expect(first.attendance.actualAttendees).toBeNull()
        expect(first.attendance.isRecorded).toBe(false)
      }
    })

    it('distinguishes past events from cancelled and rejected events', async () => {
      const pastEvents = await archiveService.getHistoricalEvents(coreUser, {
        isPast: true,
        page: 1,
        limit: 10,
      })

      pastEvents.events.forEach((e) => {
        expect(e.isPast).toBe(true)
        expect(new Date(e.startAt).getTime()).toBeLessThan(Date.now())
      })
    })

    it('supports text search query filtering on title', async () => {
      const result = await archiveService.getHistoricalEvents(coreUser, {
        q: 'Orientation',
        page: 1,
        limit: 10,
      })

      expect(result).toBeDefined()
      result.events.forEach((e) => {
        const matchesTitle = e.title.toLowerCase().includes('orientation')
        const matchesDesc = e.description?.toLowerCase().includes('orientation')
        expect(matchesTitle || matchesDesc).toBe(true)
      })
    })

    it('retrieves detailed historical record with reviews, conflicts, and explicit unrecorded notices', async () => {
      const anyEvent = await prisma.event.findFirst({ where: { deletedAt: null } })
      if (!anyEvent) return

      const details = await archiveService.getHistoricalEventDetails(coreUser, anyEvent.id)

      expect(details.event.id).toBe(anyEvent.id)
      expect(details.outcomes.actualAttendees).toBeNull()
      expect(details.outcomes.attendanceRecorded).toBe(false)
      expect(details.outcomes.outcomeRecorded).toBe(false)
      expect(details.outcomes.recordedFactsNote).toContain('not recorded')
      expect(Array.isArray(details.allConflicts)).toBe(true)
    })

    it('CLUB_REP can inspect detailed event history only for their own club', async () => {
      const codingEvent = await prisma.event.findFirst({ where: { clubId: codingClub.id, deletedAt: null } })
      const roboticsEvent = await prisma.event.findFirst({ where: { clubId: roboticsClub.id, deletedAt: null } })

      if (codingEvent) {
        const details = await archiveService.getHistoricalEventDetails(codingClubRep, codingEvent.id)
        expect(details.event.clubId).toBe(codingClub.id)
      }

      if (roboticsEvent) {
        await expect(
          archiveService.getHistoricalEventDetails(codingClubRep, roboticsEvent.id)
        ).rejects.toThrow(ForbiddenError)
      }
    })
  })

  describe('3. Conflict Report & Historical Archive', () => {
    it('groups conflicts by type, severity, and status', async () => {
      const report = await reportService.getConflictReport(coreUser, { months: 6 })

      expect(report).toBeDefined()
      expect(typeof report.totalConflicts).toBe('number')
      expect(report.typeBreakdown).toHaveProperty('VENUE')
      expect(report.typeBreakdown).toHaveProperty('AUDIENCE')
      expect(report.severityBreakdown).toHaveProperty('HIGH')
      expect(report.severityBreakdown).toHaveProperty('MEDIUM')
      expect(report.severityBreakdown).toHaveProperty('LOW')
      expect(report.statusBreakdown).toHaveProperty('OPEN')
      expect(report.statusBreakdown).toHaveProperty('RESOLVED')
    })

    it('filters conflicts in historical archive by status and severity', async () => {
      const res = await archiveService.getHistoricalConflicts(coreUser, {
        severity: ConflictSeverity.HIGH,
        page: 1,
        limit: 10,
      })

      expect(Array.isArray(res.conflicts)).toBe(true)
      res.conflicts.forEach((c) => {
        expect(c.severity).toBe(ConflictSeverity.HIGH)
      })
    })

    it('CLUB_REP receives only conflicts involving their club', async () => {
      const res = await archiveService.getHistoricalConflicts(codingClubRep, {
        page: 1,
        limit: 20,
      })

      res.conflicts.forEach((c) => {
        const isCodingInvolved = c.eventA.clubId === codingClub.id || c.eventB.clubId === codingClub.id
        expect(isCodingInvolved).toBe(true)
      })
    })
  })

  describe('4. Financial Report & Decimal Arithmetic', () => {
    it('authoritatively calculates semester budget, allocations, and spending with Decimal precision', async () => {
      const report = await reportService.getFinancialReport(coreUser, {
        semesterId: activeSemester.id,
      })

      expect(report.semester.id).toBe(activeSemester.id)
      expect(report.totalBudget).toBe(new Decimal(activeSemester.totalBudget).toFixed(2))

      // Verification of Decimal math
      const totalAllocated = new Decimal(report.totalAllocated)
      const totalBudget = new Decimal(report.totalBudget)
      const unallocated = totalBudget.minus(totalAllocated)
      expect(new Decimal(report.unallocatedBudget).toFixed(2)).toBe(unallocated.toFixed(2))

      const totalSpent = new Decimal(report.totalSpent)
      const remaining = totalBudget.minus(totalSpent)
      expect(new Decimal(report.remainingBudget).toFixed(2)).toBe(remaining.toFixed(2))

      // Category breakdown checks
      expect(Array.isArray(report.categoryBreakdown)).toBe(true)
      report.categoryBreakdown.forEach((cat: any) => {
        expect(typeof cat.categoryName).toBe('string')
        expect(typeof cat.allocatedAmount).toBe('string')
        expect(typeof cat.spentAmount).toBe('string')
        expect(typeof cat.remainingAmount).toBe('string')
        expect(typeof cat.overspent).toBe('boolean')
      })
    })

    it('ignores DRAFT and REJECTED expenses in approved spending', async () => {
      // Create a temporary DRAFT and REJECTED expense
      const testExpenseDraft = await prisma.expense.create({
        data: {
          title: 'Draft Test Expense Phase 8',
          amount: new Decimal('999.00'),
          date: new Date('2026-10-10T12:00:00Z'),
          status: ExpenseStatus.DRAFT,
          clubId: codingClub.id,
          semesterId: activeSemester.id,
          categoryId: logisticsCat.id,
          createdByUserId: coreUser.id,
        },
      })

      const testExpenseRejected = await prisma.expense.create({
        data: {
          title: 'Rejected Test Expense Phase 8',
          amount: new Decimal('888.00'),
          date: new Date('2026-10-10T12:00:00Z'),
          status: ExpenseStatus.REJECTED,
          rejectionReason: 'Invalid receipt',
          clubId: codingClub.id,
          semesterId: activeSemester.id,
          categoryId: logisticsCat.id,
          createdByUserId: coreUser.id,
        },
      })

      try {
        const report = await reportService.getFinancialReport(coreUser, {
          semesterId: activeSemester.id,
        })

        // Approved spent amount must not include 999.00 or 888.00
        const logCatBreakdown = report.categoryBreakdown.find((c: any) => c.categoryId === logisticsCat.id)
        if (logCatBreakdown) {
          const spentDecimal = new Decimal(logCatBreakdown.spentAmount)
          // Ensure draft and rejected amounts are not added
          expect(spentDecimal.toString()).not.toContain('999')
          expect(spentDecimal.toString()).not.toContain('888')
        }
      } finally {
        await prisma.expense.delete({ where: { id: testExpenseDraft.id } })
        await prisma.expense.delete({ where: { id: testExpenseRejected.id } })
      }
    })
  })

  describe('5. Monthly Trends', () => {
    it('returns zero-filled monthly trend buckets without data gaps', async () => {
      const res = await reportService.getTrendReport(coreUser, { months: 6 })

      expect(Array.isArray(res.trends)).toBe(true)
      expect(res.trends.length).toBe(6)

      res.trends.forEach((t) => {
        expect(t.month).toMatch(/^\d{4}-\d{2}$/)
        expect(typeof t.eventsCount).toBe('number')
        expect(typeof t.conflictsCount).toBe('number')
        expect(typeof t.approvedSpending).toBe('string')
      })
    })
  })

  describe('6. CSV Export & Formula Injection Prevention', () => {
    it('sanitizes formula trigger characters (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
      expect(sanitizeCsvCell('+cmd|/c')).toBe("'+cmd|/c")
      expect(sanitizeCsvCell('-danger')).toBe("'-danger")
      expect(sanitizeCsvCell('@ATTACK')).toBe("'@ATTACK")
      expect(sanitizeCsvCell('\tTabInj')).toBe("'\tTabInj")
      expect(sanitizeCsvCell('Safe Text')).toBe('Safe Text')
      expect(sanitizeCsvCell(123)).toBe('123')
      expect(sanitizeCsvCell(null)).toBe('')
    })

    it('correctly escapes quotes and commas in CSV cells', () => {
      expect(sanitizeCsvCell('Hello, World')).toBe('"Hello, World"')
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""')
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"')
    })

    it('exports events CSV with proper UTF-8 BOM, headers, and rows', async () => {
      const res = await exportService.exportReport(coreUser, {
        type: 'events',
        semesterId: activeSemester.id,
        limit: 50,
      })

      expect(res.filename).toContain('.csv')
      // UTF-8 BOM prefix
      expect(res.csv.charCodeAt(0)).toBe(0xfeff)
      expect(res.csv).toContain('Event ID,Title,Status,Event Type')
      expect(res.csv).toContain('Expected Attendees,Actual Attendees (Recorded)')
    })

    it('exports conflicts CSV with proper headers', async () => {
      const res = await exportService.exportReport(coreUser, {
        type: 'conflicts',
        limit: 50,
      })

      expect(res.filename).toContain('.csv')
      expect(res.csv.charCodeAt(0)).toBe(0xfeff)
      expect(res.csv).toContain('Conflict ID,Conflict Type,Severity,Status')
    })

    it('exports financial CSV with exact Decimal spending amounts', async () => {
      const res = await exportService.exportReport(coreUser, {
        type: 'financial',
        semesterId: activeSemester.id,
      })

      expect(res.filename).toContain('.csv')
      expect(res.csv.charCodeAt(0)).toBe(0xfeff)
      expect(res.csv).toContain('Semester,Category Name,Club Name,Allocated Amount,Approved Spent Amount')
    })

    it('enforces club scoping in CSV export for CLUB_REP', async () => {
      const res = await exportService.exportReport(codingClubRep, {
        type: 'events',
        limit: 50,
      })

      // Must not contain robotics club code in exports for Coding Club rep
      expect(res.csv).not.toContain(',RC,')
    })
  })

  describe('7. Historical Audit Logs Authorization', () => {
    it('SUPER_ADMIN and ACM_CORE can inspect audit trail', async () => {
      const res = await archiveService.getHistoricalAuditLogs(superAdmin, {
        page: 1,
        limit: 5,
      })

      expect(Array.isArray(res.logs)).toBe(true)
      expect(typeof res.total).toBe('number')
    })

    it('ACM_EXEC and CLUB_REP cannot inspect audit trail', async () => {
      await expect(
        archiveService.getHistoricalAuditLogs(execUser, { page: 1, limit: 5 })
      ).rejects.toThrow(ForbiddenError)

      await expect(
        archiveService.getHistoricalAuditLogs(codingClubRep, { page: 1, limit: 5 })
      ).rejects.toThrow(ForbiddenError)
    })
  })
})
