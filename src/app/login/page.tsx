'use client'

import React, { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { KeyRound, Mail, AlertCircle, Shield, ArrowRight, CheckCircle2 } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badges'

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDemoAllowed, setIsDemoAllowed] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }

    // Safety guard: if running in production on a remote domain without explicit opt-in, hide demo accounts
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== 'true'
    ) {
      setIsDemoAllowed(false)
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (res?.error) {
        if (res.error.includes('inactive') || res.error.includes('Inactive')) {
          setError('This account is deactivated. Contact an administrator.')
        } else if (res.error === 'CredentialsSignin') {
          setError('Invalid email or password.')
        } else {
          setError('Authentication failed. Please verify your credentials.')
        }
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred during sign-in.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('DemoPassword123!')
    setError(null)
  }

  const demoAccounts = [
    { role: 'SUPER_ADMIN', email: 'superadmin@acm-demo.college.edu', label: 'Super Admin' },
    { role: 'ACM_CORE', email: 'core@acm-demo.college.edu', label: 'ACM Core Lead' },
    { role: 'ACM_EXEC', email: 'exec@acm-demo.college.edu', label: 'ACM Executive' },
    { role: 'CLUB_REP', email: 'rep.coding@acm-demo.college.edu', label: 'Coding Club Rep' },
    { role: 'VIEWER', email: 'viewer@acm-demo.college.edu', label: 'Public Viewer' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-4 ring-indigo-50">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900 tracking-tight">
          ACM Incursion Manager
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Conflict-Aware Events & Expenses Institutional Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Institutional Email
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          {isDemoAllowed && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Testing & Demo Access (Click to Select)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className={`text-left p-2.5 rounded-lg border transition-all hover:border-indigo-300 hover:bg-indigo-50/50 ${
                      email === acc.email
                        ? 'border-indigo-500 bg-indigo-50/70'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-800">{acc.label}</span>
                      <RoleBadge role={acc.role} />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{acc.email}</div>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400 text-center font-mono">
                Demo Password: DemoPassword123!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
