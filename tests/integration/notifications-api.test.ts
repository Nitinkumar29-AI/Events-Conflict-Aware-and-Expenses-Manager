/**
 * Regression tests for GET/PATCH /api/notifications and PATCH /api/notifications/:id/read
 *
 * These tests specifically guard against the response shape mismatch that caused the
 * Notifications page to crash (TypeError: notifications.filter is not a function).
 *
 * Root cause that was fixed:
 *   - notificationService.getUserNotifications() returns { items, total, pages, ... }
 *   - The route was returning { data: <paginated-object> } instead of { data: <array> }
 *   - The page called setNotifications(data.data) which set state to an object, not an array
 *   - notifications.filter() then threw TypeError → React error boundary → Application Error
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

let currentUserMock: any = null

vi.mock('@/server/lib/auth', () => ({
  requireUser: vi.fn(async () => {
    if (!currentUserMock) {
      const { UnauthorizedError } = await import('@/server/lib/errors')
      throw new UnauthorizedError('Authentication required')
    }
    return currentUserMock
  }),
}))

import { GET as getNotificationsHandler, PATCH as markAllReadHandler } from '@/app/api/notifications/route'
import { PATCH as markOneReadHandler } from '@/app/api/notifications/[id]/read/route'

const prisma = new PrismaClient()

describe('Notifications API Route Handlers (Integration)', () => {
  let acmCoreUser: any
  let viewerUser: any

  beforeAll(async () => {
    acmCoreUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'core@acm-demo.college.edu' },
    })
    viewerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'viewer@acm-demo.college.edu' },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /api/notifications — response shape', () => {
    it('returns 401 for unauthenticated requests', async () => {
      currentUserMock = null
      const req = new NextRequest('http://localhost/api/notifications')
      const res = await getNotificationsHandler(req)
      expect(res.status).toBe(401)
    })

    it('returns data as a flat array (not a paginated object) — guards against page crash', async () => {
      currentUserMock = {
        id: acmCoreUser.id,
        email: acmCoreUser.email,
        name: acmCoreUser.name,
        role: acmCoreUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications')
      const res = await getNotificationsHandler(req)
      expect(res.status).toBe(200)

      const body = await res.json()

      // data MUST be an array — if it's an object, notifications.filter() throws TypeError
      expect(Array.isArray(body.data)).toBe(true)

      // meta must carry pagination info
      expect(body.meta).toBeDefined()
      expect(typeof body.meta.total).toBe('number')
      expect(typeof body.meta.pages).toBe('number')
      expect(typeof body.meta.page).toBe('number')
      expect(typeof body.meta.limit).toBe('number')
    })

    it('returns data as empty array (not crash) when user has no notifications', async () => {
      // viewer user should have no notifications in the demo dataset
      currentUserMock = {
        id: viewerUser.id,
        email: viewerUser.email,
        name: viewerUser.name,
        role: viewerUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications')
      const res = await getNotificationsHandler(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      // empty array is valid — this must NOT return a truthy-but-non-array value
      expect(body.meta.total).toBeGreaterThanOrEqual(0)
    })

    it('each notification item has required fields for the page to render', async () => {
      currentUserMock = {
        id: acmCoreUser.id,
        email: acmCoreUser.email,
        name: acmCoreUser.name,
        role: acmCoreUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications')
      const res = await getNotificationsHandler(req)
      const body = await res.json()

      // Only validate if there are notifications in the DB
      if (body.data.length > 0) {
        const n = body.data[0]
        expect(typeof n.id).toBe('string')
        expect(typeof n.type).toBe('string')
        expect(typeof n.createdAt).toBe('string')
        // readAt may be null but must exist as a key
        expect('readAt' in n).toBe(true)
      }
    })

    it('respects page and limit query params and returns correct meta', async () => {
      currentUserMock = {
        id: acmCoreUser.id,
        email: acmCoreUser.email,
        name: acmCoreUser.name,
        role: acmCoreUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications?page=1&limit=2')
      const res = await getNotificationsHandler(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeLessThanOrEqual(2)
      expect(body.meta.page).toBe(1)
      expect(body.meta.limit).toBe(2)
    })

    it('returns only own notifications — does not expose other users notifications', async () => {
      currentUserMock = {
        id: viewerUser.id,
        email: viewerUser.email,
        name: viewerUser.name,
        role: viewerUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications')
      const res = await getNotificationsHandler(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      // All returned notifications must belong to viewerUser
      for (const n of body.data as any[]) {
        expect(n.userId ?? viewerUser.id).toBe(viewerUser.id)
      }
    })
  })

  describe('PATCH /api/notifications — mark all as read', () => {
    it('returns 401 for unauthenticated requests', async () => {
      currentUserMock = null
      const req = new NextRequest('http://localhost/api/notifications', { method: 'PATCH' })
      const res = await markAllReadHandler(req)
      expect(res.status).toBe(401)
    })

    it('marks all unread notifications as read and returns success', async () => {
      currentUserMock = {
        id: acmCoreUser.id,
        email: acmCoreUser.email,
        name: acmCoreUser.name,
        role: acmCoreUser.role,
      }
      const req = new NextRequest('http://localhost/api/notifications', { method: 'PATCH' })
      const res = await markAllReadHandler(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)

      // After marking all, unread count should be 0
      const count = await prisma.notification.count({
        where: { userId: acmCoreUser.id, isRead: false },
      })
      expect(count).toBe(0)
    })
  })

  describe('PATCH /api/notifications/:id/read — mark one as read', () => {
    it('returns 401 for unauthenticated requests', async () => {
      currentUserMock = null
      const req = new NextRequest('http://localhost/api/notifications/fake-id/read', { method: 'PATCH' })
      const res = await markOneReadHandler(req, { params: Promise.resolve({ id: 'fake-id' }) })
      expect(res.status).toBe(401)
    })

    it('user cannot mark another users notification as read — returns 403 or 404', async () => {
      // Create a notification for viewerUser
      const notif = await prisma.notification.create({
        data: {
          userId: viewerUser.id,
          type: 'EVENT_SUBMITTED',
          title: 'Cross-user isolation test',
          message: 'Should not be readable by acmCore',
          isRead: false,
        },
      })

      try {
        // Try to mark it as read while logged in as acmCoreUser
        currentUserMock = {
          id: acmCoreUser.id,
          email: acmCoreUser.email,
          name: acmCoreUser.name,
          role: acmCoreUser.role,
        }
        const req = new NextRequest(`http://localhost/api/notifications/${notif.id}/read`, {
          method: 'PATCH',
        })
        const res = await markOneReadHandler(req, { params: Promise.resolve({ id: notif.id }) })
        // Must be 403 Forbidden — never 200 or 500
        expect(res.status).toBe(403)
      } finally {
        // Cleanup test notification
        await prisma.notification.deleteMany({ where: { id: notif.id } })
      }
    })
  })
})
