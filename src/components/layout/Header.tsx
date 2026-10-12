'use client'

import React from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, Menu } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badges'

interface HeaderProps {
  onToggleMobileMenu?: () => void
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0 shadow-xs">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 tracking-tight sm:text-base">
            ACM Operations Portal
          </span>
          <span className="hidden sm:inline-flex text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            Institutional Suite
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-2xs">
                {user.name ? user.name[0]?.toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="sm:hidden">
                <RoleBadge role={user.role} />
              </div>
              <div className="hidden sm:block text-right">
                <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 justify-end">
                  <span>{user.name || user.email}</span>
                  <RoleBadge role={user.role} />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                  {user.email}
                  {user.clubId && (
                    <span className="text-slate-400 font-mono">
                      (Club: {user.clubId.slice(0, 8)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-rose-600 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">Not authenticated</div>
        )}
      </div>
    </header>
  )
}
