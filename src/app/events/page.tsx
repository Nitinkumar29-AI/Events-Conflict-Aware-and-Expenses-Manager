'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { EventStatusBadge } from '@/components/ui/Badges'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { canClient } from '@/lib/auth-client'
import { PlusCircle, Filter, Eye, Edit3, CalendarDays, MapPin, X, RotateCcw } from 'lucide-react'

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

function EventsContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || ''
  const initialType = searchParams.get('eventType') || ''

  const { data: session } = useSession()
  const user = session?.user

  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [typeFilter, setTypeFilter] = useState<string>(initialType)

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

  const hasActiveFilters = Boolean(statusFilter || typeFilter)

  const quickStatusTabs = [
    { label: 'All Events', value: '' },
    { label: 'Pending Review', value: 'SUBMITTED' },
    { label: 'Verified / Scheduled', value: 'VERIFIED' },
    { label: 'Drafts', value: 'DRAFT' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header */}
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

      {/* Preset Status Tabs */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
        {quickStatusTabs.map((tab) => {
          const isActive = statusFilter === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`pb-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-600 font-semibold">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Filters:</span>
            </div>

            <select
              aria-label="Filter by Event Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs shadow-2xs"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted (Pending Review)</option>
              <option value="VERIFIED">Verified (Scheduled)</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              aria-label="Filter by Event Category"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs shadow-2xs"
            >
              <option value="">All Categories</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="HACKATHON">Hackathon</option>
              <option value="SEMINAR">Seminar</option>
              <option value="SPEAKER_SESSION">Speaker Session</option>
              <option value="COMPETITION">Competition</option>
              <option value="SOCIAL">Social</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('')
                setTypeFilter('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Active Filters:</span>
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                Status: <strong>{statusFilter}</strong>
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                Type: <strong>{typeFilter}</strong>
                <button
                  type="button"
                  onClick={() => setTypeFilter('')}
                  className="hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Events Table Container */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Fetching events from directory..." />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No events matching filters' : 'No events found'}
          description={
            hasActiveFilters
              ? 'Try resetting your filter parameters or selecting a different status category.'
              : 'There are currently no events registered in the system.'
          }
          icon={CalendarDays}
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('')
                  setTypeFilter('')
                }}
                className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors"
              >
                Clear All Filters
              </button>
            ) : canCreate ? (
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
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">Club</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Start Time (IST)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      <Link
                        href={`/events/${event.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {event.title}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{event.club?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                        ({event.club?.code})
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {event.eventType}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <EventStatusBadge status={event.status} />
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.venue?.name}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {formatDateTime(event.startAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-md transition-colors font-semibold"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                        {canCreate && (event.status === 'DRAFT' || event.status === 'SUBMITTED') && (
                          <Link
                            href={`/events/${event.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-md transition-colors font-semibold"
                            title="Edit Event"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Showing {events.length} event{events.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-slate-400">
              Indian Standard Time (IST, UTC+05:30)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EventsPage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingSpinner message="Loading events..." />}>
        <EventsContent />
      </Suspense>
    </AppShell>
  )
}
