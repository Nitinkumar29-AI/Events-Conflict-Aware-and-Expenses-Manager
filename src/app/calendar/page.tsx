'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { AppShell } from '@/components/layout/AppShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { AlertBanner, LoadingSpinner } from '@/components/ui/Feedback'
import { fetchApi } from '@/lib/api'
import { AlertTriangle, Info } from 'lucide-react'

interface CalendarEventItem {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    status: string
    clubId: string
    clubName: string
    clubCode: string
    venueId: string
    venueName: string
    eventType: string
    expectedAttendees: number
    organizer: string
    unresolvedConflictCount: number
    highestConflictSeverity: string | null
  }
}

export default function CalendarPage() {
  const router = useRouter()
  const calendarRef = useRef<any>(null)

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch calendar events whenever user navigates months/weeks
  const handleDatesSet = async (dateInfo: { start: Date; end: Date }) => {
    setLoading(true)
    setError(null)
    try {
      const from = dateInfo.start.toISOString()
      const to = dateInfo.end.toISOString()

      const res = await fetchApi<CalendarEventItem[]>(
        `/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )

      // Map to FullCalendar event format with harmonious pastel/accent color coding
      const mapped = (res.data || []).map((ev) => {
        let backgroundColor = '#4f46e5' // Indigo for verified/default
        let borderColor = '#4338ca'
        const hasConflict = ev.extendedProps.unresolvedConflictCount > 0

        if (ev.extendedProps?.status === 'SUBMITTED') {
          backgroundColor = '#d97706' // Amber
          borderColor = '#b45309'
        } else if (ev.extendedProps?.status === 'DRAFT') {
          backgroundColor = '#64748b' // Slate
          borderColor = '#475569'
        } else if (ev.extendedProps?.status === 'COMPLETED') {
          backgroundColor = '#0284c7' // Sky
          borderColor = '#0369a1'
        }

        if (hasConflict) {
          borderColor = '#dc2626'
        }

        return {
          id: ev.id,
          title: `${hasConflict ? '! ' : ''}[${ev.extendedProps?.clubCode || 'CLUB'}] ${ev.title} @ ${ev.extendedProps?.venueName || 'Venue'}`,
          start: ev.start,
          end: ev.end,
          backgroundColor,
          borderColor,
          textColor: '#ffffff',
          extendedProps: ev.extendedProps,
          ...(hasConflict
            ? {
                classNames: ['calendar-conflict-event'],
              }
            : {}),
        }
      })

      setEvents(mapped)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar events.')
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (info: any) => {
    info.jsEvent.preventDefault()
    if (info.event.id) {
      router.push(`/events/${info.event.id}`)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs items={[{ label: 'Institutional Calendar' }]} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Institutional Calendar
              </h1>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                Live Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visual scheduling matrix across all verified and pending club events. Click an event to inspect its details.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Verified</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
              <span>Submitted</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>Draft</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
              <span>Completed</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Unresolved conflict</span>
            </span>
          </div>
        </div>

        {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
          {loading && (
            <div className="mb-3 text-xs text-indigo-600 font-semibold flex items-center gap-2">
              <LoadingSpinner size="sm" message="Updating schedule window..." />
            </div>
          )}

          <div className="calendar-container text-xs">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              eventDidMount={(info) => {
                const { unresolvedConflictCount, highestConflictSeverity } = info.event.extendedProps
                if (unresolvedConflictCount > 0) {
                  const label = `${highestConflictSeverity || 'Potential'} conflict: ${unresolvedConflictCount} unresolved clash(es)`
                  info.el.title = label
                  info.el.setAttribute('aria-label', `${info.event.title}. ${label}`)
                }
              }}
              height="auto"
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                meridiem: 'short',
              }}
            />
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>
            Calendar queries are securely restricted by backend window limits (max 366 days). Event states reflect real-time database transactions.
          </span>
        </div>
      </div>
    </AppShell>
  )
}
