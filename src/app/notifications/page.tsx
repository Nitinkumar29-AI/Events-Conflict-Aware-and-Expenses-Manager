'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Calendar,
  Receipt,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.data) {
        setNotifications(data.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
    } catch (err: any) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      )
    } catch (err: any) {
      console.error(err)
    } finally {
      setMarkingAll(false)
    }
  }

  const getIconForType = (type: string) => {
    if (type.startsWith('EVENT')) {
      return (
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <Calendar className="w-4 h-4" />
        </div>
      )
    }
    if (type.startsWith('EXPENSE')) {
      return (
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <Receipt className="w-4 h-4" />
        </div>
      )
    }
    if (type.startsWith('CONFLICT')) {
      return (
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
        </div>
      )
    }
    return (
      <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
        <Bell className="w-4 h-4" />
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length
  const displayedNotifications =
    filterTab === 'UNREAD' ? notifications.filter((n) => !n.readAt) : notifications

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs items={[{ label: 'Notifications Center' }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Notifications Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Actionable alerts for schedule conflicts, event state transitions, and expense approvals.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-slate-500" />
              <span>{markingAll ? 'Marking...' : 'Mark all as read'}</span>
            </button>
          )}
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        {/* Quick Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-2" aria-label="Notification view tabs">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`py-2 px-3.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                filterTab === 'ALL'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('UNREAD')}
              className={`py-2 px-3.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                filterTab === 'UNREAD'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Unread Only ({unreadCount})
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Loading alerts..." />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {filterTab === 'UNREAD' ? 'No unread notifications' : 'All caught up!'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {filterTab === 'UNREAD'
                ? 'You have addressed all active alerts. Check the "All Notifications" tab to review history.'
                : 'You have no notifications or alerts at this time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedNotifications.map((n) => {
              const isUnread = !n.readAt
              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-indigo-50/20 border-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="shrink-0">{getIconForType(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-xs font-bold ${
                              isUnread ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {n.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {new Date(n.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-3 flex items-center gap-4">
                        {n.linkUrl && (
                          <Link
                            href={n.linkUrl}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
