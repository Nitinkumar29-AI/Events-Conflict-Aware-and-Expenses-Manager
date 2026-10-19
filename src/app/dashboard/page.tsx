import React from 'react'
import { auth } from '@/server/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/server/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'
import {
  RoleBadge,
  EventStatusBadge,
  ConflictSeverityBadge,
  ConflictStatusBadge,
  ExpenseStatusBadge,
} from '@/components/ui/Badges'
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Cards'
import { ROLE_PERMISSIONS } from '@/lib/auth-client'
import {
  CalendarDays,
  Calendar,
  AlertTriangle,
  Receipt,
  PlusCircle,
  ShieldCheck,
  Building,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  ExternalLink,
  Bell,
  MapPin,
  ChevronRight,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user
  const userClub = user.clubId
    ? await prisma.club.findUnique({ where: { id: user.clubId } })
    : null

  const isCoreAdmin =
    user.role === 'SUPER_ADMIN' || user.role === 'ACM_CORE' || user.role === 'ACM_EXEC'
  const isClubRep = user.role === 'CLUB_REP' && !!user.clubId
  const isViewer = user.role === 'VIEWER' || user.role === 'MEMBER'

  // Metric counts
  let eventCount = 0
  let submittedEventCount = 0
  let activeConflictsCount = 0
  let expenseCount = 0

  if (isViewer) {
    eventCount = await prisma.event.count({
      where: { deletedAt: null, status: { in: ['VERIFIED', 'COMPLETED'] } },
    })
  } else if (isClubRep && user.clubId) {
    eventCount = await prisma.event.count({
      where: {
        deletedAt: null,
        OR: [{ status: { in: ['VERIFIED', 'COMPLETED'] } }, { clubId: user.clubId }],
      },
    })
    submittedEventCount = await prisma.event.count({
      where: { deletedAt: null, clubId: user.clubId, status: 'SUBMITTED' },
    })
    activeConflictsCount = await prisma.conflictRecord.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        OR: [{ eventA: { clubId: user.clubId } }, { eventB: { clubId: user.clubId } }],
      },
    })
    expenseCount = await prisma.expense.count({
      where: { deletedAt: null, clubId: user.clubId },
    })
  } else {
    // Core admin
    eventCount = await prisma.event.count({ where: { deletedAt: null } })
    submittedEventCount = await prisma.event.count({
      where: { deletedAt: null, status: 'SUBMITTED' },
    })
    activeConflictsCount = await prisma.conflictRecord.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    })
    expenseCount = await prisma.expense.count({ where: { deletedAt: null } })
  }

  // Actionable queues (Role-scoped)
  let pendingEvents: any[] = []
  let pendingConflicts: any[] = []
  let pendingExpenses: any[] = []

  if (isCoreAdmin) {
    pendingEvents = await prisma.event.findMany({
      where: { deletedAt: null, status: 'SUBMITTED' },
      include: {
        club: { select: { name: true, code: true } },
        venue: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    pendingConflicts = await prisma.conflictRecord.findMany({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      include: {
        eventA: { select: { id: true, title: true, club: { select: { code: true } } } },
        eventB: { select: { id: true, title: true, club: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    pendingExpenses = await prisma.expense.findMany({
      where: { deletedAt: null, status: 'SUBMITTED' },
      include: {
        club: { select: { name: true, code: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } else if (isClubRep && user.clubId) {
    pendingEvents = await prisma.event.findMany({
      where: { deletedAt: null, clubId: user.clubId, status: { in: ['DRAFT', 'SUBMITTED'] } },
      include: {
        club: { select: { name: true, code: true } },
        venue: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    pendingConflicts = await prisma.conflictRecord.findMany({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        OR: [{ eventA: { clubId: user.clubId } }, { eventB: { clubId: user.clubId } }],
      },
      include: {
        eventA: { select: { id: true, title: true, club: { select: { code: true } } } },
        eventB: { select: { id: true, title: true, club: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    pendingExpenses = await prisma.expense.findMany({
      where: { deletedAt: null, clubId: user.clubId, status: 'SUBMITTED' },
      include: {
        club: { select: { name: true, code: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  }

  // Upcoming confirmed events (publicly scheduled)
  const upcomingEvents = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: 'VERIFIED',
      startAt: { gte: new Date() },
    },
    include: {
      club: { select: { name: true, code: true } },
      venue: { select: { name: true } },
    },
    orderBy: { startAt: 'asc' },
    take: 4,
  })

  // Recent user notifications
  const recentNotifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome & Session Information Hero */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {user.name || user.email}
                </h1>
                <RoleBadge role={user.role} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isCoreAdmin && 'Institutional Administrator Console • Conflict and Approval Primacy'}
                {isClubRep && `Club Representative Workspace • ${userClub?.name || 'Club Portal'}`}
                {isViewer && 'Read-Only Viewer Portal • Public Campus Calendar & Event Directory'}
              </p>
            </div>
            {userClub && (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs self-start md:self-auto">
                <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-indigo-950">{userClub.name}</span>
                <span className="text-indigo-600 font-mono font-medium">({userClub.code})</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">User Account</span>
              <span className="font-semibold text-slate-800 truncate block">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">System Role</span>
              <span className="font-semibold text-slate-800">{user.role}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Active Scope</span>
              <span className="font-semibold text-slate-800 truncate block">
                {userClub
                  ? userClub.name
                  : isCoreAdmin
                  ? 'All Campus Clubs'
                  : 'Public Events'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Permissions</span>
              <span className="font-semibold text-slate-800">{permissions.length} actions</span>
            </div>
          </div>
        </div>

        {/* Actionable KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Visible Events"
            value={eventCount}
            linkHref="/events"
            linkLabel="View Directory"
            icon={CalendarDays}
            colorScheme="indigo"
          />

          <StatCard
            title={isClubRep ? 'My Pending Submissions' : 'Pending Verification'}
            value={submittedEventCount}
            linkHref="/events?status=SUBMITTED"
            linkLabel={submittedEventCount > 0 ? 'Review queue' : 'All clear'}
            icon={Clock}
            colorScheme="amber"
          />

          {!isViewer ? (
            <StatCard
              title="Active Conflicts"
              value={activeConflictsCount}
              linkHref="/conflicts"
              linkLabel={activeConflictsCount > 0 ? 'Resolve conflicts' : 'Zero clashes'}
              icon={AlertTriangle}
              colorScheme="rose"
            />
          ) : (
            <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conflicts Engine
                </p>
                <p className="text-xs text-slate-500 mt-1">Restricted for Public Viewer</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-slate-300" />
            </div>
          )}

          {!isViewer ? (
            <StatCard
              title="Expense Ledgers"
              value={expenseCount}
              linkHref="/expenses"
              linkLabel="View Ledgers"
              icon={Receipt}
              colorScheme="emerald"
            />
          ) : (
            <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Financial Records
                </p>
                <p className="text-xs text-slate-500 mt-1">Restricted for Public Viewer</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-slate-300" />
            </div>
          )}
        </div>

        {/* Priority Action Queues (for Core Admins & Club Reps) */}
        {!isViewer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue 1: Events Needing Attention */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {isCoreAdmin ? 'Events Pending Verification' : 'My Event Submissions'}
                    </h2>
                  </div>
                  <Link
                    href="/events?status=SUBMITTED"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {pendingEvents.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-800">
                        {isCoreAdmin ? 'Verification queue is clear' : 'No pending submissions'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isCoreAdmin
                          ? 'All submitted club events have been verified or resolved.'
                          : 'You have no draft or pending event proposals requiring review.'}
                      </p>
                    </div>
                  ) : (
                    pendingEvents.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {ev.title}
                            </span>
                            <EventStatusBadge status={ev.status} />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{ev.club.code}</span>
                            <span>•</span>
                            <span>{ev.venue.name}</span>
                            <span>•</span>
                            <span>
                              {new Date(ev.startAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Queue 2: Conflicts Needing Resolution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Active Schedule Clashes
                    </h2>
                  </div>
                  <Link
                    href="/conflicts"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <span>Control Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {pendingConflicts.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-800">
                        Zero unresolved conflicts
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No active venue, audience, or turnaround clashes detected.
                      </p>
                    </div>
                  ) : (
                    pendingConflicts.map((c) => (
                      <Link
                        key={c.id}
                        href="/conflicts"
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">
                              {c.conflictType}
                            </span>
                            <ConflictSeverityBadge severity={c.severity} />
                            <ConflictStatusBadge status={c.status} />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {c.eventA.title} ({c.eventA.club.code}) vs. {c.eventB.title} (
                            {c.eventB.club.code})
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Workflow Section: Upcoming Events & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Verified Events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Upcoming Campus Events
                </h2>
              </div>
              <Link
                href="/calendar"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                <span>Full Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No upcoming verified events scheduled.
                </div>
              ) : (
                upcomingEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-medium text-slate-700">{ev.club.name}</span>
                        <span>•</span>
                        <span>{ev.venue.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(ev.startAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent In-App Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Recent Notifications
                </h2>
              </div>
              <Link
                href="/notifications"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                <span>All Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No recent notifications.
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <div key={notif.id} className="p-3.5 flex items-start gap-3 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        !notif.readAt ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{notif.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                        {notif.message}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-1">
                        {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {notif.linkUrl && (
                      <Link
                        href={notif.linkUrl}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] shrink-0"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
