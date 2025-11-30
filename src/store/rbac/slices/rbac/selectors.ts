import { RbacStoreState } from '@/store/rbac/initialState';

/**
 * 获取当前用户的角色列表
 */
const currentUserRoles = (s: RbacStoreState) => s.currentUserRoles;

/**
 * 获取当前用户的权限代码列表
 */
const currentUserPermissionCodes = (s: RbacStoreState) => s.currentUserPermissionCodes;

/**
 * 检查当前用户是否拥有指定权限代码
 * @param permissionCode 权限代码
 */
const hasPermission = (permissionCode: string) => (s: RbacStoreState) =>
  s.currentUserPermissionCodes.includes(permissionCode);

/**
 * 检查当前用户是否拥有任意一个权限代码
 * @param permissionCodes 权限代码数组
 */
const hasAnyPermission = (permissionCodes: string[]) => (s: RbacStoreState) =>
  permissionCodes.some((code) => s.currentUserPermissionCodes.includes(code));

/**
 * 检查当前用户是否拥有所有权限代码
 * @param permissionCodes 权限代码数组
 */
const hasAllPermissions = (permissionCodes: string[]) => (s: RbacStoreState) =>
  permissionCodes.every((code) => s.currentUserPermissionCodes.includes(code));

/**
 * 检查当前用户是否拥有指定角色
 * @param roleId 角色ID
 */
const hasRole = (roleId: number) => (s: RbacStoreState) =>
  s.currentUserRoles.some((role) => role.id === roleId && role.isActive);

/**
 * 检查当前用户是否拥有指定角色名称
 * @param roleName 角色名称
 */
const hasRoleName = (roleName: string) => (s: RbacStoreState) =>
  s.currentUserRoles.some((role) => role.name === roleName && role.isActive);

/**
 * 获取角色列表是否已初始化
 */
const isRolesInitialized = (s: RbacStoreState) => s.initRoles;

/**
 * 获取权限代码是否已初始化
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
