import React from 'react'
import Link from 'next/link'
import { auth } from '@/server/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/server/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'
import { EventForm } from '@/components/events/EventForm'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { canManageClubResource } from '@/lib/auth-client'
import { ShieldAlert } from 'lucide-react'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params
  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null },
    include: {
      club: true,
      venue: true,
      semester: true,
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!event) {
    notFound()
  }

  // Lifecycle check: Events cannot be edited once verified, rejected, or completed
  if (event.status !== 'DRAFT' && event.status !== 'SUBMITTED') {
    redirect(`/events/${id}`)
  }

  // Zero-trust creator check: Only the authenticated creator can edit
  const isCreator = session.user.id === event.submittedByUserId
  const canManage = canManageClubResource(session.user.role, session.user.clubId, event.clubId)

  if (!isCreator || !canManage) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-5">
          <Breadcrumbs
            items={[
              { label: 'Events Directory', href: '/events' },
              { label: event.title, href: `/events/${event.id}` },
              { label: 'Edit Restricted' },
            ]}
          />
          <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-rose-900">Editing Restricted to Creator</h2>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Only the user who originally submitted this event can modify its parameters.
                  This record was submitted by{' '}
                  <strong className="font-semibold">
                    {event.submittedBy?.name || event.submittedBy?.email || 'the original creator'}
                  </strong>.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Return to Event Details
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        <Breadcrumbs
          items={[
            { label: 'Events Directory', href: '/events' },
            { label: event.title, href: `/events/${event.id}` },
            { label: 'Edit Event' },
          ]}
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Edit Event: {event.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update event parameters. Events can only be edited while in DRAFT or SUBMITTED status.
          </p>
        </div>

        <EventForm initialData={event} isEdit={true} />
      </div>
    </AppShell>
  )
}
