/**
 * RBAC Service - Role-Based Access Control
 *
 * Fetch role and permission information via lambda tRPC interface.
 *
 * @example
 * ```typescript
 * import { rbacService } from '@/services/rbac';
 *
 * // Get current user roles list
 * const roles = await rbacService.getCurrentUserRoles();
 *
 * // Get current user all permission codes
 * const permissionCodes = await rbacService.getCurrentUserPermissionCodes();
 *
 * // Get current user permission details (with role info)
 * const permissions = await rbacService.getUserPermissionDetails();
 * ```
 */
import type { UserPermissionInfo } from '@/database/models/rbac';
import type { PermissionItem, RoleItem } from '@/database/schemas/rbac';
import { lambdaClient } from '@/libs/trpc/client';

/**
 * User role information
 */
export type UserRole = RoleItem;

/**
 * Permission information
 */
export type Permission = PermissionItem;

/**
 * RBAC (Role-Based Access Control) Service
 * Provides role and permission related functionality
 */
class RbacService {
  /**
   * Get current logged-in user's role list
   */
  getCurrentUserRoles = async (): Promise<UserRole[]> => {
    return lambdaClient.rbac.getCurrentUserRoles.query();
  };

  /**
   * Get current user's all permission codes
   */
  getCurrentUserPermissionCodes = async (): Promise<string[]> => {
    return lambdaClient.rbac.getCurrentUserPermissionCodes.query();
  };

  /**
   * Get user permission details (including role name, category, etc.)
   */
  getUserPermissionDetails = async (userId?: string): Promise<UserPermissionInfo[]> => {
    return lambdaClient.rbac.getUserPermissionDetails.query(
      userId ? { userId } : undefined,
    ) as Promise<UserPermissionInfo[]>;
  };
}

export const rbacService = new RbacService();
