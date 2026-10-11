/**
 * Global Vitest setup.
 *
 * Integration tests require a real DATABASE_URL pointing to a PostgreSQL instance.
 * Unit tests (timezone logic, etc.) do NOT need a database.
 *
 * To run integration tests, ensure DATABASE_URL is set in your environment
 * and the database has been migrated + seeded:
 *   npx prisma migrate dev
 *   npx prisma db seed
 */
import { beforeAll, afterAll } from 'vitest'
import prisma from '@/server/lib/prisma'

beforeAll(async () => {
  const testSemesters = await prisma.semester.findMany({ where: { name: { startsWith: 'TestSem' } } })
  const testSemIds = testSemesters.map(s => s.id)
  if (testSemIds.length > 0) {
    await prisma.receipt.deleteMany({ where: { expense: { semesterId: { in: testSemIds } } } })
    await prisma.budgetAllocation.deleteMany({ where: { semesterId: { in: testSemIds } } })
    await prisma.expense.deleteMany({ where: { semesterId: { in: testSemIds } } })
    await prisma.semester.deleteMany({ where: { id: { in: testSemIds } } })
  }
})

afterAll(async () => {
  // Nothing to tear down globally.
})
