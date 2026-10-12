'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { fetchApi, ApiError } from '@/lib/api'
import { AlertBanner, LoadingSpinner } from '@/components/ui/Feedback'
import {
  Users,
  FileText,
  Clock,
} from 'lucide-react'

const BRANCH_OPTIONS = ['CSE', 'IT', 'ECE', 'EE', 'MECH', 'CIVIL', 'AIDS', 'AIML']
const YEAR_OPTIONS = [1, 2, 3, 4]
const EVENT_TYPES = ['WORKSHOP', 'HACKATHON', 'SPEAKER_SESSION', 'COMPETITION', 'SOCIAL', 'OTHER']

interface Metadata {
  clubs: { id: string; name: string; code: string; isInternalAcm: boolean }[]
  venues: { id: string; name: string; capacity: number }[]
  semesters: { id: string; name: string; isLocked: boolean; startDate: string; endDate: string }[]
}

interface EventFormProps {
  initialData?: any
  isEdit?: boolean
}

export function EventForm({ initialData, isEdit = false }: EventFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const [meta, setMeta] = useState<Metadata | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form fields
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [eventType, setEventType] = useState(initialData?.eventType || 'WORKSHOP')
  const [clubId, setClubId] = useState(initialData?.clubId || user?.clubId || '')
  const [venueId, setVenueId] = useState(initialData?.venueId || '')
  const [semesterId, setSemesterId] = useState(initialData?.semesterId || '')
  const [startAt, setStartAt] = useState(
    initialData?.startAt ? new Date(initialData.startAt).toISOString().slice(0, 16) : ''
  )
  const [endAt, setEndAt] = useState(
    initialData?.endAt ? new Date(initialData.endAt).toISOString().slice(0, 16) : ''
  )
  const [targetYears, setTargetYears] = useState<number[]>(initialData?.targetYears || [])
  const [targetBranches, setTargetBranches] = useState<string[]>(initialData?.targetBranches || [])
  const [expectedAttendees, setExpectedAttendees] = useState<number>(
    initialData?.expectedAttendees !== undefined ? initialData.expectedAttendees : 50
  )
  const [tagsInput, setTagsInput] = useState<string>(initialData?.tags?.join(', ') || '')

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetchApi<Metadata>('/api/meta')
        setMeta(res.data)

        // Set sensible defaults if empty
        if (!venueId && res.data.venues.length > 0) {
          setVenueId(res.data.venues[0].id)
        }
        if (!semesterId) {
          const unlocked = res.data.semesters.find((s) => !s.isLocked)
          if (unlocked) setSemesterId(unlocked.id)
          else if (res.data.semesters.length > 0) setSemesterId(res.data.semesters[0].id)
        }
        if (!clubId) {
          if (user?.clubId) {
            setClubId(user.clubId)
          } else if (res.data.clubs.length > 0) {
            setClubId(res.data.clubs[0].id)
          }
        }
      } catch (err: any) {
        setError('Failed to load system metadata (venues, semesters, clubs).')
      } finally {
        setLoadingMeta(false)
      }
    }
    loadMeta()
  }, [user])

  const toggleYear = (yr: number) => {
    if (targetYears.includes(yr)) {
      setTargetYears(targetYears.filter((y) => y !== yr))
    } else {
      setTargetYears([...targetYears, yr].sort())
    }
  }

  const toggleBranch = (br: string) => {
    if (targetBranches.includes(br)) {
      setTargetBranches(targetBranches.filter((b) => b !== br))
    } else {
      setTargetBranches([...targetBranches, br])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!startAt || !endAt) {
      setError('Please provide valid start and end dates.')
      return
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (startDate >= endDate) {
      setError('Start time must be strictly before end time.')
      return
    }

    setSubmitting(true)

    const payload: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      eventType,
      venueId,
      semesterId,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      targetYears,
      targetBranches,
      expectedAttendees: Number(expectedAttendees),
      tags: tagsInput
        ? tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    }

    if (!isEdit) {
      payload.clubId = clubId
    }

    try {
      if (isEdit) {
        const res = await fetchApi<{ id: string }>(`/api/events/${initialData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        router.push(`/events/${res.data.id}`)
      } else {
        const res = await fetchApi<{ id: string }>('/api/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        router.push(`/events/${res.data.id}`)
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.details && typeof err.details === 'object') {
          const formatted: Record<string, string> = {}
          for (const [k, v] of Object.entries(err.details as any)) {
            if (v && typeof v === 'object' && '_errors' in v && Array.isArray((v as any)._errors)) {
              formatted[k] = (v as any)._errors[0]
            }
          }
          setFieldErrors(formatted)
        }
      } else {
        setError(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingMeta) {
    return <LoadingSpinner message="Loading event metadata & venues..." />
  }

  const isRestrictedRep =
    user?.role === 'CLUB_REP' || (user?.role === 'ACM_EXEC' && !!user.clubId)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs"
    >
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {/* 1. Basic Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          Event Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Winter Hackathon 2026"
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.title}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Agenda
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive summary of the event structure, speaker lineup, or requirements..."
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Event Category *
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-700"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Organizing Club *
              </label>
              <select
                value={clubId}
                disabled={isRestrictedRep}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-700"
              >
                {meta?.clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {isRestrictedRep && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Fixed to your authenticated club representation scope.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Venue *
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-700"
            >
              {meta?.venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Max Capacity: {v.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Academic Semester *
            </label>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-700"
            >
              {meta?.semesters.map((s) => (
                <option key={s.id} value={s.id} disabled={s.isLocked}>
                  {s.name} {s.isLocked ? '(LOCKED)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Schedule Timing */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Schedule Timing (Indian Standard Time - IST)
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Times are evaluated in IST (UTC+05:30). The conflict engine applies an automatic 30-minute turnaround buffer before and after this window.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              disabled={submitting}
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
            />
            {fieldErrors.startAt && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.startAt}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              disabled={submitting}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
            />
            {fieldErrors.endAt && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.endAt}</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Target Audience Structure */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Target Audience Scope
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Empty = Open to all campus cohorts
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Academic Years
          </label>
          <div className="flex flex-wrap gap-2">
            {YEAR_OPTIONS.map((yr) => {
              const active = targetYears.includes(yr)
              return (
                <button
                  type="button"
                  key={yr}
                  onClick={() => toggleYear(yr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Year {yr}
                </button>
              )
            })}
            {targetYears.length === 0 && (
              <span className="text-xs text-indigo-600 font-medium self-center ml-2">
                (Wildcard: All years 1–4 eligible)
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Target Branches
          </label>
          <div className="flex flex-wrap gap-2">
            {BRANCH_OPTIONS.map((br) => {
              const active = targetBranches.includes(br)
              return (
                <button
                  type="button"
                  key={br}
                  onClick={() => toggleBranch(br)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {br}
                </button>
              )
            })}
            {targetBranches.length === 0 && (
              <span className="text-xs text-indigo-600 font-medium self-center ml-2">
                (Wildcard: All branches eligible)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Expected Attendees
            </label>
            <input
              type="number"
              min={0}
              value={expectedAttendees}
              onChange={(e) => setExpectedAttendees(Number(e.target.value))}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. coding, web3, ai"
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
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
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {submitting ? 'Saving Event...' : isEdit ? 'Save Changes' : 'Create Event (Draft)'}
        </button>
      </div>
    </form>
  )
}
