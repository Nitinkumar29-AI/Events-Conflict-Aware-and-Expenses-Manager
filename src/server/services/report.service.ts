import prisma from '@/server/lib/prisma'
import { SessionUser } from '@/server/types'
import { EventStatus, ExpenseStatus, Prisma, ConflictType, ConflictSeverity, ConflictStatus } from '@prisma/client'
import { assertCanViewReports, can } from '@/server/policies/rbac.policy'
import { ForbiddenError, NotFoundError } from '@/server/lib/errors'
import { ReportFilterInput } from '@/server/validators/report.validator'
import Decimal from 'decimal.js'

export class ReportService {
  /**
   * Event analytics and summary report.
   */
  async getEventReport(user: SessionUser, filters: ReportFilterInput) {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view reports for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewReports(user, targetClubId)

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
    }

    if (targetClubId) {
      where.clubId = targetClubId
    }

    if (filters.semesterId) {
      where.semesterId = filters.semesterId
    }

    if (filters.startDate || filters.endDate) {
      where.startAt = {}
      if (filters.startDate) where.startAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.startAt.lte = new Date(filters.endDate)
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, code: true } },
        venue: { select: { id: true, name: true } },
      },
      orderBy: { startAt: 'asc' },
    })

    const totalEvents = events.length

    // Grouping by Event Status
    const statusCounts: Record<EventStatus, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      VERIFIED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    }

    // Grouping by Club
    const clubMap: Record<string, { clubId: string; clubName: string; clubCode: string; count: number }> = {}

    // Grouping by Event Type (Category)
    const categoryMap: Record<string, number> = {}

    // Grouping by Venue
    const venueMap: Record<string, { venueId: string; venueName: string; count: number }> = {}

    let totalExpectedAttendees = 0

    events.forEach((event) => {
      // Status
      statusCounts[event.status] = (statusCounts[event.status] || 0) + 1

      // Club
      if (!clubMap[event.clubId]) {
        clubMap[event.clubId] = {
          clubId: event.clubId,
          clubName: event.club.name,
          clubCode: event.club.code,
          count: 0,
        }
      }
      clubMap[event.clubId].count++

      // Category / Type
      categoryMap[event.eventType] = (categoryMap[event.eventType] || 0) + 1

      // Venue
      if (!venueMap[event.venueId]) {
        venueMap[event.venueId] = {
          venueId: event.venueId,
          venueName: event.venue.name,
          count: 0,
        }
      }
      venueMap[event.venueId].count++

      // Attendance
      totalExpectedAttendees += event.expectedAttendees || 0
    })

    return {
      totalEvents,
      statusBreakdown: statusCounts,
      clubBreakdown: Object.values(clubMap).sort((a, b) => b.count - a.count),
      categoryBreakdown: Object.entries(categoryMap)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count),
      venueBreakdown: Object.values(venueMap).sort((a, b) => b.count - a.count),
      attendance: {
        totalExpectedAttendees,
        actualAttendees: null,
        isRecorded: false,
        note: 'Actual attendance was not recorded in the database.',
      },
    }
  }

  /**
   * Conflict analytics and resolution report.
   */
  async getConflictReport(user: SessionUser, filters: ReportFilterInput) {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view reports for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewReports(user, targetClubId)

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

    const conflicts = await prisma.conflictRecord.findMany({
      where,
      include: {
        eventA: { select: { id: true, title: true, clubId: true } },
        eventB: { select: { id: true, title: true, clubId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalConflicts = conflicts.length

    // By Conflict Type
    const typeBreakdown: Record<ConflictType, number> = {
      VENUE: 0,
      ORGANIZER: 0,
      AUDIENCE: 0,
      TIGHT_TURNAROUND: 0,
    }

    // By Severity
    const severityBreakdown: Record<ConflictSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    }

    // By Status
    const statusBreakdown: Record<ConflictStatus, number> = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
      OVERRIDDEN: 0,
    }

    let totalScore = 0
    let scoredCount = 0

    conflicts.forEach((c) => {
      typeBreakdown[c.conflictType] = (typeBreakdown[c.conflictType] || 0) + 1
      severityBreakdown[c.severity] = (severityBreakdown[c.severity] || 0) + 1
      statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1

      if (c.conflictScore !== null && c.conflictScore !== undefined) {
        totalScore += c.conflictScore
        scoredCount++
      }
    })

    const averageConflictScore = scoredCount > 0 ? parseFloat((totalScore / scoredCount).toFixed(1)) : null

    return {
      totalConflicts,
      typeBreakdown,
      severityBreakdown,
      statusBreakdown,
      averageConflictScore,
      note: 'Conflict resolution state represents recorded audit facts. Concluded events are not automatically resolved.',
    }
  }

  /**
   * Financial analytics and budget utilization report.
   * Enforces authoritative Decimal arithmetic and respects role access.
   */
  async getFinancialReport(user: SessionUser, filters: ReportFilterInput) {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view financial reports for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewReports(user, targetClubId)

    // Resolve semester
    let semesterId = filters.semesterId
    if (!semesterId) {
      const activeSem = await prisma.semester.findFirst({
        where: { isLocked: false },
        orderBy: { startDate: 'desc' },
      })
      if (activeSem) {
        semesterId = activeSem.id
      } else {
        const latestSem = await prisma.semester.findFirst({
          orderBy: { startDate: 'desc' },
        })
        if (!latestSem) throw new NotFoundError('Semester not found')
        semesterId = latestSem.id
      }
    }

    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
    })

    if (!semester) {
      throw new NotFoundError('Semester', semesterId)
    }

    // Fetch allocations
    const allocationWhere: Prisma.BudgetAllocationWhereInput = {
      semesterId,
    }
    if (targetClubId) {
      allocationWhere.clubId = targetClubId
    }

    const allocations = await prisma.budgetAllocation.findMany({
      where: allocationWhere,
      include: { category: true, club: true },
    })

    // Fetch approved expenses (authoritative spending rule)
    const expenseWhere: Prisma.ExpenseWhereInput = {
      semesterId,
      status: ExpenseStatus.APPROVED,
      deletedAt: null,
    }
    if (targetClubId) {
      expenseWhere.clubId = targetClubId
    }
    if (filters.startDate || filters.endDate) {
      expenseWhere.date = {}
      if (filters.startDate) expenseWhere.date.gte = new Date(filters.startDate)
      if (filters.endDate) expenseWhere.date.lte = new Date(filters.endDate)
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: { category: true, club: true },
    })

    // Calculate totals using Decimal arithmetic
    let totalAllocated = new Decimal(0)
    allocations.forEach((a) => {
      totalAllocated = totalAllocated.plus(a.allocatedAmount)
    })

    let totalSpent = new Decimal(0)
    const spentByCategory: Record<string, { categoryId: string; categoryName: string; amount: Decimal }> = {}
    const spentByClub: Record<string, { clubId: string; clubName: string; amount: Decimal }> = {}

    expenses.forEach((e) => {
      const amt = new Decimal(e.amount)
      totalSpent = totalSpent.plus(amt)

      // Category aggregation
      if (!spentByCategory[e.categoryId]) {
        spentByCategory[e.categoryId] = {
          categoryId: e.categoryId,
          categoryName: e.category.name,
          amount: new Decimal(0),
        }
      }
      spentByCategory[e.categoryId].amount = spentByCategory[e.categoryId].amount.plus(amt)

      // Club aggregation
      if (!spentByClub[e.clubId]) {
        spentByClub[e.clubId] = {
          clubId: e.clubId,
          clubName: e.club.name,
          amount: new Decimal(0),
        }
      }
      spentByClub[e.clubId].amount = spentByClub[e.clubId].amount.plus(amt)
    })

    const totalSemesterBudget = new Decimal(semester.totalBudget)
    const unallocatedBudget = totalSemesterBudget.minus(totalAllocated)

    // For CLUB_REP: institutional campus-wide totals are confidential
    const isClubRep = user.role === 'CLUB_REP'
    const remainingBudget = isClubRep
      ? totalAllocated.minus(totalSpent)
      : totalSemesterBudget.minus(totalSpent)
    const semesterOverspent = remainingBudget.isNegative()

    // Build category breakdown
    const categoryBreakdown = allocations.map((a) => {
      const spentInfo = spentByCategory[a.categoryId]
      const spent = spentInfo ? spentInfo.amount : new Decimal(0)
      const allocated = new Decimal(a.allocatedAmount)
      const remaining = allocated.minus(spent)
      const overspent = remaining.isNegative()
      const isUnallocated = allocated.isZero()
      const utilizationPercentage = isUnallocated
        ? null
        : parseFloat(spent.dividedBy(allocated).times(100).toFixed(2))

      delete spentByCategory[a.categoryId]

      return {
        id: a.id,
        categoryId: a.categoryId,
        categoryName: a.category.name,
        clubId: a.clubId,
        clubName: a.club?.name || null,
        allocatedAmount: allocated.toFixed(2),
        spentAmount: spent.toFixed(2),
        remainingAmount: remaining.toFixed(2),
        utilizationPercentage,
        isUnallocated,
        overspent,
      }
    })

    // Unallocated categories with expenditure
    for (const [catId, spentObj] of Object.entries(spentByCategory)) {
      categoryBreakdown.push({
        id: `unallocated-${catId}`,
        categoryId: catId,
        categoryName: spentObj.categoryName,
        clubId: targetClubId || null,
        clubName: null,
        allocatedAmount: '0.00',
        spentAmount: spentObj.amount.toFixed(2),
        remainingAmount: spentObj.amount.negated().toFixed(2),
        utilizationPercentage: null,
        isUnallocated: true,
        overspent: true,
      })
    }

    return {
      semester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
        isLocked: semester.isLocked,
      },
      totalBudget: isClubRep ? null : totalSemesterBudget.toFixed(2),
      totalAllocated: totalAllocated.toFixed(2),
      unallocatedBudget: isClubRep ? null : unallocatedBudget.toFixed(2),
      totalSpent: totalSpent.toFixed(2),
      remainingBudget: remainingBudget.toFixed(2),
      semesterOverspent,
      categoryBreakdown,
      clubSpendingBreakdown: Object.values(spentByClub).map((c) => ({
        clubId: c.clubId,
        clubName: c.clubName,
        spentAmount: c.amount.toFixed(2),
      })),
    }
  }

  /**
   * Monthly trend comparisons across events, conflicts, and expenses.
   */
  async getTrendReport(user: SessionUser, filters: ReportFilterInput) {
    let targetClubId = filters.clubId

    if (user.role === 'CLUB_REP') {
      if (filters.clubId && filters.clubId !== user.clubId) {
        throw new ForbiddenError('Cannot view reports for another club.')
      }
      targetClubId = user.clubId || undefined
    }

    assertCanViewReports(user, targetClubId)

    const numMonths = Math.min(24, Math.max(1, filters.months || 6))
    const now = new Date()

    // Generate monthly buckets (e.g. YYYY-MM)
    const monthKeys: string[] = []
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      monthKeys.push(key)
    }

    const startBoundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (numMonths - 1), 1))

    // Query events
    const eventWhere: Prisma.EventWhereInput = {
      deletedAt: null,
      startAt: { gte: startBoundary },
    }
    if (targetClubId) eventWhere.clubId = targetClubId

    // Query conflicts
    const conflictWhere: Prisma.ConflictRecordWhereInput = {
      createdAt: { gte: startBoundary },
    }
    if (user.role === 'CLUB_REP' && user.clubId) {
      conflictWhere.OR = [
        { eventA: { clubId: user.clubId } },
        { eventB: { clubId: user.clubId } },
      ]
    } else if (targetClubId) {
      conflictWhere.OR = [
        { eventA: { clubId: targetClubId } },
        { eventB: { clubId: targetClubId } },
      ]
    }

    // Query approved expenses
    const expenseWhere: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      status: ExpenseStatus.APPROVED,
      date: { gte: startBoundary },
    }
    if (targetClubId) expenseWhere.clubId = targetClubId

    const [events, conflicts, expenses] = await Promise.all([
      prisma.event.findMany({ where: eventWhere, select: { startAt: true } }),
      prisma.conflictRecord.findMany({ where: conflictWhere, select: { createdAt: true } }),
      prisma.expense.findMany({ where: expenseWhere, select: { date: true, amount: true } }),
    ])

    // Aggregate into month buckets
    const eventCounts: Record<string, number> = {}
    const conflictCounts: Record<string, number> = {}
    const spendingCounts: Record<string, Decimal> = {}

    monthKeys.forEach((k) => {
      eventCounts[k] = 0
      conflictCounts[k] = 0
      spendingCounts[k] = new Decimal(0)
    })

    events.forEach((e) => {
      const k = `${e.startAt.getUTCFullYear()}-${String(e.startAt.getUTCMonth() + 1).padStart(2, '0')}`
      if (eventCounts[k] !== undefined) eventCounts[k]++
    })

    conflicts.forEach((c) => {
      const k = `${c.createdAt.getUTCFullYear()}-${String(c.createdAt.getUTCMonth() + 1).padStart(2, '0')}`
      if (conflictCounts[k] !== undefined) conflictCounts[k]++
    })

    expenses.forEach((e) => {
      const k = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`
      if (spendingCounts[k] !== undefined) {
        spendingCounts[k] = spendingCounts[k].plus(e.amount)
      }
    })

    const trends = monthKeys.map((month) => ({
      month,
      eventsCount: eventCounts[month] || 0,
      conflictsCount: conflictCounts[month] || 0,
      approvedSpending: (spendingCounts[month] || new Decimal(0)).toFixed(2),
    }))

    return { trends }
  }
}

export const reportService = new ReportService()
