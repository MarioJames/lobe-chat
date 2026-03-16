import type { RbacStoreState } from '@/store/rbac/initialState';

/**
 * Get current user's role list
 */
const currentUserRoles = (s: RbacStoreState) => s.currentUserRoles;

/**
 * Get current user's permission codes list
 */
const currentUserPermissionCodes = (s: RbacStoreState) => s.currentUserPermissionCodes;

/**
 * Check if current user has specified permission code
 * @param permissionCode Permission code
 */
const hasPermission = (permissionCode: string) => (s: RbacStoreState) =>
  s.currentUserPermissionCodes.includes(permissionCode);

/**
 * Check if current user has any of the specified permission codes
 * @param permissionCodes Permission codes array
 */
const hasAnyPermission = (permissionCodes: string[]) => (s: RbacStoreState) =>
  permissionCodes.some((code) => s.currentUserPermissionCodes.includes(code));

/**
 * Check if current user has all of the specified permission codes
 * @param permissionCodes Permission codes array
 */
const hasAllPermissions = (permissionCodes: string[]) => (s: RbacStoreState) =>
  permissionCodes.every((code) => s.currentUserPermissionCodes.includes(code));

/**
 * Check if current user has specified role
 * @param roleId Role ID
 */
const hasRole = (roleId: string) => (s: RbacStoreState) =>
  s.currentUserRoles.some((role) => role.id === roleId && role.isActive);

/**
 * Check if current user has specified role name
 * @param roleName Role name
 */
const hasRoleName = (roleName: string) => (s: RbacStoreState) =>
  s.currentUserRoles.some((role) => role.name === roleName && role.isActive);

/**
 * Get whether roles are initialized
 */
const isRolesInitialized = (s: RbacStoreState) => s.initRoles;

/**
 * Get whether permission codes are initialized
 */
const isPermissionCodesInitialized = (s: RbacStoreState) => s.initPermissionCodes;

export const rbacSelectors = {
  currentUserPermissionCodes,
  currentUserRoles,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  hasRoleName,
  isPermissionCodesInitialized,
  isRolesInitialized,
};
