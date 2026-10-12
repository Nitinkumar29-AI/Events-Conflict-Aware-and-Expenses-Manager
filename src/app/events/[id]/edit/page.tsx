import React from 'react'
import { auth } from '@/server/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/server/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'
import { EventForm } from '@/components/events/EventForm'
import { canManageClubResource } from '@/lib/auth-client'

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
    include: { club: true, venue: true, semester: true },
  })

  if (!event) {
    notFound()
  }

  // RBAC ownership check
  const canManage = canManageClubResource(session.user.role, session.user.clubId, event.clubId)
  if (!canManage || (event.status !== 'DRAFT' && event.status !== 'SUBMITTED')) {
    redirect(`/events/${id}`)
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
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
