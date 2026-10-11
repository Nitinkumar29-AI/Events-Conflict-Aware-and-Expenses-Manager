'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
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
        // Fallback: load semesters from /api/calendar or leave empty
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Institutional Reports & Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Authoritative institutional outcomes, conflict patterns, and financial audits.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={exporting}
            onClick={() => handleExportCsv(activeTab === 'trends' ? 'events' : (activeTab as any))}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : `Export ${activeTab.toUpperCase()} CSV`}
          </button>
        </div>
      </div>

      {/* Tabs & Semester Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'events'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Events Report
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'conflicts'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Conflict Report
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'financial'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Financial Report
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'trends'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Monthly Trends
          </button>
        </div>

        {activeTab !== 'trends' && semesters.length > 0 && (
          <div className="pb-2">
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-400">Computing authoritative report...</div>
      ) : (
        <>
          {/* ================= EVENTS REPORT ================= */}
          {activeTab === 'events' && eventReport && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Total Events</div>
                  <div className="text-2xl font-bold text-white mt-1">{eventReport.totalEvents}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Verified / Completed</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {(eventReport.statusBreakdown?.VERIFIED || 0) + (eventReport.statusBreakdown?.COMPLETED || 0)}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Cancelled / Rejected</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">
                    {(eventReport.statusBreakdown?.CANCELLED || 0) + (eventReport.statusBreakdown?.REJECTED || 0)}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Expected Attendees</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">
                    {eventReport.attendance?.totalExpectedAttendees || 0}
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Status Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(eventReport.statusBreakdown || {}).map(([st, cnt]: any) => (
                      <div key={st} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">{st}</span>
                        <span className="font-mono font-medium text-white px-2 py-0.5 bg-zinc-800 rounded">
                          {cnt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Category / Event Type Breakdown</h3>
                  <div className="space-y-2">
                    {eventReport.categoryBreakdown?.map((cat: any) => (
                      <div key={cat.eventType} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">{cat.eventType}</span>
                        <span className="font-mono font-medium text-white px-2 py-0.5 bg-zinc-800 rounded">
                          {cat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Club Distribution Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                <h3 className="font-semibold text-white text-sm">Distribution by Club</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-800/60 uppercase text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-4">Club Name</th>
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4 text-right">Event Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {eventReport.clubBreakdown?.map((c: any) => (
                        <tr key={c.clubId}>
                          <td className="py-2.5 px-4 text-white font-medium">{c.clubName}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{c.clubCode}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-white">{c.count}</td>
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Total Logged Conflicts</div>
                  <div className="text-2xl font-bold text-white mt-1">{conflictReport.totalConflicts}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">High Severity</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">
                    {conflictReport.severityBreakdown?.HIGH || 0}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Resolved / Overridden</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {(conflictReport.statusBreakdown?.RESOLVED || 0) + (conflictReport.statusBreakdown?.OVERRIDDEN || 0)}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Avg Conflict Score</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">
                    {conflictReport.averageConflictScore ?? 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                  <h3 className="font-semibold text-white text-sm">Conflict Types</h3>
                  {Object.entries(conflictReport.typeBreakdown || {}).map(([tp, cnt]: any) => (
                    <div key={tp} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">{tp}</span>
                      <span className="font-mono text-white px-2 py-0.5 bg-zinc-800 rounded">{cnt}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                  <h3 className="font-semibold text-white text-sm">Severity Breakdown</h3>
                  {Object.entries(conflictReport.severityBreakdown || {}).map(([sev, cnt]: any) => (
                    <div key={sev} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">{sev}</span>
                      <span className="font-mono text-white px-2 py-0.5 bg-zinc-800 rounded">{cnt}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                  <h3 className="font-semibold text-white text-sm">Resolution Status</h3>
                  {Object.entries(conflictReport.statusBreakdown || {}).map(([st, cnt]: any) => (
                    <div key={st} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">{st}</span>
                      <span className="font-mono text-white px-2 py-0.5 bg-zinc-800 rounded">{cnt}</span>
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Total Semester Budget</div>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {financialReport.totalBudget !== null ? `₹${financialReport.totalBudget}` : 'N/A (Institutional)'}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Total Allocated</div>
                  <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">
                    ₹{financialReport.totalAllocated}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Unallocated Budget</div>
                  <div className="text-xl font-bold text-zinc-300 mt-1 font-mono">
                    {financialReport.unallocatedBudget !== null ? `₹${financialReport.unallocatedBudget}` : 'N/A (Institutional)'}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Approved Spending</div>
                  <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    ₹{financialReport.totalSpent}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400">Remaining Budget</div>
                  <div
                    className={`text-xl font-bold mt-1 font-mono ${
                      financialReport.semesterOverspent ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    ₹{financialReport.remainingBudget}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                <h3 className="font-semibold text-white text-sm">Category Budget Utilization</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-800/60 uppercase text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Club Scope</th>
                        <th className="py-2.5 px-4 text-right">Allocated</th>
                        <th className="py-2.5 px-4 text-right">Approved Spent</th>
                        <th className="py-2.5 px-4 text-right">Remaining</th>
                        <th className="py-2.5 px-4 text-right">Utilization</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {financialReport.categoryBreakdown?.map((cat: any) => (
                        <tr key={cat.id}>
                          <td className="py-2.5 px-4 text-white font-medium">{cat.categoryName}</td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            {cat.clubName || 'Institutional'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-zinc-300">
                            ₹{cat.allocatedAmount}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-amber-400">
                            ₹{cat.spentAmount}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono ${
                              cat.overspent ? 'text-red-400 font-bold' : 'text-emerald-400'
                            }`}
                          >
                            ₹{cat.remainingAmount}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-zinc-300">
                            {cat.utilizationPercentage !== null && cat.utilizationPercentage !== undefined
                              ? `${cat.utilizationPercentage}%`
                              : 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {cat.isUnallocated ? (
                              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">
                                UNALLOCATED
                              </span>
                            ) : cat.overspent ? (
                              <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px]">
                                OVERSPENT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
              <h3 className="font-semibold text-white text-base">Past 6 Months Activity Trends</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendReport.trends?.map((t: any) => (
                  <div key={t.month} className="p-4 bg-zinc-800/40 border border-zinc-700/60 rounded-lg space-y-2">
                    <div className="text-sm font-bold text-white border-b border-zinc-700/60 pb-1.5 flex justify-between">
                      <span>{t.month}</span>
                      <span className="text-xs text-indigo-400 font-mono">₹{t.approvedSpending} spent</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Events Hosted:</span>
                      <span className="font-mono text-white font-medium">{t.eventsCount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Conflicts Detected:</span>
                      <span className="font-mono text-amber-400 font-medium">{t.conflictsCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
