import { describe, it, expect } from 'vitest'
import { CreateExpenseSchema } from '@/server/validators/expense.validator'
import { ReceiptFileSchema } from '@/server/validators/receipt.validator'

describe('Expense Validator', () => {
  it('validates a correct expense', () => {
    const data = {
      title: 'Pizza for meeting',
      amount: '50.25',
      categoryId: 'cat_123',
      date: new Date().toISOString(),
    }
    expect(CreateExpenseSchema.safeParse(data).success).toBe(true)
  })

  it('rejects zero amount', () => {
    const data = { title: 'T', amount: '0.00', categoryId: 'c', date: new Date().toISOString() }
    expect(CreateExpenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects negative amount', () => {
    const data = { title: 'T', amount: '-10.00', categoryId: 'c', date: new Date().toISOString() }
    expect(CreateExpenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects excessive decimal precision', () => {
    const data = { title: 'T', amount: '10.123', categoryId: 'c', date: new Date().toISOString() }
    expect(CreateExpenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects malformed amount', () => {
    const data = { title: 'T', amount: 'abc', categoryId: 'c', date: new Date().toISOString() }
    expect(CreateExpenseSchema.safeParse(data).success).toBe(false)
  })
})
describe('Receipt Validator', () => {
  it('accepts valid PDF', () => {
    expect(ReceiptFileSchema.safeParse({ mimeType: 'application/pdf', fileSizeBytes: 1000 }).success).toBe(true)
  })
  it('accepts valid JPG', () => {
    expect(ReceiptFileSchema.safeParse({ mimeType: 'image/jpeg', fileSizeBytes: 1000 }).success).toBe(true)
  })
  it('accepts valid PNG', () => {
    expect(ReceiptFileSchema.safeParse({ mimeType: 'image/png', fileSizeBytes: 1000 }).success).toBe(true)
  })
  it('rejects > 5MB', () => {
    expect(ReceiptFileSchema.safeParse({ mimeType: 'application/pdf', fileSizeBytes: 6 * 1024 * 1024 }).success).toBe(false)
  })
  it('rejects unsupported mime type', () => {
    expect(ReceiptFileSchema.safeParse({ mimeType: 'application/x-msdownload', fileSizeBytes: 1000 }).success).toBe(false)
  })
})
