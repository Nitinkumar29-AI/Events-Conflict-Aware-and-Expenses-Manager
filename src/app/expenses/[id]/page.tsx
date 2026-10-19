'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ExpenseStatusBadge, RoleBadge } from '@/components/ui/Badges'
import { LoadingSpinner, EmptyState, AlertBanner, ModalDialog, ConfirmDialog } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { canClient, canManageClubResource } from '@/lib/auth-client'
import {
  Receipt as ReceiptIcon,
  Calendar,
  Building,
  Tag,
  IndianRupee,
  Lock,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  Upload,
  FileText,
  ExternalLink,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle,
} from 'lucide-react'

export interface ReceiptItem {
  id: string
  expenseId: string
  fileUrl: string
  storagePublicId: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  sha256: string
  createdAt: string
  uploadedByUserId: string
}

export interface ExpenseDetail {
  id: string
  title: string
  description: string | null
  amount: string
  date: string
  status: string
  clubId: string
  semesterId: string
  categoryId: string
  eventId: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  club: { id: string; name: string; code: string }
  category: { id: string; name: string }
  semester: { id: string; name: string; isLocked: boolean }
  event: { id: string; title: string } | null
  createdBy: { id: string; name: string; email: string }
  reviewedBy: { id: string; name: string; email: string } | null
  receipts: ReceiptItem[]
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const expenseId = resolvedParams.id

  const { data: session } = useSession()
  const user = session?.user

  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Confirmation dialogs
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchApi<ExpenseDetail>(`/api/expenses/${expenseId}`)
      setExpense(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load expense details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session, expenseId])

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

  const handleSubmitExpense = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/expenses/${expenseId}/submit`, { method: 'POST' })
      setSuccessMsg('Expense submitted for review successfully.')
      setConfirmSubmitOpen(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveExpense = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/expenses/${expenseId}/approve`, { method: 'POST' })
      setSuccessMsg('Expense approved and ledger updated.')
      setConfirmApproveOpen(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectExpense = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason.')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/expenses/${expenseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      })
      setSuccessMsg('Expense has been rejected.')
      setRejectModalOpen(false)
      setRejectReason('')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteExpense = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await fetchApi(`/api/expenses/${expenseId}`, { method: 'DELETE' })
      router.push('/expenses')
    } catch (err: any) {
      setError(err.message)
      setActionLoading(false)
      setConfirmDeleteOpen(false)
    }
  }

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('Receipt exceeds the 5MB file size limit.')
      return
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file format. Only JPEG, PNG, and PDF files are permitted.')
      return
    }

    setUploadingReceipt(true)
    setError(null)
    setSuccessMsg(null)

    try {
        const formData = new FormData()
        formData.set('file', file)
        await fetchApi(`/api/expenses/${expenseId}/receipts`, {
          method: 'POST',
          body: formData,
        })

      setSuccessMsg(`Receipt "${file.name}" added successfully.`)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt.')
    } finally {
      setUploadingReceipt(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingSpinner message="Loading expense ledger..." />
      </AppShell>
    )
  }

  if (!expense) {
    return (
      <AppShell>
        <EmptyState
          title="Expense Not Found"
          description="The requested expense ledger entry does not exist or you lack permission to view it."
          icon={ReceiptIcon}
        />
      </AppShell>
    )
  }

  // Zero-trust creator & RBAC permissions evaluation
  const isCreator = Boolean(user?.id && expense.createdBy?.id && user.id === expense.createdBy.id)
  const isCoreOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACM_CORE'
  const isSemesterLocked = expense.semester?.isLocked

  // Creator-only actions: Submitting draft and uploading proof receipts
  const canSubmit = isCreator && expense.status === 'DRAFT' && !isSemesterLocked
  const canAddReceipt =
    isCreator &&
    (expense.status === 'DRAFT' || expense.status === 'REJECTED') &&
    !isSemesterLocked

  // Deletion: Allowed for the creator or institutional admins on unapproved expenses
  const canDelete =
    (isCreator || isCoreOrAdmin) &&
    (expense.status === 'DRAFT' || expense.status === 'REJECTED') &&
    !isSemesterLocked

  // Administrative moderation actions: Preserved for authorized institutional authorities
  const canApprove =
    expense.status === 'SUBMITTED' && canClient(user?.role, 'APPROVE_EXPENSE') && !isSemesterLocked
  const canReject =
    expense.status === 'SUBMITTED' && canClient(user?.role, 'REJECT_EXPENSE') && !isSemesterLocked

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Expenses Directory', href: '/expenses' },
            { label: expense.title },
          ]}
        />

        {/* Lifecycle Guide Banner */}
        {expense.status === 'DRAFT' && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Next Step: Attach Receipts & Submit</span>
              <p className="text-amber-900 leading-relaxed">
                This expense is currently in DRAFT status. Make sure you upload all necessary invoice/receipt documents
                below, then click <strong>Submit for Approval</strong> to send it to ACM Core for verification.
              </p>
            </div>
          </div>
        )}

        {expense.status === 'SUBMITTED' && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Under Review by ACM Core</span>
              <p className="text-blue-900 leading-relaxed">
                This expense has been submitted and is currently in the verification queue. Reviewers will verify
                the receipts and allocate disbursements according to semester budget limits.
              </p>
            </div>
          </div>
        )}

        {expense.status === 'APPROVED' && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Approved Expenditure</span>
              <p className="text-emerald-900 leading-relaxed">
                This expense has been approved by ACM Core authority and charged against the category allocation.
              </p>
            </div>
          </div>
        )}

        {/* Main Header Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {expense.title}
                </h1>
                <ExpenseStatusBadge status={expense.status} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">Expense ID: {expense.id}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {canSubmit && (
                <button
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              )}

              {canApprove && (
                <button
                  onClick={() => setConfirmApproveOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Expense
                </button>
              )}

              {canReject && (
                <button
                  onClick={() => {
                    setRejectReason('')
                    setRejectModalOpen(true)
                  }}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Expense
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold border border-rose-200 transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Locked Semester Notification */}
          {isSemesterLocked && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-2.5 font-medium">
              <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                Academic Semester ({expense.semester?.name}) is currently locked. This expense entry is immutable.
              </span>
            </div>
          )}

          {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
          {successMsg && (
            <AlertBanner type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
          )}

          {expense.rejectionReason && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <span className="font-bold">Rejection Audit Reason:</span> {expense.rejectionReason}
            </div>
          )}
        </div>

        {/* Expense Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4 text-emerald-600" />
              Financial Information
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Disbursement Amount:</span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Category:</span>
                <span className="font-semibold text-slate-800">{expense.category?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Organizing Club:</span>
                <span className="font-semibold text-slate-800">
                  {expense.club?.name} ({expense.club?.code})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Semester:</span>
                <span className="font-semibold text-slate-800">
                  {expense.semester?.name}{' '}
                  {expense.semester?.isLocked && (
                    <span className="text-rose-600 font-bold ml-1 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[LOCKED]</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Transaction Date:</span>
                <span className="font-mono text-slate-800 font-medium">{formatDate(expense.date)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-medium">Linked Event:</span>
                {expense.event ? (
                  <Link
                    href={`/events/${expense.event.id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {expense.event.title}
                  </Link>
                ) : (
                  <span className="text-slate-400 italic">General Club Ledger (No Event)</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              Provenance & Justification
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Created By:</span>
                <span className="font-semibold text-slate-800">
                  {expense.createdBy?.name || expense.createdBy?.email}
                </span>
              </div>
              {expense.reviewedBy && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Reviewed By:</span>
                  <span className="font-semibold text-slate-800">
                    {expense.reviewedBy.name || expense.reviewedBy.email}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Logged Timestamp:</span>
                <span className="font-mono text-slate-600 font-medium">{formatDate(expense.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Description:</span>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {expense.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts Module */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Proof of Expense (Receipts)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maximum 5MB • Formats: JPEG, PNG, PDF • Content-based SHA-256 deduplication
              </p>
            </div>

            {canAddReceipt && (
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingReceipt ? 'Processing...' : 'Upload Receipt'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={uploadingReceipt}
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {expense.receipts && expense.receipts.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">SHA-256 Digest</th>
                    <th className="py-2.5 px-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expense.receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.fileName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.mimeType}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {(r.fileSizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                        {r.sha256}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              No receipt documents uploaded for this expense yet.
            </div>
          )}
        </div>

        {/* Submit Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmSubmitOpen}
          title="Submit Expense for Approval"
          message={`Are you sure you want to submit "${expense.title}" (${formatCurrency(expense.amount)}) for ACM Core verification? Once submitted, the expense cannot be edited until reviewed.`}
          confirmLabel="Submit for Review"
          cancelLabel="Cancel"
          isLoading={actionLoading}
          onConfirm={handleSubmitExpense}
          onCancel={() => setConfirmSubmitOpen(false)}
        />

        {/* Approve Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmApproveOpen}
          title="Approve Expense Disbursement"
          message={`Are you sure you want to approve "${expense.title}" for ${formatCurrency(expense.amount)}? This action will charge the expenditure against the club's allocated semester budget.`}
          confirmLabel="Approve Expense"
          cancelLabel="Cancel"
          isLoading={actionLoading}
          onConfirm={handleApproveExpense}
          onCancel={() => setConfirmApproveOpen(false)}
        />

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDeleteOpen}
          title="Permanently Delete Expense"
          message={`Are you sure you want to permanently delete "${expense.title}"? All associated receipt metadata will also be removed. This action cannot be undone.`}
          confirmLabel="Delete Expense"
          cancelLabel="Cancel"
          isDestructive={true}
          isLoading={actionLoading}
          onConfirm={handleDeleteExpense}
          onCancel={() => setConfirmDeleteOpen(false)}
        />

        {/* Reject Modal */}
        <ModalDialog
          isOpen={rejectModalOpen}
          title="Reject Expense Ledger Entry"
          description="Provide a mandatory reason for rejecting this club expense."
          onClose={() => setRejectModalOpen(false)}
        >
          <div className="space-y-4">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State the audit justification for rejecting this expense..."
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(false)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRejectExpense}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </ModalDialog>
      </div>
    </AppShell>
  )
}
