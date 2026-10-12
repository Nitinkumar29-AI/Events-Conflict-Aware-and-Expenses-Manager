import React from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Ban,
  Check,
  Sparkles,
} from 'lucide-react'

export function EventStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <Clock className="w-3 h-3 text-slate-500 mr-1" />,
    },
    SUBMITTED: {
      label: 'Submitted',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3 h-3 text-amber-600 mr-1" />,
    },
    VERIFIED: {
      label: 'Verified',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />,
    },
    REJECTED: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <XCircle className="w-3 h-3 text-rose-600 mr-1" />,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: <Ban className="w-3 h-3 text-slate-500 mr-1" />,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: <Check className="w-3 h-3 text-blue-600 mr-1" />,
    },
  }

  const current = config[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null,
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.icon}
      {current.label}
    </span>
  )
}

export function ExpenseStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <Clock className="w-3 h-3 text-slate-500 mr-1" />,
    },
    SUBMITTED: {
      label: 'Submitted',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3 h-3 text-amber-600 mr-1" />,
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />,
    },
    REJECTED: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <XCircle className="w-3 h-3 text-rose-600 mr-1" />,
    },
    REIMBURSED: {
      label: 'Reimbursed',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      icon: <Sparkles className="w-3 h-3 text-purple-600 mr-1" />,
    },
  }

  const current = config[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null,
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.icon}
      {current.label}
    </span>
  )
}

export function ConflictSeverityBadge({ severity }: { severity: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    HIGH: {
      label: 'High Severity',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200 font-semibold',
      icon: <AlertTriangle className="w-3 h-3 text-rose-600 mr-1" />,
    },
    MEDIUM: {
      label: 'Medium Severity',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200 font-medium',
      icon: <AlertTriangle className="w-3 h-3 text-amber-600 mr-1" />,
    },
    LOW: {
      label: 'Low Severity',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200 font-medium',
      icon: <AlertTriangle className="w-3 h-3 text-sky-600 mr-1" />,
    },
  }

  const current = config[severity] || {
    label: severity,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null,
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.icon}
      {current.label}
    </span>
  )
}

export function ConflictStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string }
  > = {
    OPEN: {
      label: 'Open Conflict',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
    },
    ACKNOWLEDGED: {
      label: 'Acknowledged',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    RESOLVED: {
      label: 'Resolved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    OVERRIDDEN: {
      label: 'Overridden',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
    },
  }

  const current = config[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      bg: 'bg-rose-50',
      text: 'text-rose-700 font-semibold',
      border: 'border-rose-200',
    },
    ACM_CORE: {
      label: 'ACM Core',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700 font-semibold',
      border: 'border-indigo-200',
    },
    ACM_EXEC: {
      label: 'ACM Exec',
      bg: 'bg-blue-50',
      text: 'text-blue-700 font-medium',
      border: 'border-blue-200',
    },
    CLUB_REP: {
      label: 'Club Rep',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700 font-medium',
      border: 'border-emerald-200',
    },
    VIEWER: {
      label: 'Viewer',
      bg: 'bg-slate-100',
      text: 'text-slate-600 font-medium',
      border: 'border-slate-200',
    },
  }

  const current = config[role] || {
    label: role,
    bg: 'bg-slate-100',
    text: 'text-slate-700 font-medium',
    border: 'border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border tracking-wide uppercase ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  )
}
