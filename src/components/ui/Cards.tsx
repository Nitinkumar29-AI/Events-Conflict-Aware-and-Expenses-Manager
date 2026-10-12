import React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ElementType
  className?: string
}) {
  return (
    <div
      className={`px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <h3 className="font-bold text-sm text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function StatCard({
  title,
  value,
  subtitle,
  linkHref,
  linkLabel,
  icon: Icon,
  colorScheme = 'indigo',
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
  linkHref?: string
  linkLabel?: string
  icon: React.ElementType
  colorScheme?: 'indigo' | 'amber' | 'rose' | 'emerald' | 'slate'
}) {
  const schemeStyles = {
    indigo: {
      iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600',
      valueColor: 'text-indigo-950',
      link: 'text-indigo-600 hover:text-indigo-700',
    },
    amber: {
      iconBg: 'bg-amber-50 border-amber-100 text-amber-600',
      valueColor: 'text-amber-950',
      link: 'text-amber-700 hover:text-amber-800',
    },
    rose: {
      iconBg: 'bg-rose-50 border-rose-100 text-rose-600',
      valueColor: 'text-rose-950',
      link: 'text-rose-600 hover:text-rose-700',
    },
    emerald: {
      iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      valueColor: 'text-emerald-950',
      link: 'text-emerald-700 hover:text-emerald-800',
    },
    slate: {
      iconBg: 'bg-slate-50 border-slate-200 text-slate-600',
      valueColor: 'text-slate-900',
      link: 'text-slate-600 hover:text-slate-800',
    },
  }

  const current = schemeStyles[colorScheme]

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:border-slate-300">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className={`text-2xl font-bold tracking-tight ${current.valueColor}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        {linkHref && (
          <Link
            href={linkHref}
            className={`text-xs font-semibold inline-flex items-center gap-1 mt-1 transition-colors ${current.link}`}
          >
            <span>{linkLabel || 'View details'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div
        className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${current.iconBg}`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}
