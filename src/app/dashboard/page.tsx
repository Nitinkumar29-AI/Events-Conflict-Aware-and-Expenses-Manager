import React from 'react'
import { auth } from '@/server/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/server/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'
import { RoleBadge } from '@/components/ui/Badges'
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

  // Lightweight counts for dashboard
  let eventCount = 0
  let submittedEventCount = 0
  let activeConflictsCount = 0
  let expenseCount = 0

  if (user.role === 'VIEWER') {
    eventCount = await prisma.event.count({
      where: { deletedAt: null, status: { in: ['VERIFIED', 'COMPLETED'] } },
    })
  } else if (user.role === 'CLUB_REP' && user.clubId) {
    eventCount = await prisma.event.count({
      where: {
        deletedAt: null,
        OR: [
          { status: { in: ['VERIFIED', 'COMPLETED'] } },
          { clubId: user.clubId },
        ],
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
    // SUPER_ADMIN, ACM_CORE, ACM_EXEC
    eventCount = await prisma.event.count({ where: { deletedAt: null } })
    submittedEventCount = await prisma.event.count({
      where: { deletedAt: null, status: 'SUBMITTED' },
    })
    activeConflictsCount = await prisma.conflictRecord.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    })
    expenseCount = await prisma.expense.count({ where: { deletedAt: null } })
  }

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
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Session ID: {user.id}
              </p>
            </div>
            {userClub && (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs self-start md:self-auto">
                <Building className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-indigo-950">
                  {userClub.name}
                </span>
                <span className="text-indigo-600 font-mono font-medium">({userClub.code})</span>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium block">Registered Email</span>
              <span className="font-semibold text-slate-800 break-all">{user.email}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium block">Assigned RBAC Role</span>
              <span className="font-semibold text-slate-800">{user.role}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium block">Operational Scope</span>
              <span className="font-semibold text-slate-800">
                {userClub
                  ? `${userClub.name}`
                  : user.role === 'SUPER_ADMIN' || user.role === 'ACM_CORE'
                  ? 'Institutional (All Clubs)'
                  : 'Campus Public'}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium block">Authorized Actions</span>
              <span className="font-semibold text-slate-800">{permissions.length} operations permitted</span>
            </div>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Visible Events"
            value={eventCount}
            linkHref="/events"
            linkLabel="Explore directory"
            icon={CalendarDays}
            colorScheme="indigo"
          />

          <StatCard
            title="Pending Review"
            value={submittedEventCount}
            linkHref="/events?status=SUBMITTED"
            linkLabel="Review queue"
            icon={Clock}
            colorScheme="amber"
          />

          {user.role !== 'VIEWER' ? (
            <StatCard
              title="Active Conflicts"
              value={activeConflictsCount}
              linkHref="/conflicts"
              linkLabel="Manage conflicts"
              icon={AlertTriangle}
              colorScheme="rose"
            />
          ) : (
            <div className="bg-slate-50/70 p-5 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conflicts Engine
                </p>
                <p className="text-xs text-slate-500 mt-1">Restricted for Public Viewer</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-slate-300" />
            </div>
          )}

          {user.role !== 'VIEWER' ? (
            <StatCard
              title="Expense Ledgers"
              value={expenseCount}
              linkHref="/expenses"
              linkLabel="Review expenses"
              icon={Receipt}
              colorScheme="emerald"
            />
          ) : (
            <div className="bg-slate-50/70 p-5 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
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

        {/* Feature Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-base text-slate-900 tracking-tight">Events Management</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Coordinate club events across draft, submission, verification, and cancellation states.
                Automated conflict checks run on each lifecycle transition.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <Link
                href="/events"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                Browse Events
              </Link>
              {user.role !== 'VIEWER' && (
                <Link
                  href="/events/new"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  + New Event
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-base text-slate-900 tracking-tight">Conflict Detection Engine</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated multi-rule conflict detection detecting venue overlaps, target audience collisions,
                and tight turnaround bottlenecks with severity escalation.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              {user.role !== 'VIEWER' ? (
                <Link
                  href="/conflicts"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  Review Conflicts
                </Link>
              ) : (
                <span className="text-xs text-slate-400 italic">Viewers cannot access conflicts</span>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-base text-slate-900 tracking-tight">Institutional Calendar</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time calendar visualizer showing scheduled, verified, and submitted events
                across month, week, and day timeframes in Indian Standard Time (IST).
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <Link
                href="/calendar"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                Open Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Permissions & Security Summary Matrix */}
        <Card>
          <CardHeader
            title={`Active Role Capabilities (${user.role})`}
            subtitle="Verified actions granted by institutional RBAC policy for this session"
            icon={ShieldCheck}
          />
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((action) => (
                <span
                  key={action}
                  className="px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 border border-slate-200"
                >
                  {action}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
