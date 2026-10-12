'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
        title="Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Dashboard</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-slate-900 font-medium transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="font-semibold text-slate-900 truncate max-w-[260px]"
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
