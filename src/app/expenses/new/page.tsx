'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { AlertBanner, LoadingSpinner } from '@/components/ui/Feedback'
import { fetchApi, ApiError } from '@/lib/api'
import { canClient } from '@/lib/auth-client'
import { Receipt, Calendar, Tag, FileText, IndianRupee, Link as LinkIcon, DollarSign } from 'lucide-react'

interface MetaResponse {
  categories: { id: string; name: string; description: string | null }[]
}

interface EventOption {
  id: string
  title: string
  clubId: string
  club: { code: string }
}

export default function NewExpensePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)) // YYYY-MM-DD
  const [eventId, setEventId] = useState('')

  useEffect(() => {
    async function loadFormMeta() {
      try {
        const [metaRes, eventsRes] = await Promise.all([
          fetchApi<MetaResponse>('/api/meta'),
          fetchApi<EventOption[]>('/api/events?pageSize=50'),
        ])

        setCategories(metaRes.data.categories || [])
        if (metaRes.data.categories.length > 0) {
          setCategoryId(metaRes.data.categories[0].id)
        }
        setEvents(eventsRes.data || [])
      } catch (err: any) {
        setError('Failed to load expense categories or events.')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      if (!canClient(user?.role, 'CREATE_EXPENSE')) {
        setError('You do not have permission to record expenses.')
        setLoading(false)
      } else {
        loadFormMeta()
      }
    }
  }, [session, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || parseFloat(amount) <= 0) {
      setError('Amount must be a positive decimal number with up to 2 decimal places (e.g. 250.00).')
      return
    }

    if (!categoryId) {
      setError('Please select an expense category.')
      return
    }

    setSubmitting(true)

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amount.trim(),
        categoryId,
        date: new Date(`${date}T12:00:00.000Z`).toISOString(),
      }

      if (eventId) {
        payload.eventId = eventId
      }

      const res = await fetchApi<{ id: string }>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      router.push(`/expenses/${res.data.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create expense.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingSpinner message="Loading expense form configuration..." />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Record New Expense
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Expenses initialize in DRAFT status and must be submitted with receipts for Core verification.
          </p>
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Title *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hackathon Mentors Refreshments"
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Business Justification
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide itemized details or justification for this expenditure..."
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount (INR) *
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500.00"
                  className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg pl-8 pr-3.5 py-2.5 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Exact Decimal(12,2) with no float loss.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-700"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Must fall within an active, unlocked academic semester.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Linked Event (Optional)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-700"
              >
                <option value="">General Club Expense (No Event)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    [{ev.club?.code || 'CLUB'}] {ev.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating Expense...' : 'Create Expense (Draft)'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
