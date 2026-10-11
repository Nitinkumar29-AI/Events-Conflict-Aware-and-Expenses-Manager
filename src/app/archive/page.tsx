'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-indigo-400" />
            Historical Archive & Institutional Memory
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Browse and query historical events, recorded conflicts, and institutional audit trails.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex gap-4">
        <button
          onClick={() => { setActiveTab('events'); setEventPage(1) }}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'events'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Events Archive
        </button>
        <button
          onClick={() => { setActiveTab('conflicts'); setConflictPage(1) }}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'conflicts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Conflict History
        </button>
        {canViewAudit && (
          <button
            onClick={() => { setActiveTab('audit'); setAuditPage(1) }}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= EVENTS TAB ================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search title..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadEvents()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={eventStatus}
              onChange={(e) => { setEventStatus(e.target.value); setEventPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
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
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setEventPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
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
              value={eventPast}
              onChange={(e) => { setEventPast(e.target.value as any); setEventPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Timeframes</option>
              <option value="true">Past Events Only</option>
              <option value="false">Upcoming Events Only</option>
            </select>

            <button
              onClick={() => { setEventPage(1); loadEvents() }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply Filter
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-zinc-400">Loading events archive...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg">
              No historical events found matching the criteria.
            </div>
          ) : (
            <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-800/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Club</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date (UTC)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timeframe</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{e.title}</td>
                      <td className="py-3 px-4 text-zinc-400">{e.club.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{e.eventType}</td>
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        {new Date(e.startAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            e.status === 'VERIFIED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : e.status === 'COMPLETED'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : e.status === 'CANCELLED'
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : e.status === 'REJECTED'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            e.isPast
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          }`}
                        >
                          {e.isPast ? 'Past Event' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEventDetails(e.id)}
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
                  <div>
                    Page {eventMeta.page} of {eventMeta.totalPages} ({eventMeta.total} events)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={eventPage <= 1}
                      onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={eventPage >= eventMeta.totalPages}
                      onClick={() => setEventPage((p) => p + 1)}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <select
              value={conflictType}
              onChange={(e) => { setConflictType(e.target.value); setConflictPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="VENUE">Venue Overlap</option>
              <option value="AUDIENCE">Audience Clashing</option>
              <option value="ORGANIZER">Organizer Conflict</option>
              <option value="TIGHT_TURNAROUND">Tight Turnaround</option>
            </select>

            <select
              value={conflictSeverity}
              onChange={(e) => { setConflictSeverity(e.target.value); setConflictPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            <select
              value={conflictStatus}
              onChange={(e) => { setConflictStatus(e.target.value); setConflictPage(1) }}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Resolution States</option>
              <option value="OPEN">Open (Unresolved)</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="OVERRIDDEN">Overridden</option>
            </select>

            <button
              onClick={() => { setConflictPage(1); loadConflicts() }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
            >
              Filter Conflicts
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-zinc-400">Loading conflict history...</div>
          ) : conflicts.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg">
              No historical conflicts found.
            </div>
          ) : (
            <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-800/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Conflict Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Event A</th>
                    <th className="py-3 px-4">Event B</th>
                    <th className="py-3 px-4">Resolution Note</th>
                    <th className="py-3 px-4">Logged (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {conflicts.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{c.conflictType}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            c.severity === 'HIGH'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : c.severity === 'MEDIUM'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {c.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : c.status === 'OVERRIDDEN'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : c.status === 'ACKNOWLEDGED'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {c.eventA.title} ({c.eventA.club.name})
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {c.eventB.title} ({c.eventB.club.name})
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">
                        {c.resolutionNote || 'None'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {conflictMeta && conflictMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
                  <div>
                    Page {conflictMeta.page} of {conflictMeta.totalPages} ({conflictMeta.total} conflicts)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={conflictPage <= 1}
                      onClick={() => setConflictPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={conflictPage >= conflictMeta.totalPages}
                      onClick={() => setConflictPage((p) => p + 1)}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <input
              type="text"
              placeholder="Target Type (e.g. Event, Expense)..."
              value={auditTargetType}
              onChange={(e) => setAuditTargetType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Action (e.g. EVENT_VERIFY)..."
              value={auditAction}
              onChange={(e) => setAuditAction(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => { setAuditPage(1); loadAuditLogs() }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
            >
              Filter Audit Trail
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg">
              No audit logs recorded for this criteria.
            </div>
          ) : (
            <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-800/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Target ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {log.actor?.name || 'System'} ({log.actor?.role || 'SYSTEM'})
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{log.targetType}</td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-400">{log.targetId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditMeta && auditMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
                  <div>
                    Page {auditMeta.page} of {auditMeta.totalPages} ({auditMeta.total} entries)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={auditPage >= auditMeta.totalPages}
                      onClick={() => setAuditPage((p) => p + 1)}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Historical Event Review
              </h2>
              <button
                onClick={() => { setSelectedEventId(null); setEventDetails(null) }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !eventDetails ? (
              <div className="py-12 text-center text-zinc-400">Loading historical records...</div>
            ) : (
              <div className="space-y-6 text-sm">
                {/* Event Basic Info */}
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="text-lg font-semibold text-white">{eventDetails.event.title}</div>
                  <div className="text-zinc-400 text-xs">
                    Club: <span className="text-zinc-200">{eventDetails.event.club.name}</span> | Venue:{' '}
                    <span className="text-zinc-200">{eventDetails.event.venue.name}</span> | Semester:{' '}
                    <span className="text-zinc-200">{eventDetails.event.semester.name}</span>
                  </div>
                  <div className="text-zinc-400 text-xs flex gap-4">
                    <span>
                      Start: {new Date(eventDetails.event.startAt).toUTCString()}
                    </span>
                    <span>
                      End: {new Date(eventDetails.event.endAt).toUTCString()}
                    </span>
                  </div>
                </div>

                {/* Facts vs Calculated (Institutional Memory notice) */}
                <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-900 text-indigo-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
                    <Info className="w-4 h-4" />
                    Recorded Facts & Outcome Status
                  </div>
                  <div>
                    Expected Attendees:{' '}
                    <span className="font-mono text-white">
                      {eventDetails.event.expectedAttendees || 0}
                    </span>
                  </div>
                  <div className="text-zinc-400">
                    Actual Attendees:{' '}
                    <span className="italic text-amber-300">
                      Not recorded in database
                    </span>
                  </div>
                  <div className="text-zinc-400">
                    Post-Event Outcome Report:{' '}
                    <span className="italic text-amber-300">
                      Not recorded in database
                    </span>
                  </div>
                </div>

                {/* Review History */}
                <div>
                  <h3 className="font-semibold text-white mb-2">Review History</h3>
                  {eventDetails.event.reviews.length === 0 ? (
                    <div className="text-zinc-500 text-xs italic">No review notes recorded.</div>
                  ) : (
                    <div className="space-y-2">
                      {eventDetails.event.reviews.map((r: any) => (
                        <div
                          key={r.id}
                          className="p-3 rounded bg-zinc-800/60 border border-zinc-700/60 text-xs space-y-1"
                        >
                          <div className="flex justify-between text-zinc-400">
                            <span className="text-zinc-200 font-medium">
                              {r.reviewer?.name} ({r.decision})
                            </span>
                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          {r.comment && <div className="text-zinc-300">{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historical Conflicts */}
                <div>
                  <h3 className="font-semibold text-white mb-2">Associated Conflicts</h3>
                  {eventDetails.allConflicts.length === 0 ? (
                    <div className="text-zinc-500 text-xs italic">No conflicts associated with this event.</div>
                  ) : (
                    <div className="space-y-2">
                      {eventDetails.allConflicts.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 rounded bg-zinc-800/60 border border-zinc-700/60 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-amber-400">{c.conflictType}</span>{' '}
                            <span className="text-zinc-400">({c.severity})</span>
                            <div className="text-zinc-400 text-[11px] mt-0.5">{c.description}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Trail for this event (if available) */}
                {eventDetails.auditHistory?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-2">Audit History</h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {eventDetails.auditHistory.map((a: any) => (
                        <div
                          key={a.id}
                          className="p-2 rounded bg-zinc-800/30 text-[11px] flex justify-between text-zinc-400"
                        >
                          <span>
                            {a.actor?.name} - <span className="text-indigo-300">{a.action}</span>
                          </span>
                          <span>{new Date(a.createdAt).toLocaleDateString()}</span>
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
  )
}
