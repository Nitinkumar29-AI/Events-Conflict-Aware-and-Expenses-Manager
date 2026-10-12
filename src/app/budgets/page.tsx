'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { fetchApi } from '@/lib/api'
import { LoadingSpinner, AlertBanner, ModalDialog } from '@/components/ui/Feedback'
import {
  Wallet,
  Landmark,
  PieChart,
  AlertTriangle,
  PlusCircle,
  Trash2,
  Calendar,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  Lock,
} from 'lucide-react'

type Semester = { id: string; name: string; isLocked: boolean }
type Category = { id: string; name: string; description: string }

type BudgetSummary = {
  semester: { id: string; name: string; isLocked: boolean }
  totalBudget: string
  totalAllocated: string
  unallocatedBudget: string
  totalSpent: string
  remainingOverall: string
  utilizationPercentage: number
  semesterOverspent: boolean
  categoryBreakdown: Array<{
    id: string
    categoryId: string
    categoryName: string
    clubId: string | null
    clubName: string | null
    allocatedAmount: string
    spentAmount: string
    remainingAmount: string
    utilizationPercentage: number
    overspent: boolean
  }>
  monthlyBreakdown: Array<{
    month: string
    amount: string
  }>
}

export default function BudgetsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role

  const [semesters, setSemesters] = useState<Semester[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('')
  const [summary, setSummary] = useState<BudgetSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allocation Form Modal
  const [showAllocForm, setShowAllocForm] = useState(false)
  const [newAllocCat, setNewAllocCat] = useState('')
  const [newAllocAmount, setNewAllocAmount] = useState('')
  const [newAllocNotes, setNewAllocNotes] = useState('')
  const [submittingAlloc, setSubmittingAlloc] = useState(false)

  useEffect(() => {
    if (!role) return
    if (role === 'VIEWER' || role === 'CLUB_REP') {
      router.replace('/dashboard')
      return
    }

    const loadMeta = async () => {
      try {
        const res = await fetchApi<any>('/api/meta')
        const data = res.data
        setSemesters(data.semesters || [])
        setCategories(data.categories || [])
        if (data.semesters && data.semesters.length > 0) {
          setSelectedSemesterId(data.semesters[0].id)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadMeta()
  }, [role, router])

  useEffect(() => {
    if (!selectedSemesterId) return

    const loadSummary = async () => {
      setSummaryLoading(true)
      try {
        const res = await fetchApi<any>(`/api/budgets/${selectedSemesterId}/summary`)
        setSummary(res.data)
      } catch (err: any) {
        setError(err.message)
        setSummary(null)
      } finally {
        setSummaryLoading(false)
      }
    }
    loadSummary()
  }, [selectedSemesterId])

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingAlloc(true)
    try {
      await fetchApi('/api/budgets/allocations', {
        method: 'POST',
        body: JSON.stringify({
          semesterId: selectedSemesterId,
          categoryId: newAllocCat,
          allocatedAmount: newAllocAmount,
          notes: newAllocNotes,
        }),
      })

      // Reload summary
      const res = await fetchApi<any>(`/api/budgets/${selectedSemesterId}/summary`)
      setSummary(res.data)
      setShowAllocForm(false)
      setNewAllocCat('')
      setNewAllocAmount('')
      setNewAllocNotes('')
    } catch (err: any) {
      alert(`Error creating allocation: ${err.message}`)
    } finally {
      setSubmittingAlloc(false)
    }
  }

  const handleDeleteAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return
    try {
      await fetchApi(`/api/budgets/allocations/${id}`, { method: 'DELETE' })
      const res = await fetchApi<any>(`/api/budgets/${selectedSemesterId}/summary`)
      setSummary(res.data)
    } catch (err: any) {
      alert(`Error deleting allocation: ${err.message}`)
    }
  }

  const canManage = role === 'SUPER_ADMIN' || role === 'ACM_CORE'

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="w-6 h-6 text-indigo-600" />
              Budget Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Institutional allocations, semester envelopes, category limits, and utilization metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {semesters.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  aria-label="Select Semester"
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isLocked ? '(Locked)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canManage && summary && !summary.semester.isLocked && (
              <button
                type="button"
                onClick={() => setShowAllocForm(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                New Allocation
              </button>
            )}
          </div>
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        {loading && !semesters.length ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Loading budget records..." />
          </div>
        ) : summaryLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="md" message="Refreshing semester financial summary..." />
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Semester locked warning banner if applicable */}
            {summary.semester.isLocked && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Semester Locked:</strong> Budget allocations and modifications are disabled for this term.
                </span>
              </div>
            )}

            {/* Overspent warning banner if applicable */}
            {summary.semesterOverspent && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Deficit Alert:</strong> Actual spending exceeds total allocated or available envelope for this semester!
                </span>
              </div>
            )}

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Total Envelope</span>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">₹{summary.totalBudget}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Semester ceiling</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Total Allocated</span>
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">₹{summary.totalAllocated}</div>
                <div className="text-xs text-slate-500 mt-1">Unallocated: ₹{summary.unallocatedBudget}</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Total Spent</span>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">₹{summary.totalSpent}</div>
                <div className="text-xs text-slate-500 mt-1">{summary.utilizationPercentage}% of envelope</div>
              </div>

              <div
                className={`p-5 rounded-xl border shadow-2xs ${
                  summary.semesterOverspent
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                  <span className={summary.semesterOverspent ? 'text-rose-700' : 'text-slate-500'}>
                    Remaining Balance
                  </span>
                  <div
                    className={`p-2 rounded-lg ${
                      summary.semesterOverspent
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {summary.semesterOverspent ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold mt-2 ${
                    summary.semesterOverspent ? 'text-rose-700' : 'text-slate-900'
                  }`}
                >
                  ₹{summary.remainingOverall}
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      summary.semesterOverspent
                        ? 'bg-rose-600'
                        : summary.utilizationPercentage > 85
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, summary.utilizationPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Category Allocations & Utilization</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Breakdown of dedicated envelopes versus approved expenditures by budget category.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Category</th>
                      <th className="py-3 px-5 text-right">Allocated (₹)</th>
                      <th className="py-3 px-5 text-right">Spent (₹)</th>
                      <th className="py-3 px-5 text-right">Remaining (₹)</th>
                      <th className="py-3 px-5">Utilization</th>
                      {canManage && <th className="py-3 px-5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {summary.categoryBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 6 : 5} className="py-8 text-center text-slate-400">
                          No category allocations found for this semester.
                        </td>
                      </tr>
                    ) : (
                      summary.categoryBreakdown.map((c) => (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            c.id.startsWith('unallocated') ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{c.categoryName}</span>
                              {c.id.startsWith('unallocated') && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded-sm">
                                  Unallocated
                                </span>
                              )}
                              {c.clubName && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded-sm">
                                  {c.clubName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right tabular-nums font-medium text-slate-800">
                            ₹{c.allocatedAmount}
                          </td>
                          <td className="py-3 px-5 text-right tabular-nums font-medium text-slate-800">
                            ₹{c.spentAmount}
                          </td>
                          <td
                            className={`py-3 px-5 text-right tabular-nums font-semibold ${
                              c.overspent ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            ₹{c.remainingAmount}
                          </td>
                          <td className="py-3 px-5">
                            <div className="w-36 flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    c.overspent
                                      ? 'bg-rose-500'
                                      : c.utilizationPercentage > 85
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-600'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, c.utilizationPercentage)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                                  c.overspent ? 'text-rose-600' : 'text-slate-600'
                                }`}
                              >
                                {c.overspent ? (
                                  <span className="inline-flex items-center gap-0.5 text-rose-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    {c.utilizationPercentage}%
                                  </span>
                                ) : (
                                  `${c.utilizationPercentage}%`
                                )}
                              </span>
                            </div>
                          </td>
                          {canManage && (
                            <td className="py-3 px-5 text-right">
                              {!c.id.startsWith('unallocated') && !summary.semester.isLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAllocation(c.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-sm transition-colors"
                                  title="Delete Allocation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Expenditure Cards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Monthly Expenditure Run-rate</h2>
              <p className="text-xs text-slate-500 mb-4">
                Approved expenditure distribution recorded across active calendar months.
              </p>

              {summary.monthlyBreakdown.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No approved expenses recorded for this semester yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {summary.monthlyBreakdown.map((m) => (
                    <div
                      key={m.month}
                      className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {m.month}
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                        ₹{m.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Create Allocation Modal */}
        {showAllocForm && (
          <ModalDialog
            isOpen={showAllocForm}
            onClose={() => setShowAllocForm(false)}
            title="Create Budget Allocation"
          >
            <form onSubmit={handleCreateAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Category
                </label>
                <select
                  required
                  value={newAllocCat}
                  onChange={(e) => setNewAllocCat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocated Amount (₹)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 25000.00"
                  value={newAllocAmount}
                  onChange={(e) => setNewAllocAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Justification (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual guest speaker honoraria envelope"
                  value={newAllocNotes}
                  onChange={(e) => setNewAllocNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocForm(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAlloc}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingAlloc ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </ModalDialog>
        )}
      </div>
    </AppShell>
  )
}
