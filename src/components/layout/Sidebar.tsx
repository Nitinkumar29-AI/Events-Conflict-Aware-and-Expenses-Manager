'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  AlertTriangle,
  Receipt,
  Bell,
  Archive,
  BarChart3,
  PlusCircle,
  X,
  Shield,
  Wallet,
} from 'lucide-react'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    if (session?.user) {
      fetch('/api/notifications/unread-count')
        .then((res) => res.json())
        .then((data) => setUnreadCount(data.count || 0))
        .catch(console.error)
    }
  }, [session?.user])

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  show: boolean
  badge?: string
  count?: number
}

  const isViewer = role === 'VIEWER' || role === 'MEMBER'
  const canViewBudgets = role === 'SUPER_ADMIN' || role === 'ACM_CORE' || role === 'ACM_EXEC'

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: 'Overview',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
        {
          name: 'Events',
          href: '/events',
          icon: CalendarDays,
          show: true,
        },
        {
          name: 'Calendar',
          href: '/calendar',
          icon: Calendar,
          show: true,
        },
      ],
    },
    {
      group: 'Operations',
      items: [
        {
          name: 'Conflicts',
          href: '/conflicts',
          icon: AlertTriangle,
          show: !isViewer,
          badge: 'Core/Rep',
        },
        {
          name: 'Expenses',
          href: '/expenses',
          icon: Receipt,
          show: !isViewer,
        },
        {
          name: 'Budgets',
          href: '/budgets',
          icon: Wallet,
          show: canViewBudgets,
          badge: 'Core/Exec',
        },
      ],
    },
    {
      group: 'Records & Intelligence',
      items: [
        {
          name: 'Notifications',
          href: '/notifications',
          icon: Bell,
          show: !!session?.user,
          count: unreadCount > 0 ? unreadCount : undefined,
        },
        {
          name: 'Archive',
          href: '/archive',
          icon: Archive,
          show: !isViewer && !!session?.user,
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: BarChart3,
          show: !isViewer && !!session?.user,
        },
      ],
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition-colors">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 tracking-tight leading-tight">
              ACM Incursion
            </div>
            <div className="text-[11px] font-medium text-slate-500">Events & Finances</div>
          </div>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show)
          if (visibleItems.length === 0) return null

          return (
            <div key={group.group} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {group.group}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.count !== undefined ? (
                      <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {item.count}
                      </span>
                    ) : item.badge ? (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-normal">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      {!isViewer && (
        <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/50">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/events/new"
              onClick={onCloseMobile}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Event</span>
            </Link>
            <Link
              href="/expenses/new"
              onClick={onCloseMobile}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Expense</span>
            </Link>
          </div>
        </div>
      )}

      {/* System Footer Info */}
      <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50/30">
        <span>PostgreSQL 16 • Next.js 16</span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          RBAC Active
        </span>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-64 max-w-[80vw] z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
