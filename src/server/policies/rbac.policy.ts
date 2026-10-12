import { UserRole } from '@prisma/client'
import { ForbiddenError } from '@/server/lib/errors'
import type { SessionUser } from '@/server/types'

/**
 * Centralized Action definitions for the ACM Incursion system.
 * Security boundary: All authorization decisions must evaluate through these actions.
 */
export type Action =
  | 'VIEW_CALENDAR'
  | 'VIEW_EVENT'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'SUBMIT_EVENT'
  | 'VERIFY_EVENT'
  | 'REJECT_EVENT'
  | 'CANCEL_EVENT'
  | 'ACKNOWLEDGE_CONFLICT'
  | 'RESOLVE_CONFLICT'
  | 'OVERRIDE_CONFLICT'
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'APPROVE_EXPENSE'
  | 'REJECT_EXPENSE'
  | 'VIEW_BUDGET'
  | 'MANAGE_BUDGET'
  | 'LOCK_SEMESTER'
  | 'VIEW_ARCHIVE'
  | 'VIEW_REPORTS'
  | 'VIEW_AUDIT'

/**
 * Role-Based Access Control (RBAC) Permission Matrix.
 * Maps every system role to its allowable set of high-level actions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Action[]> = {
  SUPER_ADMIN: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
    'CREATE_EVENT',
    'UPDATE_EVENT',
    'SUBMIT_EVENT',
    'VERIFY_EVENT',
    'REJECT_EVENT',
    'CANCEL_EVENT',
    'ACKNOWLEDGE_CONFLICT',
    'RESOLVE_CONFLICT',
    'OVERRIDE_CONFLICT',
    'CREATE_EXPENSE',
    'UPDATE_EXPENSE',
    'APPROVE_EXPENSE',
    'REJECT_EXPENSE',
    'VIEW_BUDGET',
    'MANAGE_BUDGET',
    'LOCK_SEMESTER',
    'VIEW_ARCHIVE',
    'VIEW_REPORTS',
    'VIEW_AUDIT',
  ],

  ACM_CORE: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
    'CREATE_EVENT',
    'UPDATE_EVENT',
    'SUBMIT_EVENT',
    'VERIFY_EVENT',
    'REJECT_EVENT',
    'CANCEL_EVENT',
    'ACKNOWLEDGE_CONFLICT',
    'RESOLVE_CONFLICT',
    'OVERRIDE_CONFLICT',
    'CREATE_EXPENSE',
    'UPDATE_EXPENSE',
    'APPROVE_EXPENSE',
    'REJECT_EXPENSE',
    'VIEW_BUDGET',
    'MANAGE_BUDGET',
    'LOCK_SEMESTER',
    'VIEW_ARCHIVE',
    'VIEW_REPORTS',
    'VIEW_AUDIT',
  ],

  ACM_EXEC: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
    'CREATE_EVENT',
    'UPDATE_EVENT',
    'SUBMIT_EVENT',
    'CREATE_EXPENSE',
    'UPDATE_EXPENSE',
    'VIEW_BUDGET',
    'VIEW_ARCHIVE',
    'VIEW_REPORTS',
  ],

  CLUB_REP: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
    'CREATE_EVENT',
    'UPDATE_EVENT',
    'SUBMIT_EVENT',
    'ACKNOWLEDGE_CONFLICT',
    'CREATE_EXPENSE',
    'UPDATE_EXPENSE',
  ],

  VIEWER: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
  ],
}

/**
 * Pure predicate: Checks if a user's role grants permission for a given action.
 */
export function can(
  user: { role: UserRole } | null | undefined,
  action: Action
): boolean {
  if (!user || !user.role) {
    return false
  }

  const permissions = ROLE_PERMISSIONS[user.role]
  return permissions ? permissions.includes(action) : false
}

/**
 * Ownership predicate: Determines if a user has authority to act on behalf of a specific club.
 *
 * Rules:
 * - SUPER_ADMIN & ACM_CORE: Have institutional jurisdiction across all clubs.
 * - ACM_EXEC: Can only act for ACM (or their assigned club).
 * - CLUB_REP: Strictly isolated to their authenticated clubId.
 * - VIEWER: Has no club administration access.
 */
export function canAccessClub(
  user: SessionUser | null | undefined,
  targetClubId: string | null | undefined
): boolean {
  if (!user || !targetClubId) {
    return false
  }

  // Institutional authorities can operate across any club
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ACM_CORE) {
    return true
  }

  // Club representatives and executives can ONLY operate on their own club
  if (user.role === UserRole.CLUB_REP || user.role === UserRole.ACM_EXEC) {
    return !!user.clubId && user.clubId === targetClubId
  }

  return false
}

/**
 * Resource-aware event ownership check.
 * Verifies that the user has the UPDATE_EVENT permission AND access to the event's owning club.
 */
export function canManageEvent(
  user: SessionUser | null | undefined,
  event: { clubId: string }
): boolean {
  if (!user) return false
  if (!can(user, 'UPDATE_EVENT')) return false
  return canAccessClub(user, event.clubId)
}

/**
 * Creator ownership predicate for events.
 * Strict zero-trust: Verifies that the authenticated user is the exact author who submitted the event.
 */
export function isEventCreator(
  user: SessionUser | null | undefined,
  event: { submittedByUserId: string }
): boolean {
  if (!user || !user.id) return false
  return user.id === event.submittedByUserId
}

/**
 * Pure predicate: Evaluates whether a user may edit an event's ordinary editable fields.
 * Rules:
 * 1. Must hold UPDATE_EVENT permission.
 * 2. Must be the authenticated creator (submittedByUserId === user.id).
 * 3. Must have jurisdiction over the event's club.
 * 4. Event must be in an editable lifecycle status (DRAFT or SUBMITTED).
 */
export function canEditEvent(
  user: SessionUser | null | undefined,
  event: { submittedByUserId: string; clubId: string; status: string }
): boolean {
  if (!user) return false
  if (!can(user, 'UPDATE_EVENT')) return false
  if (!isEventCreator(user, event)) return false
  if (!canAccessClub(user, event.clubId)) return false
  return event.status === 'DRAFT' || event.status === 'SUBMITTED'
}

/**
 * Resource-aware expense ownership check.
 * Verifies that the user has UPDATE_EXPENSE permission AND access to the expense's owning club.
 */
export function canManageExpense(
  user: SessionUser | null | undefined,
  expense: { clubId: string }
): boolean {
  if (!user) return false
  if (!can(user, 'UPDATE_EXPENSE')) return false
  return canAccessClub(user, expense.clubId)
}

/**
 * Creator ownership predicate for expenses.
 * Strict zero-trust: Verifies that the authenticated user is the exact author who created the expense.
 */
export function isExpenseCreator(
  user: SessionUser | null | undefined,
  expense: { createdByUserId: string }
): boolean {
  if (!user || !user.id) return false
  return user.id === expense.createdByUserId
}

/**
 * Pure predicate: Evaluates whether a user may edit an expense's ordinary editable fields.
 * Rules:
 * 1. Must hold UPDATE_EXPENSE permission.
 * 2. Must be the authenticated creator (createdByUserId === user.id).
 * 3. Must have jurisdiction over the expense's club.
 * 4. Expense must be in an editable lifecycle status (DRAFT or REJECTED).
 */
export function canEditExpense(
  user: SessionUser | null | undefined,
  expense: { createdByUserId: string; clubId: string; status: string }
): boolean {
  if (!user) return false
  if (!can(user, 'UPDATE_EXPENSE')) return false
  if (!isExpenseCreator(user, expense)) return false
  if (!canAccessClub(user, expense.clubId)) return false
  return expense.status === 'DRAFT' || expense.status === 'REJECTED'
}

/**
 * Assert helper: Throws ForbiddenError if user is not the event creator.
 */
export function assertIsEventCreator(
  user: SessionUser | null | undefined,
  event: { submittedByUserId: string },
  customMessage?: string
): void {
  if (!isEventCreator(user, event)) {
    throw new ForbiddenError(
      customMessage ?? 'Forbidden: Only the event creator can modify this event.'
    )
  }
}

/**
 * Assert helper: Throws ForbiddenError if user is not the expense creator.
 */
export function assertIsExpenseCreator(
  user: SessionUser | null | undefined,
  expense: { createdByUserId: string },
  customMessage?: string
): void {
  if (!isExpenseCreator(user, expense)) {
    throw new ForbiddenError(
      customMessage ?? 'Forbidden: Only the expense creator can modify this expense.'
    )
  }
}

/**
 * Resource-aware conflict acknowledgment check.
 * A conflict involves eventA and eventB.
 * - SUPER_ADMIN and ACM_CORE can acknowledge any conflict.
 * - CLUB_REP can acknowledge if they represent the club of eventA OR eventB.
 */
export function canAcknowledgeConflict(
  user: SessionUser | null | undefined,
  conflict: { eventA: { clubId: string }; eventB: { clubId: string } }
): boolean {
  if (!user) return false
  if (!can(user, 'ACKNOWLEDGE_CONFLICT')) return false

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ACM_CORE) {
    return true
  }

  if (user.role === UserRole.CLUB_REP && user.clubId) {
    return user.clubId === conflict.eventA.clubId || user.clubId === conflict.eventB.clubId
  }

  return false
}

/**
 * Assert helper: Throws ForbiddenError if user cannot perform action.
 */
export function assertCan(
  user: SessionUser | null | undefined,
  action: Action,
  customMessage?: string
): void {
  if (!can(user, action)) {
    throw new ForbiddenError(
      customMessage ?? `Forbidden: User with role '${user?.role ?? 'ANONYMOUS'}' lacks permission '${action}'`
    )
  }
}

/**
 * Assert helper: Throws ForbiddenError if user cannot access club.
 */
export function assertCanAccessClub(
  user: SessionUser | null | undefined,
  targetClubId: string,
  customMessage?: string
): void {
  if (!canAccessClub(user, targetClubId)) {
    throw new ForbiddenError(
      customMessage ?? `Forbidden: Cannot act on behalf of club '${targetClubId}'`
    )
  }
}

/**
 * Resource-aware archive access check.
 * - SUPER_ADMIN, ACM_CORE, ACM_EXEC: Have institutional archive access.
 * - CLUB_REP: Permitted if archive query is scoped to their own club.
 * - VIEWER: Denied.
 */
export function canViewArchive(
  user: SessionUser | null | undefined,
  targetClubId?: string | null
): boolean {
  if (!user) return false
  if (can(user, 'VIEW_ARCHIVE')) {
    return true
  }
  if (user.role === UserRole.CLUB_REP && user.clubId) {
    return !targetClubId || targetClubId === user.clubId
  }
  return false
}

/**
 * Resource-aware reports access check.
 * - SUPER_ADMIN, ACM_CORE, ACM_EXEC: Have institutional reports access.
 * - CLUB_REP: Permitted if reports query is scoped to their own club.
 * - VIEWER: Denied.
 */
export function canViewReports(
  user: SessionUser | null | undefined,
  targetClubId?: string | null
): boolean {
  if (!user) return false
  if (can(user, 'VIEW_REPORTS')) {
    return true
  }
  if (user.role === UserRole.CLUB_REP && user.clubId) {
    return !targetClubId || targetClubId === user.clubId
  }
  return false
}

/**
 * Resource-aware audit log access check.
 * - Strictly restricted to SUPER_ADMIN and ACM_CORE.
 */
export function canViewAudit(
  user: SessionUser | null | undefined
): boolean {
  if (!user) return false
  return can(user, 'VIEW_AUDIT')
}

export function assertCanViewArchive(
  user: SessionUser | null | undefined,
  targetClubId?: string | null
): void {
  if (!canViewArchive(user, targetClubId)) {
    throw new ForbiddenError(
      `Forbidden: User with role '${user?.role ?? 'ANONYMOUS'}' cannot view archive${targetClubId ? ` for club '${targetClubId}'` : ''}`
    )
  }
}

export function assertCanViewReports(
  user: SessionUser | null | undefined,
  targetClubId?: string | null
): void {
  if (!canViewReports(user, targetClubId)) {
    throw new ForbiddenError(
      `Forbidden: User with role '${user?.role ?? 'ANONYMOUS'}' cannot view reports${targetClubId ? ` for club '${targetClubId}'` : ''}`
    )
  }
}

export function assertCanViewAudit(
  user: SessionUser | null | undefined
): void {
  if (!canViewAudit(user)) {
    throw new ForbiddenError(
      `Forbidden: User with role '${user?.role ?? 'ANONYMOUS'}' lacks permission to view audit logs`
    )
  }
}
