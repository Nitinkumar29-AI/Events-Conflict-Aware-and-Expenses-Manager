import React, { useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  Loader2,
  X,
} from 'lucide-react'

export function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
}: {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3 text-slate-500">
      <Loader2 className={`${iconSizes[size]} animate-spin text-indigo-600`} />
      {message && <p className="text-xs font-medium text-slate-600">{message}</p>}
    </div>
  )
}

export function EmptyState({
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  icon: Icon = Info,
  action,
}: {
  title?: string
  description?: string
  icon?: React.ElementType
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function AlertBanner({
  type = 'info',
  title,
  message,
  onDismiss,
}: {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  onDismiss?: () => void
}) {
  const styles = {
    info: 'bg-blue-50/70 border-blue-200 text-blue-900',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-900',
    error: 'bg-rose-50/70 border-rose-200 text-rose-900',
  }

  const icons = {
    info: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />,
    error: <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />,
  }

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-lg border flex items-start gap-3 shadow-2xs text-xs ${styles[type]}`}
    >
      {icons[type]}
      <div className="flex-1 leading-relaxed">
        {title && <div className="font-semibold text-xs mb-0.5">{title}</div>}
        <div>{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export function ModalDialog({
  isOpen,
  title,
  description,
  children,
  onClose,
  maxWidth = 'max-w-md',
}: {
  isOpen: boolean
  title: string
  description?: string
  children: React.ReactNode
  onClose: () => void
  maxWidth?: string
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-xl shadow-xl border border-slate-200 w-full ${maxWidth} p-6 space-y-4 animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
