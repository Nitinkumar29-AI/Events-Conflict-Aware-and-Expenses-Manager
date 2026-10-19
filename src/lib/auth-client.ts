export type UserRoleType =
  | 'SUPER_ADMIN'
  | 'ACM_CORE'
  | 'ACM_EXEC'
  | 'CLUB_REP'
  | 'MEMBER'
  | 'VIEWER'

export type ClientAction =
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

export const ROLE_PERMISSIONS: Record<UserRoleType, readonly ClientAction[]> = {
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
  MEMBER: [
    'VIEW_CALENDAR',
    'VIEW_EVENT',
  ],
}

export function canClient(role?: string | null, action?: ClientAction): boolean {
  if (!role || !action) return false
  const permissions = ROLE_PERMISSIONS[role as UserRoleType]
  return permissions ? permissions.includes(action) : false
}

export function canManageClubResource(
  userRole?: string | null,
  userClubId?: string | null,
  resourceClubId?: string | null
): boolean {
  if (!userRole) return false
  if (userRole === 'SUPER_ADMIN' || userRole === 'ACM_CORE') return true
  if (userRole === 'CLUB_REP' || userRole === 'ACM_EXEC') {
    return !!userClubId && !!resourceClubId && userClubId === resourceClubId
  }
  return false
}

/**
 * Pure helper: Determines if the current authenticated user matches the record creator.
 */
export function isRecordCreator(
  userId?: string | null,
  creatorId?: string | null
): boolean {
  if (!userId || !creatorId) return false
  return userId === creatorId
}

/**
 * Client predicate for event editing:
 * 1. Must be the authenticated creator (submittedByUserId).
 * 2. Must hold UPDATE_EVENT permission.
 * 3. Must have club jurisdiction.
 * 4. Must be in editable lifecycle status (DRAFT or SUBMITTED).
 */
export function canEditEventClient(
  userId?: string | null,
  userRole?: string | null,
  userClubId?: string | null,
  event?: {
    submittedByUserId?: string | null
    submittedBy?: { id: string } | null
    clubId: string
    status: string
  } | null
): boolean {
  if (!userId || !userRole || !event) return false
  const creatorId = event.submittedByUserId ?? event.submittedBy?.id
  if (creatorId !== userId) return false
  if (!canClient(userRole, 'UPDATE_EVENT')) return false
  if (!canManageClubResource(userRole, userClubId, event.clubId)) return false
  return event.status === 'DRAFT' || event.status === 'SUBMITTED'
}

/**
 * Client predicate for expense editing:
 * 1. Must be the authenticated creator (createdByUserId).
 * 2. Must hold UPDATE_EXPENSE permission.
 * 3. Must have club jurisdiction.
 * 4. Must be in editable lifecycle status (DRAFT or REJECTED).
 */
export function canEditExpenseClient(
  userId?: string | null,
  userRole?: string | null,
  userClubId?: string | null,
  expense?: {
    createdByUserId?: string | null
    createdBy?: { id: string } | null
    clubId: string
    status: string
  } | null
): boolean {
  if (!userId || !userRole || !expense) return false
  const creatorId = expense.createdByUserId ?? expense.createdBy?.id
  if (creatorId !== userId) return false
  if (!canClient(userRole, 'UPDATE_EXPENSE')) return false
  if (!canManageClubResource(userRole, userClubId, expense.clubId)) return false
  return expense.status === 'DRAFT' || expense.status === 'REJECTED'
}
