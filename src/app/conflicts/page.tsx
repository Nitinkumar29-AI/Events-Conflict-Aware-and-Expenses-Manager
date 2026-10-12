'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ConflictSeverityBadge, ConflictStatusBadge } from '@/components/ui/Badges'
import { LoadingSpinner, EmptyState, AlertBanner, ModalDialog, ConfirmDialog } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { canClient } from '@/lib/auth-client'
import {
  AlertTriangle,
  Filter,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MapPin,
  Calendar,
  Info,
  X,
  RotateCcw,
  HelpCircle,
  Check,
} from 'lucide-react'

export interface ConflictRow {
  id: string
  eventAId: string
  eventBId: string
  conflictType: string
  severity: string
  overlapMinutes: number | null
  conflictScore: number | null
  description: string
  status: string
  resolutionNote: string | null
  createdAt: string
  eventA: {
    id: string
    title: string
    clubId: string
    eventType: string
    club: { name: string; code: string }
    venue: { name: string }
  }
  eventB: {
    id: string
    title: string
    clubId: string
    eventType: string
    club: { name: string; code: string }
    venue: { name: string }
  }
}

function ConflictsContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || ''
  const initialSeverity = searchParams.get('severity') || ''
  const initialType = searchParams.get('type') || searchParams.get('conflictType') || ''

  const { data: session } = useSession()
  const user = session?.user

  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [severityFilter, setSeverityFilter] = useState<string>(initialSeverity)
  const [typeFilter, setTypeFilter] = useState<string>(initialType)

  // Score guide accordion/toggle
  const [showScoreGuide, setShowScoreGuide] = useState(false)

  // Modals & Dialogs
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null)
  const [ackConflictId, setAckConflictId] = useState<string | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadConflicts = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (severityFilter) params.set('severity', severityFilter)
      if (typeFilter) params.set('conflictType', typeFilter)

      const res = await fetchApi<ConflictRow[]>(`/api/conflicts?${params.toString()}`)
      setConflicts(res.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conflict records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadConflicts()
    }
  }, [session, statusFilter, severityFilter, typeFilter])

  const handleAcknowledge = async () => {
    if (!ackConflictId) return
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/conflicts/${ackConflictId}/acknowledge`, { method: 'POST' })
      setSuccessMsg('Conflict marked as acknowledged.')
      setAckConflictId(null)
      await loadConflicts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!activeConflictId) return
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/conflicts/${activeConflictId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ note: noteInput.trim() || 'Resolved by authority' }),
      })
      setSuccessMsg('Conflict resolved successfully.')
      setResolveModalOpen(false)
      setNoteInput('')
      await loadConflicts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOverride = async () => {
    if (!activeConflictId) return
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/conflicts/${activeConflictId}/override`, {
        method: 'POST',
        body: JSON.stringify({ note: noteInput.trim() || 'Overridden by authority' }),
      })
      setSuccessMsg('Administrative conflict override recorded in audit trail.')
      setOverrideModalOpen(false)
      setNoteInput('')
      await loadConflicts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const hasActiveFilters = Boolean(statusFilter || severityFilter || typeFilter)

  const quickStatusTabs = [
    { label: 'All Conflicts', value: '' },
    { label: 'Open Issues', value: 'OPEN' },
    { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Overridden', value: 'OVERRIDDEN' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={[{ label: 'Conflicts Directory' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Conflict Detection Control Center
            </h1>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
              Core Adjudication
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review, evaluate, and adjudicate system-detected scheduling, venue, and audience overlaps.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowScoreGuide(!showScoreGuide)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>{showScoreGuide ? 'Hide Scoring Guide' : 'How Scoring Works'}</span>
        </button>
      </div>

      {/* Human Decision Principle Banner */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Human Decision Principle:</span>
          <p className="text-amber-900 leading-relaxed">
            The detection engine evaluates prospective overlaps across time, location, and target audience cohorts.
            It strictly alerts authorized coordinators without modifying or cancelling events automatically.
            All resolutions and overrides require explicit human confirmation and audit recording.
          </p>
        </div>
      </div>

      {/* Scoring Explanation Guide (Collapsible) */}
      {showScoreGuide && (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-2 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Conflict Score Reference (0–100 Scale)</span>
          </div>
          <p className="text-blue-900 leading-relaxed">
            Scores are computed from a weighted blend of venue overlap, audience batch clash, and time proximity:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
              <span className="font-bold text-rose-700 block mb-0.5">HIGH (&ge; 70)</span>
              <p className="text-[11px] text-slate-600">
                Direct physical venue collision or overlapping timeslot for identical audience cohorts. Immediate rescheduling required.
              </p>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
              <span className="font-bold text-amber-700 block mb-0.5">MEDIUM (40–69)</span>
              <p className="text-[11px] text-slate-600">
                Adjacent scheduling or overlapping sub-cohorts. Mutual organizer coordination advised before verification.
              </p>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
              <span className="font-bold text-emerald-700 block mb-0.5">LOW (&lt; 40)</span>
              <p className="text-[11px] text-slate-600">
                Tight venue turnaround buffer (&lt; 30 minutes) or minor demographic overlap. Informational warning.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {successMsg && (
        <AlertBanner type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
      )}

      {/* Quick Status Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px" aria-label="Quick Status Tabs">
          {quickStatusTabs.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Refine By:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="OVERRIDDEN">OVERRIDDEN</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="HIGH">HIGH (Score &ge; 70)</option>
            <option value="MEDIUM">MEDIUM (Score 40–69)</option>
            <option value="LOW">LOW (Score &lt; 40)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Conflict Types</option>
            <option value="VENUE">VENUE</option>
            <option value="AUDIENCE">AUDIENCE</option>
            <option value="TIME_OVERLAP">TIME_OVERLAP</option>
            <option value="TIGHT_TURNAROUND">TIGHT_TURNAROUND (&lt;30m)</option>
            <option value="ORGANIZER">ORGANIZER</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter('')
                setSeverityFilter('')
                setTypeFilter('')
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="hover:text-slate-900"
                  aria-label="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {severityFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Severity: {severityFilter}
                <button
                  type="button"
                  onClick={() => setSeverityFilter('')}
                  className="hover:text-slate-900"
                  aria-label="Remove severity filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Type: {typeFilter}
                <button
                  type="button"
                  onClick={() => setTypeFilter('')}
                  className="hover:text-slate-900"
                  aria-label="Remove type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Conflicts Table */}
      {loading ? (
        <LoadingSpinner message="Evaluating conflict records..." />
      ) : conflicts.length === 0 ? (
        <EmptyState
          title="No conflicts detected"
          description={
            hasActiveFilters
              ? 'No active conflict records matched your selected filters. Try clearing your filters.'
              : 'All schedule slots and venues are clear! The detection engine found zero overlapping bookings.'
          }
          icon={AlertTriangle}
          action={
            hasActiveFilters ? (
              <button
                onClick={() => {
                  setStatusFilter('')
                  setSeverityFilter('')
                  setTypeFilter('')
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event A (Subject)</th>
                  <th className="py-3 px-4">Event B (Conflict Partner)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Details & Resolution</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conflicts.map((c) => {
                  const canAck =
                    c.status === 'OPEN' &&
                    (user?.role === 'SUPER_ADMIN' ||
                      user?.role === 'ACM_CORE' ||
                      (user?.role === 'CLUB_REP' &&
                        (user.clubId === c.eventA?.clubId || user.clubId === c.eventB?.clubId)))
                  const canResolve =
                    c.status !== 'RESOLVED' &&
                    c.status !== 'OVERRIDDEN' &&
                    canClient(user?.role, 'RESOLVE_CONFLICT')
                  const canOverride =
                    c.status !== 'RESOLVED' &&
                    c.status !== 'OVERRIDDEN' &&
                    canClient(user?.role, 'OVERRIDE_CONFLICT')

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-[220px]">
                        <Link
                          href={`/events/${c.eventA?.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1 group line-clamp-1"
                          title={c.eventA?.title}
                        >
                          <span className="truncate">{c.eventA?.title || c.eventAId}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        </Link>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {c.eventA?.club?.code || c.eventA?.club?.name}
                          </span>
                          <span className="truncate flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5" />
                            {c.eventA?.venue?.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        <Link
                          href={`/events/${c.eventB?.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1 group line-clamp-1"
                          title={c.eventB?.title}
                        >
                          <span className="truncate">{c.eventB?.title || c.eventBId}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        </Link>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {c.eventB?.club?.code || c.eventB?.club?.name}
                          </span>
                          <span className="truncate flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5" />
                            {c.eventB?.venue?.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {c.conflictType}
                        </span>
                        {c.overlapMinutes !== null && c.overlapMinutes > 0 && (
                          <span className="block text-[10px] text-slate-400 mt-1">
                            {c.overlapMinutes} min overlap
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <ConflictSeverityBadge severity={c.severity} />
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {c.conflictScore !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span>{c.conflictScore}</span>
                            <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <ConflictStatusBadge status={c.status} />
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="line-clamp-2 text-[11px] text-slate-600 leading-snug">
                          {c.description}
                        </div>
                        {c.resolutionNote && (
                          <div className="text-[10px] text-emerald-800 font-medium mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Resolution: {c.resolutionNote}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canAck && (
                            <button
                              onClick={() => setAckConflictId(c.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Acknowledge conflict awareness"
                            >
                              Ack
                            </button>
                          )}
                          {canResolve && (
                            <button
                              onClick={() => {
                                setActiveConflictId(c.id)
                                setNoteInput('')
                                setResolveModalOpen(true)
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Mark resolved after schedule adjustment"
                            >
                              Resolve
                            </button>
                          )}
                          {canOverride && (
                            <button
                              onClick={() => {
                                setActiveConflictId(c.id)
                                setNoteInput('')
                                setOverrideModalOpen(true)
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Authorize coexistence with audit note"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {conflicts.length} conflict record(s)</span>
            <span className="text-[11px] text-slate-400">All adjudications are preserved in the system audit trail</span>
          </div>
        </div>
      )}

      {/* Acknowledge Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(ackConflictId)}
        title="Acknowledge Conflict Record"
        message="Acknowledging indicates that your team has reviewed this clash. The conflict will remain in ACKNOWLEDGED state until adjusted or formally resolved."
        confirmLabel="Acknowledge"
        cancelLabel="Cancel"
        isLoading={actionLoading}
        onConfirm={handleAcknowledge}
        onCancel={() => setAckConflictId(null)}
      />

      {/* Resolve Modal */}
      <ModalDialog
        isOpen={resolveModalOpen}
        title="Resolve Conflict Record"
        description="Provide a clear description of how the timing, room, or audience was adjusted to resolve this clash."
        onClose={() => setResolveModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resolution Audit Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Rescheduled timing with mutual consent of both club coordinators."
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setResolveModalOpen(false)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleResolve}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
            >
              {actionLoading ? 'Recording...' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Override Modal */}
      <ModalDialog
        isOpen={overrideModalOpen}
        title="Administrative Conflict Override"
        description="Authorize the coexistence of conflicting events. An explicit audit justification is required."
        onClose={() => setOverrideModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Override Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. ACM Core approved co-located parallel tracks for college annual tech symposium."
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setOverrideModalOpen(false)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleOverride}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
            >
              {actionLoading ? 'Recording...' : 'Confirm Override'}
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

export default function ConflictsPage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingSpinner message="Loading conflict directory..." />}>
        <ConflictsContent />
      </Suspense>
    </AppShell>
  )
}
