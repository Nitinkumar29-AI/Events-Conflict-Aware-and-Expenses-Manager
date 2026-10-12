import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  canAccessClub,
  canManageEvent,
  canManageExpense,
  canAcknowledgeConflict,
  assertCanAccessClub,
  isEventCreator,
  isExpenseCreator,
  canEditEvent,
  canEditExpense,
  assertIsEventCreator,
  assertIsExpenseCreator,
} from '@/server/policies/rbac.policy'
import { ForbiddenError } from '@/server/lib/errors'
import type { SessionUser } from '@/server/types'

describe('Resource Ownership & Multi-Tenancy Unit Tests', () => {
  const clubAId = 'club-coding-id'
  const clubBId = 'club-robotics-id'
  const acmClubId = 'club-acm-id'

  const clubRepA: SessionUser = {
    id: 'user-rep-a',
    email: 'rep.a@college.edu',
    name: 'Club Rep A',
    role: UserRole.CLUB_REP,
    clubId: clubAId,
  }

  // Peer club rep belonging to the EXACT same club
  const clubRepA2: SessionUser = {
    id: 'user-rep-a2',
    email: 'rep.a2@college.edu',
    name: 'Club Rep A2 (Peer in Club A)',
    role: UserRole.CLUB_REP,
    clubId: clubAId,
  }

  const clubRepB: SessionUser = {
    id: 'user-rep-b',
    email: 'rep.b@college.edu',
    name: 'Club Rep B',
    role: UserRole.CLUB_REP,
    clubId: clubBId,
  }

  const acmCoreUser: SessionUser = {
    id: 'user-core',
    email: 'core@college.edu',
    name: 'ACM Core',
    role: UserRole.ACM_CORE,
    clubId: acmClubId,
  }

  const superAdminUser: SessionUser = {
    id: 'user-admin',
    email: 'admin@college.edu',
    name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    clubId: acmClubId,
  }

  const viewerUser: SessionUser = {
    id: 'user-viewer',
    email: 'viewer@college.edu',
    name: 'Viewer',
    role: UserRole.VIEWER,
    clubId: null,
  }

  describe('canAccessClub predicate', () => {
    it('CLUB_REP can access their own club', () => {
      expect(canAccessClub(clubRepA, clubAId)).toBe(true)
    })

    it('CLUB_REP CANNOT access another club (even if clubId is supplied in request)', () => {
      expect(canAccessClub(clubRepA, clubBId)).toBe(false)
      expect(canAccessClub(clubRepA, acmClubId)).toBe(false)
    })

    it('ACM_CORE can access any club (institutional oversight)', () => {
      expect(canAccessClub(acmCoreUser, clubAId)).toBe(true)
      expect(canAccessClub(acmCoreUser, clubBId)).toBe(true)
      expect(canAccessClub(acmCoreUser, acmClubId)).toBe(true)
    })

    it('SUPER_ADMIN can access any club', () => {
      expect(canAccessClub(superAdminUser, clubAId)).toBe(true)
      expect(canAccessClub(superAdminUser, clubBId)).toBe(true)
    })

    it('VIEWER cannot access any club', () => {
      expect(canAccessClub(viewerUser, clubAId)).toBe(false)
      expect(canAccessClub(viewerUser, clubBId)).toBe(false)
    })

    it('assertCanAccessClub throws ForbiddenError on cross-club attempt', () => {
      expect(() => assertCanAccessClub(clubRepA, clubBId)).toThrowError(ForbiddenError)
      expect(() => assertCanAccessClub(clubRepA, clubAId)).not.toThrow()
    })
  })

  describe('canManageEvent ownership', () => {
    const eventClubA = { id: 'evt-1', clubId: clubAId }
    const eventClubB = { id: 'evt-2', clubId: clubBId }

    it('CLUB_REP of Club A can manage events belonging to Club A', () => {
      expect(canManageEvent(clubRepA, eventClubA)).toBe(true)
    })

    it('CLUB_REP of Club A CANNOT manage events belonging to Club B', () => {
      expect(canManageEvent(clubRepA, eventClubB)).toBe(false)
    })

    it('CLUB_REP of Club B can manage events belonging to Club B but not Club A', () => {
      expect(canManageEvent(clubRepB, eventClubB)).toBe(true)
      expect(canManageEvent(clubRepB, eventClubA)).toBe(false)
    })

    it('ACM_CORE can manage events across all clubs', () => {
      expect(canManageEvent(acmCoreUser, eventClubA)).toBe(true)
      expect(canManageEvent(acmCoreUser, eventClubB)).toBe(true)
    })

    it('VIEWER cannot manage any event', () => {
      expect(canManageEvent(viewerUser, eventClubA)).toBe(false)
      expect(canManageEvent(viewerUser, eventClubB)).toBe(false)
    })
  })

  describe('canManageExpense ownership', () => {
    const expenseClubA = { id: 'exp-1', clubId: clubAId }
    const expenseClubB = { id: 'exp-2', clubId: clubBId }

    it('CLUB_REP of Club A can manage expense for Club A', () => {
      expect(canManageExpense(clubRepA, expenseClubA)).toBe(true)
    })

    it('CLUB_REP of Club A CANNOT manage expense for Club B', () => {
      expect(canManageExpense(clubRepA, expenseClubB)).toBe(false)
    })

    it('ACM_CORE can manage expenses across all clubs', () => {
      expect(canManageExpense(acmCoreUser, expenseClubA)).toBe(true)
      expect(canManageExpense(acmCoreUser, expenseClubB)).toBe(true)
    })
  })

  describe('canAcknowledgeConflict multi-party check', () => {
    const conflictBetweenAandB = {
      eventA: { clubId: clubAId },
      eventB: { clubId: clubBId },
    }

    const uninvolvedClubRep: SessionUser = {
      id: 'user-rep-c',
      email: 'rep.c@college.edu',
      name: 'Club Rep C',
      role: UserRole.CLUB_REP,
      clubId: 'club-ecell-id',
    }

    it('CLUB_REP of Club A can acknowledge a conflict involving Club A', () => {
      expect(canAcknowledgeConflict(clubRepA, conflictBetweenAandB)).toBe(true)
    })

    it('CLUB_REP of Club B can acknowledge a conflict involving Club B', () => {
      expect(canAcknowledgeConflict(clubRepB, conflictBetweenAandB)).toBe(true)
    })

    it('Uninvolved CLUB_REP CANNOT acknowledge a conflict between other clubs', () => {
      expect(canAcknowledgeConflict(uninvolvedClubRep, conflictBetweenAandB)).toBe(false)
    })

    it('ACM_CORE can acknowledge any conflict in the institution', () => {
      expect(canAcknowledgeConflict(acmCoreUser, conflictBetweenAandB)).toBe(true)
    })

    it('VIEWER cannot acknowledge any conflict', () => {
      expect(canAcknowledgeConflict(viewerUser, conflictBetweenAandB)).toBe(false)
    })
  })

  describe('Zero-Trust Creator-Only Editing (Events & Expenses)', () => {
    const draftEventA = {
      id: 'evt-draft-a',
      clubId: clubAId,
      submittedByUserId: clubRepA.id,
      status: 'DRAFT',
    }

    const submittedEventA = {
      id: 'evt-sub-a',
      clubId: clubAId,
      submittedByUserId: clubRepA.id,
      status: 'SUBMITTED',
    }

    const verifiedEventA = {
      id: 'evt-ver-a',
      clubId: clubAId,
      submittedByUserId: clubRepA.id,
      status: 'VERIFIED',
    }

    const draftExpenseA = {
      id: 'exp-draft-a',
      clubId: clubAId,
      createdByUserId: clubRepA.id,
      status: 'DRAFT',
    }

    const approvedExpenseA = {
      id: 'exp-app-a',
      clubId: clubAId,
      createdByUserId: clubRepA.id,
      status: 'APPROVED',
    }

    it('isEventCreator recognizes the authentic creator', () => {
      expect(isEventCreator(clubRepA, draftEventA)).toBe(true)
      expect(isEventCreator(clubRepA2, draftEventA)).toBe(false) // Peer in same club is NOT creator
      expect(isEventCreator(clubRepB, draftEventA)).toBe(false)
      expect(isEventCreator(acmCoreUser, draftEventA)).toBe(false)
      expect(isEventCreator(superAdminUser, draftEventA)).toBe(false)
      expect(isEventCreator(null, draftEventA)).toBe(false)
    })

    it('canEditEvent: ONLY the creator may edit ordinary draft/submitted fields', () => {
      // 1. Creator can edit their own draft or submitted event
      expect(canEditEvent(clubRepA, draftEventA)).toBe(true)
      expect(canEditEvent(clubRepA, submittedEventA)).toBe(true)

      // 2. Peer club rep in the SAME club CANNOT edit (strict creator-only!)
      expect(canEditEvent(clubRepA2, draftEventA)).toBe(false)

      // 3. Different club rep CANNOT edit
      expect(canEditEvent(clubRepB, draftEventA)).toBe(false)

      // 4. Admin/Core CANNOT edit creator fields through edit predicate (moderation only)
      expect(canEditEvent(acmCoreUser, draftEventA)).toBe(false)
      expect(canEditEvent(superAdminUser, draftEventA)).toBe(false)

      // 5. Creator CANNOT edit once event is VERIFIED (lifecycle invariant)
      expect(canEditEvent(clubRepA, verifiedEventA)).toBe(false)
    })

    it('assertIsEventCreator throws ForbiddenError when caller is not the creator', () => {
      expect(() => assertIsEventCreator(clubRepA, draftEventA)).not.toThrow()
      expect(() => assertIsEventCreator(clubRepA2, draftEventA)).toThrowError(ForbiddenError)
      expect(() => assertIsEventCreator(acmCoreUser, draftEventA)).toThrowError(ForbiddenError)
    })

    it('isExpenseCreator recognizes the authentic creator', () => {
      expect(isExpenseCreator(clubRepA, draftExpenseA)).toBe(true)
      expect(isExpenseCreator(clubRepA2, draftExpenseA)).toBe(false) // Peer in same club is NOT creator
      expect(isExpenseCreator(clubRepB, draftExpenseA)).toBe(false)
      expect(isExpenseCreator(acmCoreUser, draftExpenseA)).toBe(false)
      expect(isExpenseCreator(superAdminUser, draftExpenseA)).toBe(false)
    })

    it('canEditExpense: ONLY the creator may edit ordinary draft fields', () => {
      // 1. Creator can edit their own draft expense
      expect(canEditExpense(clubRepA, draftExpenseA)).toBe(true)

      // 2. Peer club rep in the SAME club CANNOT edit
      expect(canEditExpense(clubRepA2, draftExpenseA)).toBe(false)

      // 3. Different club rep CANNOT edit
      expect(canEditExpense(clubRepB, draftExpenseA)).toBe(false)

      // 4. Admin/Core CANNOT edit creator fields through edit predicate (moderation only)
      expect(canEditExpense(acmCoreUser, draftExpenseA)).toBe(false)
      expect(canEditExpense(superAdminUser, draftExpenseA)).toBe(false)

      // 5. Creator CANNOT edit once expense is APPROVED
      expect(canEditExpense(clubRepA, approvedExpenseA)).toBe(false)
    })

    it('assertIsExpenseCreator throws ForbiddenError when caller is not the creator', () => {
      expect(() => assertIsExpenseCreator(clubRepA, draftExpenseA)).not.toThrow()
      expect(() => assertIsExpenseCreator(clubRepA2, draftExpenseA)).toThrowError(ForbiddenError)
      expect(() => assertIsExpenseCreator(acmCoreUser, draftExpenseA)).toThrowError(ForbiddenError)
    })
  })
})
