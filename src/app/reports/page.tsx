'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { fetchApi } from '@/lib/api'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  Receipt,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Building,
  Users,
  ShieldAlert,
  Wallet,
  Info,
} from 'lucide-react'

export default function ReportsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role

  const [activeTab, setActiveTab] = useState<'events' | 'conflicts' | 'financial' | 'trends'>('events')

  // Semesters for filter
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('')

  // Report states
  const [eventReport, setEventReport] = useState<any>(null)
  const [conflictReport, setConflictReport] = useState<any>(null)
  const [financialReport, setFinancialReport] = useState<any>(null)
  const [trendReport, setTrendReport] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (role === 'VIEWER') {
      router.push('/dashboard')
    }
  }, [role, router])

  // Load available semesters
  useEffect(() => {
    if (!session?.user) return
    fetchApi<any[]>('/api/meta?type=semesters')
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setSemesters(res.data)
        }
      })
      .catch(() => {
        // Fallback: leave empty
      })
  }, [session])

  // Load Report Data
  const loadActiveReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const semParam = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : ''

      if (activeTab === 'events') {
        const res = await fetchApi<any>(`/api/reports/events${semParam}`)
        setEventReport(res.data)
      } else if (activeTab === 'conflicts') {
        const res = await fetchApi<any>(`/api/reports/conflicts${semParam}`)
        setConflictReport(res.data)
      } else if (activeTab === 'financial') {
        const res = await fetchApi<any>(`/api/reports/financial${semParam}`)
        setFinancialReport(res.data)
      } else if (activeTab === 'trends') {
        const res = await fetchApi<any>(`/api/reports/trends?months=6`)
        setTrendReport(res.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user || role === 'VIEWER') return
    loadActiveReport()
  }, [activeTab, selectedSemesterId, session, role])

  // CSV Export handler
  const handleExportCsv = async (type: 'events' | 'conflicts' | 'financial') => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('type', type)
      if (selectedSemesterId) params.set('semesterId', selectedSemesterId)

      const url = `/api/reports/export?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error?.message || 'Failed to export CSV')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const disposition = response.headers.get('Content-Disposition')
      let filename = `${type}-report.csv`
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '')
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      alert(err.message || 'Export error')
    } finally {
      setExporting(false)
    }
  }

  const exportType = activeTab === 'trends' ? 'events' : activeTab

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs items={[{ label: 'Institutional Reports & Analytics' }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Institutional Reports & Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative institutional outcomes, conflict patterns, financial audits, and multi-month trends.
            </p>
          </div>

          {/* Global Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExportCsv(exportType as any)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
              title={`Export ${exportType.toUpperCase()} dataset as audit-compliant CSV`}
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : `Export ${exportType.toUpperCase()} CSV`}</span>
            </button>
          </div>
        </div>

        {/* Audit & Compliance Export Notice */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-indigo-900">Compliance & Audit Data Exports:</span>
            <p className="text-indigo-900 leading-relaxed">
              CSV downloads compile verified ledger entries, exact timestamps, and reviewer audit trails suitable for faculty oversight and internal financial review.
            </p>
          </div>
        </div>

        {/* Tabs & Semester Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 gap-4">
          <div className="flex gap-6 overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'events'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'conflicts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Conflict Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'financial'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Financial Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'trends'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Monthly Trends</span>
            </button>
          </div>

          {activeTab !== 'trends' && semesters.length > 0 && (
            <div className="pb-2">
              <select
                aria-label="Filter by Semester"
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer font-medium"
              >
                <option value="">All Semesters / Active</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isLocked ? '(Locked)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Computing authoritative report aggregates..." />
          </div>
        ) : (
          <>
            {/* ================= EVENTS REPORT ================= */}
            {activeTab === 'events' && eventReport && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Events
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {eventReport.totalEvents}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Recorded submissions</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Verified / Completed
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mt-2">
                      {(eventReport.statusBreakdown?.VERIFIED || 0) +
                        (eventReport.statusBreakdown?.COMPLETED || 0)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Confirmed delivery</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Cancelled / Rejected
                    </div>
                    <div className="text-2xl font-bold text-rose-600 mt-2">
                      {(eventReport.statusBreakdown?.CANCELLED || 0) +
                        (eventReport.statusBreakdown?.REJECTED || 0)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Failed validation</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Expected Attendees
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">
                      {eventReport.attendance?.totalExpectedAttendees || 0}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Projected total reach</div>
                  </div>
                </div>

                {/* Status Breakdown & Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Status Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(eventReport.statusBreakdown || {}).map(([st, cnt]: any) => (
                        <div
                          key={st}
                          className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <span className="font-medium text-slate-700">{st}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {cnt}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Event Type Distribution</h3>
                    <div className="space-y-2">
                      {eventReport.categoryBreakdown?.map((cat: any) => (
                        <div
                          key={cat.eventType}
                          className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <span className="font-medium text-slate-700">{cat.eventType}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Club Distribution Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Distribution by Club</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] font-semibold text-slate-500 tracking-wider">
                        <tr>
                          <th className="py-2.5 px-5">Club Name</th>
                          <th className="py-2.5 px-5">Code</th>
                          <th className="py-2.5 px-5 text-right">Event Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventReport.clubBreakdown?.map((c: any) => (
                          <tr key={c.clubId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-5 font-semibold text-slate-900">
                              {c.clubName}
                            </td>
                            <td className="py-2.5 px-5 text-slate-500 font-mono text-[11px]">
                              {c.clubCode}
                            </td>
                            <td className="py-2.5 px-5 text-right font-semibold text-slate-900 tabular-nums">
                              {c.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= CONFLICTS REPORT ================= */}
            {activeTab === 'conflicts' && conflictReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Conflicts
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {conflictReport.totalConflicts}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Detected clashes</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      High Severity
                    </div>
                    <div className="text-2xl font-bold text-rose-600 mt-2">
                      {conflictReport.severityBreakdown?.HIGH || 0}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Blocking issues</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Resolved / Overridden
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mt-2">
                      {(conflictReport.statusBreakdown?.RESOLVED || 0) +
                        (conflictReport.statusBreakdown?.OVERRIDDEN || 0)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Addressed by human core</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Avg Conflict Score
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">
                      {conflictReport.averageConflictScore ?? 'N/A'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Collision density metric</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                    <h3 className="font-bold text-slate-900 text-sm">Conflict Types</h3>
                    {Object.entries(conflictReport.typeBreakdown || {}).map(([tp, cnt]: any) => (
                      <div
                        key={tp}
                        className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700">{tp}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{cnt}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                    <h3 className="font-bold text-slate-900 text-sm">Severity Breakdown</h3>
                    {Object.entries(conflictReport.severityBreakdown || {}).map(
                      ([sev, cnt]: any) => (
                        <div
                          key={sev}
                          className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <span className="font-medium text-slate-700">{sev}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{cnt}</span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                    <h3 className="font-bold text-slate-900 text-sm">Resolution Status</h3>
                    {Object.entries(conflictReport.statusBreakdown || {}).map(([st, cnt]: any) => (
                      <div
                        key={st}
                        className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700">{st}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= FINANCIAL REPORT ================= */}
            {activeTab === 'financial' && financialReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Envelope
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-2 tabular-nums">
                      {financialReport.totalBudget !== null
                        ? `₹${financialReport.totalBudget}`
                        : 'N/A (Institutional)'}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Allocated
                    </div>
                    <div className="text-xl font-bold text-indigo-600 mt-2 tabular-nums">
                      ₹{financialReport.totalAllocated}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Unallocated
                    </div>
                    <div className="text-xl font-bold text-slate-700 mt-2 tabular-nums">
                      {financialReport.unallocatedBudget !== null
                        ? `₹${financialReport.unallocatedBudget}`
                        : 'N/A (Institutional)'}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Approved Spent
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-2 tabular-nums">
                      ₹{financialReport.totalSpent}
                    </div>
                  </div>

                  <div
                    className={`border rounded-xl p-5 shadow-2xs ${
                      financialReport.semesterOverspent
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider">
                      <span
                        className={
                          financialReport.semesterOverspent ? 'text-rose-700' : 'text-slate-500'
                        }
                      >
                        Remaining
                      </span>
                    </div>
                    <div
                      className={`text-xl font-bold mt-2 tabular-nums ${
                        financialReport.semesterOverspent ? 'text-rose-700' : 'text-emerald-600'
                      }`}
                    >
                      ₹{financialReport.remainingBudget}
                    </div>
                  </div>
                </div>

                {/* Category Breakdown Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Category Budget Utilization
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] font-semibold text-slate-500 tracking-wider">
                        <tr>
                          <th className="py-2.5 px-5">Category</th>
                          <th className="py-2.5 px-5">Club Scope</th>
                          <th className="py-2.5 px-5 text-right">Allocated</th>
                          <th className="py-2.5 px-5 text-right">Approved Spent</th>
                          <th className="py-2.5 px-5 text-right">Remaining</th>
                          <th className="py-2.5 px-5 text-right">Utilization</th>
                          <th className="py-2.5 px-5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financialReport.categoryBreakdown?.map((cat: any) => (
                          <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-5 font-semibold text-slate-900">
                              {cat.categoryName}
                            </td>
                            <td className="py-2.5 px-5 text-slate-500">
                              {cat.clubName || 'Institutional'}
                            </td>
                            <td className="py-2.5 px-5 text-right font-medium text-slate-800 tabular-nums">
                              ₹{cat.allocatedAmount}
                            </td>
                            <td className="py-2.5 px-5 text-right font-medium text-slate-800 tabular-nums">
                              ₹{cat.spentAmount}
                            </td>
                            <td
                              className={`py-2.5 px-5 text-right font-semibold tabular-nums ${
                                cat.overspent ? 'text-rose-600' : 'text-slate-900'
                              }`}
                            >
                              ₹{cat.remainingAmount}
                            </td>
                            <td className="py-2.5 px-5 text-right tabular-nums text-slate-600">
                              {cat.utilizationPercentage !== null &&
                              cat.utilizationPercentage !== undefined
                                ? `${cat.utilizationPercentage}%`
                                : 'N/A'}
                            </td>
                            <td className="py-2.5 px-5 text-center">
                              {cat.isUnallocated ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                  UNALLOCATED
                                </span>
                              ) : cat.overspent ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                                  OVERSPENT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                  ON TRACK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TRENDS REPORT ================= */}
            {activeTab === 'trends' && trendReport && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Past 6 Months Activity Trends</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Multi-month timeline tracking volume of events, detected conflicts, and verified expenditure.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendReport.trends?.map((t: any) => (
                    <div
                      key={t.month}
                      className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3"
                    >
                      <div className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex justify-between items-center">
                        <span>{t.month}</span>
                        <span className="text-xs text-indigo-600 font-semibold tabular-nums">
                          ₹{t.approvedSpending} spent
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Events Hosted:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {t.eventsCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Conflicts Detected:</span>
                        <span className="font-semibold text-amber-700 tabular-nums">
                          {t.conflictsCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
