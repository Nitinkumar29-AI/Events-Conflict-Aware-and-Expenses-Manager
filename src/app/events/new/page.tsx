import React from 'react'
import { auth } from '@/server/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { EventForm } from '@/components/events/EventForm'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { canClient } from '@/lib/auth-client'

export default async function NewEventPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (!canClient(session.user.role, 'CREATE_EVENT')) {
    redirect('/events')
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        <Breadcrumbs
          items={[
            { label: 'Events Directory', href: '/events' },
            { label: 'Create New Event' },
          ]}
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Create New Event
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Initiate a new event proposal in DRAFT state. You can submit it for review once ready.
          </p>
        </div>

        <EventForm />
      </div>
    </AppShell>
  )
}
