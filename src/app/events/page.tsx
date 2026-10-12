'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { EventStatusBadge } from '@/components/ui/Badges'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { canClient } from '@/lib/auth-client'
import { PlusCircle, Filter, Eye, Edit3, CalendarDays, MapPin } from 'lucide-react'

export interface EventListItem {
  id: string
  title: string
  eventType: string
  status: string
  startAt: string
  endAt: string
  clubId: string
  club: { id: string; name: string; code: string }
  venue: { id: string; name: string }
  semester: { id: string; name: string }
  submittedBy?: { id: string; name: string; email: string }
}

export default function EventsPage() {
  const { data: session } = useSession()
  const user = session?.user

  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('eventType', typeFilter)
      params.set('pageSize', '50')

      const res = await fetchApi<EventListItem[]>(`/api/events?${params.toString()}`)
      setEvents(res.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadEvents()
    }
  }, [session, statusFilter, typeFilter])

  const canCreate = canClient(user?.role, 'CREATE_EVENT')

  const formatDateTime = (iso: string) => {
    try {
      const date = new Date(iso)
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Events Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Browse, filter, and track club events across all verification and scheduling states.
            </p>
          </div>
          {canCreate && (
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </Link>
          )}
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">All Event Types</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="HACKATHON">Hackathon</option>
            <option value="SPEAKER_SESSION">Speaker Session</option>
            <option value="COMPETITION">Competition</option>
            <option value="SOCIAL">Social</option>
            <option value="OTHER">Other</option>
          </select>

          {(statusFilter || typeFilter) && (
            <button
              onClick={() => {
                setStatusFilter('')
                setTypeFilter('')
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold ml-auto underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Events Table Container */}
        {loading ? (
          <LoadingSpinner message="Fetching events from directory..." />
        ) : events.length === 0 ? (
          <EmptyState
            title="No events found"
            description="There are currently no events matching your selected filter criteria."
            icon={CalendarDays}
            action={
              canCreate ? (
                <Link
                  href="/events/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create First Event
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Event Name</th>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Start Time (IST)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => {
                    const isOwner =
                      user?.role === 'SUPER_ADMIN' ||
                      user?.role === 'ACM_CORE' ||
                      (user?.clubId && user.clubId === ev.clubId)
                    const canEdit =
                      isOwner &&
                      (ev.status === 'DRAFT' || ev.status === 'SUBMITTED') &&
                      canClient(user?.role, 'UPDATE_EVENT')

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/events/${ev.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 line-clamp-1"
                          >
                            {ev.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">{ev.club?.name}</span>
                          <span className="text-slate-400 font-mono ml-1">({ev.club?.code})</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.venue?.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                            {ev.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {formatDateTime(ev.startAt)}
                        </td>
                        <td className="py-3 px-4">
                          <EventStatusBadge status={ev.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/events/${ev.id}`}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="View Details & Conflicts"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canEdit && (
                              <Link
                                href={`/events/${ev.id}/edit`}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Edit Event"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {events.length} event records</span>
              <span>Sorted chronologically</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
