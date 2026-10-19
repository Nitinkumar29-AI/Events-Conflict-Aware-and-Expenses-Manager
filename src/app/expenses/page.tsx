'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ExpenseStatusBadge } from '@/components/ui/Badges'
import { LoadingSpinner, EmptyState, AlertBanner } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { canClient } from '@/lib/auth-client'
import { PlusCircle, Filter, Eye, Receipt, Calendar, IndianRupee, X, RotateCcw } from 'lucide-react'

export interface ExpenseListItem {
  id: string
  title: string
  description: string | null
  amount: string
  date: string
  status: string
  clubId: string
  semesterId: string
  categoryId: string
  club: { id: string; name: string; code: string }
  category: { id: string; name: string }
  semester: { id: string; name: string; isLocked: boolean }
}

function ExpensesContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  const { data: session } = useSession()
  const user = session?.user

  const [expenses, setExpenses] = useState<ExpenseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)

  const loadExpenses = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '50')

      const res = await fetchApi<ExpenseListItem[]>(`/api/expenses?${params.toString()}`)
      setExpenses(res.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expense records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      if (user?.role === 'VIEWER' || user?.role === 'MEMBER') {
        setError('Viewers do not have permission to inspect expense ledgers.')
        setLoading(false)
      } else {
        loadExpenses()
      }
    }
  }, [session, statusFilter])

  const canCreate = canClient(user?.role, 'CREATE_EXPENSE')

  const formatCurrency = (amt: string) => {
    try {
      const num = parseFloat(amt)
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(num)
    } catch {
      return `₹${amt}`
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  const quickStatusTabs = [
    { label: 'All Expenses', value: '' },
    { label: 'Pending Review', value: 'SUBMITTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Drafts', value: 'DRAFT' },
    { label: 'Reimbursed', value: 'REIMBURSED' },
  ]

  const hasActiveFilters = Boolean(statusFilter)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={[{ label: 'Expenses Directory' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Expense Management
            </h1>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              Audited Ledgers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit-logged financial disbursements bound to Decimal(12,2) and semester allocation limits.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Expense</span>
          </Link>
        )}
      </div>

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

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
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
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
            <span>Refine Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="REIMBURSED">REIMBURSED</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => setStatusFilter('')}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active filter:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Status: {statusFilter}
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className="hover:text-emerald-900"
                aria-label="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      {loading ? (
        <LoadingSpinner message="Loading financial ledgers..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description={
            hasActiveFilters
              ? 'No expense transactions matched your filter. Try selecting All Statuses.'
              : 'No expense records found. Submit your first expenditure to begin tracking disbursements.'
          }
          icon={Receipt}
          action={
            hasActiveFilters ? (
              <button
                onClick={() => setStatusFilter('')}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            ) : canCreate ? (
              <Link
                href="/expenses/new"
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Record First Expense
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
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Club</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/expenses/${exp.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-600 line-clamp-1"
                      >
                        {exp.title}
                      </Link>
                      {exp.description && (
                        <span className="text-[11px] text-slate-400 line-clamp-1 block mt-0.5">
                          {exp.description}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {exp.category?.name}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {exp.club?.name} ({exp.club?.code})
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {formatDate(exp.date)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-600">
                        {exp.semester?.name}
                        {exp.semester?.isLocked && (
                          <span className="ml-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                            LOCKED
                          </span>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <ExpenseStatusBadge status={exp.status} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/expenses/${exp.id}`}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 inline-flex items-center gap-1 text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {expenses.length} expense record(s)</span>
            <span className="text-[11px] text-slate-400">Strictly adheres to allocated semester budget caps</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingSpinner message="Loading expense directory..." />}>
        <ExpensesContent />
      </Suspense>
    </AppShell>
  )
}
