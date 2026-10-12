'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { fetchApi } from '@/lib/api'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import {
  EventStatusBadge,
  ConflictSeverityBadge,
  ConflictStatusBadge,
} from '@/components/ui/Badges'
import {
  Archive,
  Search,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowRight,
  User,
  RotateCcw,
} from 'lucide-react'

export default function ArchivePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role

  const [activeTab, setActiveTab] = useState<'events' | 'conflicts' | 'audit'>('events')

  // Events filter & data
  const [eventSearch, setEventSearch] = useState('')
  const [eventStatus, setEventStatus] = useState('')
  const [eventType, setEventType] = useState('')
  const [eventPast, setEventPast] = useState<'all' | 'true' | 'false'>('all')
  const [eventPage, setEventPage] = useState(1)
  const [events, setEvents] = useState<any[]>([])
  const [eventMeta, setEventMeta] = useState<any>(null)

  // Conflicts filter & data
  const [conflictType, setConflictType] = useState('')
  const [conflictSeverity, setConflictSeverity] = useState('')
  const [conflictStatus, setConflictStatus] = useState('')
  const [conflictPage, setConflictPage] = useState(1)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [conflictMeta, setConflictMeta] = useState<any>(null)

  // Audit filter & data
  const [auditTargetType, setAuditTargetType] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditMeta, setAuditMeta] = useState<any>(null)

  // Selected event modal
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canViewAudit = role === 'SUPER_ADMIN' || role === 'ACM_CORE'

  // Redirect viewer
  useEffect(() => {
    if (role === 'VIEWER') {
      router.push('/dashboard')
    }
  }, [role, router])

  // Load Events
  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(eventPage))
      params.set('limit', '15')
      if (eventSearch.trim()) params.set('q', eventSearch.trim())
      if (eventStatus) params.set('status', eventStatus)
      if (eventType) params.set('eventType', eventType)
      if (eventPast === 'true' || eventPast === 'false') params.set('isPast', eventPast)

      const res = await fetchApi<any[]>(`/api/archive/events?${params.toString()}`)
      setEvents(res.data)
      setEventMeta(res.meta)
    } catch (err: any) {
      setError(err.message || 'Failed to load events archive')
    } finally {
      setLoading(false)
    }
  }

  // Load Conflicts
  const loadConflicts = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(conflictPage))
      params.set('limit', '15')
      if (conflictType) params.set('conflictType', conflictType)
      if (conflictSeverity) params.set('severity', conflictSeverity)
      if (conflictStatus) params.set('status', conflictStatus)

      const res = await fetchApi<any[]>(`/api/archive/conflicts?${params.toString()}`)
      setConflicts(res.data)
      setConflictMeta(res.meta)
    } catch (err: any) {
      setError(err.message || 'Failed to load conflicts archive')
    } finally {
      setLoading(false)
    }
  }

  // Load Audit Logs
  const loadAuditLogs = async () => {
    if (!canViewAudit) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(auditPage))
      params.set('limit', '15')
      if (auditTargetType) params.set('targetType', auditTargetType)
      if (auditAction) params.set('action', auditAction)

      const res = await fetchApi<any[]>(`/api/archive/audit-logs?${params.toString()}`)
      setAuditLogs(res.data)
      setAuditMeta(res.meta)
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user || role === 'VIEWER') return
    if (activeTab === 'events') {
      loadEvents()
    } else if (activeTab === 'conflicts') {
      loadConflicts()
    } else if (activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [activeTab, eventPage, conflictPage, auditPage, session, role])

  // Open event details
  const openEventDetails = async (id: string) => {
    setSelectedEventId(id)
    setDetailsLoading(true)
    try {
      const res = await fetchApi<any>(`/api/archive/events/${id}`)
      setEventDetails(res.data)
    } catch (err: any) {
      alert(err.message || 'Failed to load event details')
      setSelectedEventId(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const hasActiveEventFilters = Boolean(eventSearch || eventStatus || eventType || eventPast !== 'all')
  const hasActiveConflictFilters = Boolean(conflictType || conflictSeverity || conflictStatus)
  const hasActiveAuditFilters = Boolean(auditTargetType || auditAction)

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs items={[{ label: 'Institutional Memory & Archive' }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Archive className="w-6 h-6 text-indigo-600" />
              Historical Archive & Institutional Memory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative historical repository of events, conflict resolution trails, and system audit logs.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('events')
              setEventPage(1)
            }}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'events'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Events Archive</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('conflicts')
              setConflictPage(1)
            }}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'conflicts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Conflict History</span>
          </button>
          {canViewAudit && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('audit')
                setAuditPage(1)
              }}
              className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Logs</span>
            </button>
          )}
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        {/* ================= EVENTS TAB ================= */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search title..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadEvents()}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  aria-label="Filter by Event Status"
                  value={eventStatus}
                  onChange={(e) => {
                    setEventStatus(e.target.value)
                    setEventPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="VERIFIED">Verified / Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  aria-label="Filter by Event Type"
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value)
                    setEventPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="HACKATHON">Hackathon</option>
                  <option value="SEMINAR">Seminar</option>
                  <option value="COMPETITION">Competition</option>
                  <option value="CULTURAL">Cultural</option>
                  <option value="SPORTS">Sports</option>
                  <option value="OTHER">Other</option>
                </select>

                <select
                  aria-label="Filter by Timeframe"
                  value={eventPast}
                  onChange={(e) => {
                    setEventPast(e.target.value as any)
                    setEventPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Timeframes</option>
                  <option value="true">Past Events Only</option>
                  <option value="false">Upcoming Events Only</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEventPage(1)
                      loadEvents()
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Apply Filter
                  </button>
                  {hasActiveEventFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventSearch('')
                        setEventStatus('')
                        setEventType('')
                        setEventPast('all')
                        setEventPage(1)
                      }}
                      className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="sr-only">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {hasActiveEventFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>Filtered view active</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEventSearch('')
                      setEventStatus('')
                      setEventType('')
                      setEventPast('all')
                      setEventPage(1)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Reset all event filters
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-16 flex justify-center">
                <LoadingSpinner size="lg" message="Loading historical events..." />
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">No events found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No historical records match your filter parameters.
                </p>
                {hasActiveEventFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventSearch('')
                      setEventStatus('')
                      setEventType('')
                      setEventPast('all')
                      setEventPage(1)
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Club</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timeframe</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{e.title}</td>
                        <td className="py-3 px-4 text-slate-600">{e.club.name}</td>
                        <td className="py-3 px-4 text-slate-600">{e.eventType}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(e.startAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <EventStatusBadge status={e.status} />
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              e.isPast
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {e.isPast ? 'Past' : 'Upcoming'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEventDetails(e.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
                          >
                            Review & Outcomes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {eventMeta && eventMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
                    <div>
                      Page {eventMeta.page} of {eventMeta.totalPages} ({eventMeta.total} events)
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={eventPage <= 1}
                        onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={eventPage >= eventMeta.totalPages}
                        onClick={() => setEventPage((p) => p + 1)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= CONFLICTS TAB ================= */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            {/* Conflict Filters */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  aria-label="Filter by Conflict Type"
                  value={conflictType}
                  onChange={(e) => {
                    setConflictType(e.target.value)
                    setConflictPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="VENUE">Venue Overlap</option>
                  <option value="AUDIENCE">Audience Clashing</option>
                  <option value="ORGANIZER">Organizer Conflict</option>
                  <option value="TIGHT_TURNAROUND">Tight Turnaround</option>
                </select>

                <select
                  aria-label="Filter by Severity"
                  value={conflictSeverity}
                  onChange={(e) => {
                    setConflictSeverity(e.target.value)
                    setConflictPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Severities</option>
                  <option value="HIGH">High Severity</option>
                  <option value="MEDIUM">Medium Severity</option>
                  <option value="LOW">Low Severity</option>
                </select>

                <select
                  aria-label="Filter by Conflict Status"
                  value={conflictStatus}
                  onChange={(e) => {
                    setConflictStatus(e.target.value)
                    setConflictPage(1)
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Resolution States</option>
                  <option value="OPEN">Open (Unresolved)</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="OVERRIDDEN">Overridden</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConflictPage(1)
                      loadConflicts()
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Filter Conflicts
                  </button>
                  {hasActiveConflictFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setConflictType('')
                        setConflictSeverity('')
                        setConflictStatus('')
                        setConflictPage(1)
                      }}
                      className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Reset conflict filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="sr-only">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {hasActiveConflictFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>Filtered conflict records active</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConflictType('')
                      setConflictSeverity('')
                      setConflictStatus('')
                      setConflictPage(1)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Reset all conflict filters
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-16 flex justify-center">
                <LoadingSpinner size="lg" message="Loading conflict archive..." />
              </div>
            ) : conflicts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
                <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">No conflicts found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No historical conflict records match the active criteria.
                </p>
                {hasActiveConflictFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setConflictType('')
                      setConflictSeverity('')
                      setConflictStatus('')
                      setConflictPage(1)
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Conflict Type</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Event A</th>
                      <th className="py-3 px-4">Event B</th>
                      <th className="py-3 px-4">Resolution Note</th>
                      <th className="py-3 px-4">Logged Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conflicts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.conflictType}</td>
                        <td className="py-3 px-4">
                          <ConflictSeverityBadge severity={c.severity} />
                        </td>
                        <td className="py-3 px-4">
                          <ConflictStatusBadge status={c.status} />
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-medium text-slate-900">{c.eventA.title}</span>{' '}
                          <span className="text-slate-400">({c.eventA.club.name})</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-medium text-slate-900">{c.eventB.title}</span>{' '}
                          <span className="text-slate-400">({c.eventB.club.name})</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {c.resolutionNote || 'None'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {conflictMeta && conflictMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
                    <div>
                      Page {conflictMeta.page} of {conflictMeta.totalPages} ({conflictMeta.total} conflicts)
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={conflictPage <= 1}
                        onClick={() => setConflictPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={conflictPage >= conflictMeta.totalPages}
                        onClick={() => setConflictPage((p) => p + 1)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= AUDIT LOGS TAB ================= */}
        {activeTab === 'audit' && canViewAudit && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Target Type (e.g. Event, Expense)..."
                  value={auditTargetType}
                  onChange={(e) => setAuditTargetType(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Action (e.g. EVENT_VERIFY)..."
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditPage(1)
                      loadAuditLogs()
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Filter Audit Trail
                  </button>
                  {hasActiveAuditFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditTargetType('')
                        setAuditAction('')
                        setAuditPage(1)
                      }}
                      className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Reset audit filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="sr-only">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {hasActiveAuditFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>Filtered audit events active</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditTargetType('')
                      setAuditAction('')
                      setAuditPage(1)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Reset all audit filters
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <LoadingSpinner size="lg" message="Loading audit logs..." />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
                <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">No audit records</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No institutional audit events found matching the criteria.
                </p>
                {hasActiveAuditFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuditTargetType('')
                      setAuditAction('')
                      setAuditPage(1)
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Type</th>
                      <th className="py-3 px-4">Target ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {log.actor?.name || 'System'}{' '}
                          <span className="text-slate-400 text-[11px]">
                            ({log.actor?.role || 'SYSTEM'})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-semibold border border-indigo-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{log.targetType}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {log.targetId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {auditMeta && auditMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
                    <div>
                      Page {auditMeta.page} of {auditMeta.totalPages} ({auditMeta.total} entries)
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={auditPage >= auditMeta.totalPages}
                        onClick={() => setAuditPage((p) => p + 1)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 text-slate-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= EVENT DETAILS MODAL ================= */}
        {selectedEventId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Historical Event Review
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(null)
                    setEventDetails(null)
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailsLoading || !eventDetails ? (
                <div className="py-16 flex justify-center">
                  <LoadingSpinner size="md" message="Loading event dossier..." />
                </div>
              ) : (
                <div className="space-y-6 text-xs text-slate-700">
                  {/* Event Basic Info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="text-base font-bold text-slate-900">
                      {eventDetails.event.title}
                    </div>
                    <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Club: <strong className="text-slate-700">{eventDetails.event.club.name}</strong>
                      </span>
                      <span>
                        Venue: <strong className="text-slate-700">{eventDetails.event.venue.name}</strong>
                      </span>
                      <span>
                        Semester:{' '}
                        <strong className="text-slate-700">{eventDetails.event.semester.name}</strong>
                      </span>
                    </div>
                    <div className="text-slate-500 flex gap-4 pt-1">
                      <span>
                        Start: {new Date(eventDetails.event.startAt).toLocaleString('en-IN')}
                      </span>
                      <span>
                        End: {new Date(eventDetails.event.endAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Facts vs Calculated (Institutional Memory notice) */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-slate-700 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Info className="w-4 h-4 text-indigo-600" />
                      Recorded Facts & Outcome Status
                    </div>
                    <div>
                      Expected Attendees:{' '}
                      <span className="font-semibold text-slate-900">
                        {eventDetails.event.expectedAttendees || 0}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Actual Attendees:{' '}
                      <span className="italic text-slate-400">Not recorded in database</span>
                    </div>
                    <div className="text-slate-500">
                      Post-Event Outcome Report:{' '}
                      <span className="italic text-slate-400">Not recorded in database</span>
                    </div>
                  </div>

                  {/* Review History */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Review History</h3>
                    {eventDetails.event.reviews.length === 0 ? (
                      <div className="text-slate-400 italic py-2">No review notes recorded.</div>
                    ) : (
                      <div className="space-y-2">
                        {eventDetails.event.reviews.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex justify-between items-center text-slate-500">
                              <span className="font-semibold text-slate-900">
                                {r.reviewer?.name} ({r.decision})
                              </span>
                              <span className="text-[11px]">
                                {new Date(r.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            {r.comment && <div className="text-slate-700">{r.comment}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historical Conflicts */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Associated Conflicts</h3>
                    {eventDetails.allConflicts.length === 0 ? (
                      <div className="text-slate-400 italic py-2">
                        No conflicts recorded for this event.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {eventDetails.allConflicts.map((c: any) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{c.conflictType}</span>
                                <ConflictSeverityBadge severity={c.severity} />
                              </div>
                              <div className="text-slate-500 text-[11px] mt-1">{c.description}</div>
                            </div>
                            <ConflictStatusBadge status={c.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail for this event (if available) */}
                  {eventDetails.auditHistory?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2">Audit History</h3>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {eventDetails.auditHistory.map((a: any) => (
                          <div
                            key={a.id}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex justify-between text-slate-600"
                          >
                            <span>
                              {a.actor?.name} -{' '}
                              <strong className="text-indigo-600 font-mono">{a.action}</strong>
                            </span>
                            <span className="text-slate-400">
                              {new Date(a.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
