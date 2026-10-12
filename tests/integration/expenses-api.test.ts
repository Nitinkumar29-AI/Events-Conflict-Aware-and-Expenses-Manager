import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { CreateExpenseSchema, ExpenseQuerySchema } from '@/server/validators/expense.validator'

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

import { POST as createExpenseHandler } from '@/app/api/expenses/route'
import { GET as getExpenseByIdHandler, PATCH as updateExpenseHandler, DELETE as deleteExpenseHandler } from '@/app/api/expenses/[id]/route'
import { POST as submitExpenseHandler } from '@/app/api/expenses/[id]/submit/route'
import { POST as approveExpenseHandler } from '@/app/api/expenses/[id]/approve/route'
import { POST as addReceiptHandler } from '@/app/api/expenses/[id]/receipts/route'

const prisma = new PrismaClient()

describe('Phase 5 API Validation', () => {
  it('validates amount perfectly', () => {
    // Valid amounts
    expect(CreateExpenseSchema.shape.amount.safeParse('10').success).toBe(true)
    expect(CreateExpenseSchema.shape.amount.safeParse('10.5').success).toBe(true)
    expect(CreateExpenseSchema.shape.amount.safeParse('10.50').success).toBe(true)
    expect(CreateExpenseSchema.shape.amount.safeParse('0.01').success).toBe(true)
    
    // Invalid amounts
    expect(CreateExpenseSchema.shape.amount.safeParse('0').success).toBe(false)
    expect(CreateExpenseSchema.shape.amount.safeParse('-10').success).toBe(false)
    expect(CreateExpenseSchema.shape.amount.safeParse('10.555').success).toBe(false)
    expect(CreateExpenseSchema.shape.amount.safeParse('NaN').success).toBe(false)
    expect(CreateExpenseSchema.shape.amount.safeParse('Infinity').success).toBe(false)
    expect(CreateExpenseSchema.shape.amount.safeParse('10,000.50').success).toBe(false)
  })

  it('validates date is ISO', () => {
    expect(CreateExpenseSchema.shape.date.safeParse('2026-10-01T10:00:00Z').success).toBe(true)
    expect(CreateExpenseSchema.shape.date.safeParse('2026-10-01').success).toBe(false)
  })

  it('validates pagination query safely', () => {
    expect(ExpenseQuerySchema.safeParse({ page: 1, limit: 10 }).success).toBe(true)
    expect(ExpenseQuerySchema.safeParse({ page: '1', limit: '10' }).success).toBe(true) // z.coerce
    expect(ExpenseQuerySchema.safeParse({ page: 0, limit: 10 }).success).toBe(false)
    expect(ExpenseQuerySchema.safeParse({ page: 1, limit: 101 }).success).toBe(false)
  })
})

describe('Expenses Route Handlers & Zero-Trust Creator Ownership (Integration)', () => {
  let codingRepUser: any
  let roboticsRepUser: any
  let acmCoreUser: any

  let codingClub: any
  let logisticsCategory: any
  let testExpenseId: string

  beforeAll(async () => {
    codingRepUser = await prisma.user.findUniqueOrThrow({ where: { email: 'rep.coding@acm-demo.college.edu' } })
    roboticsRepUser = await prisma.user.findUniqueOrThrow({ where: { email: 'rep.robotics@acm-demo.college.edu' } })
    acmCoreUser = await prisma.user.findUniqueOrThrow({ where: { email: 'core@acm-demo.college.edu' } })

    codingClub = await prisma.club.findUniqueOrThrow({ where: { code: 'CC' } })
    logisticsCategory = await prisma.expenseCategory.findUniqueOrThrow({ where: { name: 'Logistics' } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creator can create a draft expense for their club', async () => {
    currentUserMock = {
      id: codingRepUser.id,
      email: codingRepUser.email,
      name: codingRepUser.name,
      role: codingRepUser.role,
      clubId: codingRepUser.clubId,
    }

    const req = new NextRequest('http://localhost:3000/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Route Creator Expense',
        description: 'Test expense created by Coding Rep',
        amount: '45.00',
        categoryId: logisticsCategory.id,
        date: '2026-10-15T10:00:00.000Z',
      }),
    })

    const res = await createExpenseHandler(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('DRAFT')
    expect(json.data.createdByUserId).toBe(codingRepUser.id)
    testExpenseId = json.data.id
  })

  it('creator can update editable fields on their draft expense', async () => {
    currentUserMock = {
      id: codingRepUser.id,
      email: codingRepUser.email,
      name: codingRepUser.name,
      role: codingRepUser.role,
      clubId: codingRepUser.clubId,
    }

    const patchReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Route Creator Expense',
        amount: '55.00',
      }),
    })

    const patchRes = await updateExpenseHandler(patchReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(patchRes.status).toBe(200)
    const json = await patchRes.json()
    expect(json.success).toBe(true)
    expect(json.data.title).toBe('Updated Route Creator Expense')
    expect(json.data.amount.toString()).toBe('55')
  })

  it('non-creator (another club rep) CANNOT edit the expense (returns 403 Forbidden)', async () => {
    currentUserMock = {
      id: roboticsRepUser.id,
      email: roboticsRepUser.email,
      name: roboticsRepUser.name,
      role: roboticsRepUser.role,
      clubId: roboticsRepUser.clubId,
    }

    const patchReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Tamper Attempt',
      }),
    })

    const patchRes = await updateExpenseHandler(patchReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(patchRes.status).toBe(403)
    const json = await patchRes.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('FORBIDDEN')
  })

  it('admin cannot edit creator-owned expense fields via standard PATCH (returns 403 Forbidden)', async () => {
    currentUserMock = {
      id: acmCoreUser.id,
      email: acmCoreUser.email,
      name: acmCoreUser.name,
      role: acmCoreUser.role,
      clubId: acmCoreUser.clubId,
    }

    const patchReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Admin Mutate Attempt',
      }),
    })

    const patchRes = await updateExpenseHandler(patchReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(patchRes.status).toBe(403)
    const json = await patchRes.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('FORBIDDEN')
  })

  it('rejects payload attempting to spoof createdByUserId or clubId (returns 403 Forbidden)', async () => {
    currentUserMock = {
      id: codingRepUser.id,
      email: codingRepUser.email,
      name: codingRepUser.name,
      role: codingRepUser.role,
      clubId: codingRepUser.clubId,
    }

    const patchReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Spoofed Expense Payload',
        createdByUserId: roboticsRepUser.id,
      }),
    })

    const patchRes = await updateExpenseHandler(patchReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(patchRes.status).toBe(403)
    const json = await patchRes.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('FORBIDDEN')
  })

  it('non-creator CANNOT attach receipts (returns 403 Forbidden)', async () => {
    currentUserMock = {
      id: roboticsRepUser.id,
      email: roboticsRepUser.email,
      name: roboticsRepUser.name,
      role: roboticsRepUser.role,
      clubId: roboticsRepUser.clubId,
    }

    const receiptReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'unauthorized_receipt.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        sha256: 'deadbeef' + Date.now().toString().padEnd(56, '0'),
      }),
    })

    const receiptRes = await addReceiptHandler(receiptReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(receiptRes.status).toBe(403)
    const json = await receiptRes.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('FORBIDDEN')
  })

  it('creator CAN attach receipts to their own expense', async () => {
    currentUserMock = {
      id: codingRepUser.id,
      email: codingRepUser.email,
      name: codingRepUser.name,
      role: codingRepUser.role,
      clubId: codingRepUser.clubId,
    }

    const receiptReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'legit_receipt.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        sha256: 'cafebeef' + Date.now().toString().padEnd(56, '0'),
      }),
    })

    const receiptRes = await addReceiptHandler(receiptReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(receiptRes.status).toBe(201)
    const json = await receiptRes.json()
    expect(json.success).toBe(true)
    expect(json.data.uploadedByUserId).toBe(codingRepUser.id)
  })

  it('creator can submit expense and ACM Core can approve it', async () => {
    // 1. Creator submits
    currentUserMock = {
      id: codingRepUser.id,
      email: codingRepUser.email,
      name: codingRepUser.name,
      role: codingRepUser.role,
      clubId: codingRepUser.clubId,
    }

    const submitReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}/submit`, {
      method: 'POST',
    })
    const submitRes = await submitExpenseHandler(submitReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(submitRes.status).toBe(200)
    const submitJson = await submitRes.json()
    expect(submitJson.data.status).toBe('SUBMITTED')

    // 2. ACM Core approves
    currentUserMock = {
      id: acmCoreUser.id,
      email: acmCoreUser.email,
      name: acmCoreUser.name,
      role: acmCoreUser.role,
      clubId: acmCoreUser.clubId,
    }

    const approveReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}/approve`, {
      method: 'POST',
    })
    const approveRes = await approveExpenseHandler(approveReq, {
      params: Promise.resolve({ id: testExpenseId }),
    })
    expect(approveRes.status).toBe(200)
    const approveJson = await approveRes.json()
    expect(approveJson.data.status).toBe('APPROVED')
  })
})
