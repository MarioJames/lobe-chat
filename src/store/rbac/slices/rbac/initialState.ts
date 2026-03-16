import type { UserRole } from '@/services/rbac';

export interface RbacState {
  /**
   * Current user's permission codes list
   */
  currentUserPermissionCodes: string[];
  /**
   * Current user's role list
   */
  currentUserRoles: UserRole[];
  /**
   * Whether permission codes are initialized
   */
  initPermissionCodes: boolean;
  /**
   * Whether roles are initialized
   */
  initRoles: boolean;
}

export const initialRbacState: RbacState = {
  currentUserPermissionCodes: [],
  currentUserRoles: [],
  initPermissionCodes: false,
  initRoles: false,
};
