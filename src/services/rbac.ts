/**
 * RBAC Service - Role-Based Access Control
 *
 * 通过 lambda tRPC 接口获取角色与权限信息。
 *
 * @example
 * ```typescript
 * import { rbacService } from '@/services/rbac';
 *
 * // 获取当前用户角色列表
 * const roles = await rbacService.getCurrentUserRoles();
 *
 * // 获取当前用户所有权限代码
 * const permissionCodes = await rbacService.getCurrentUserPermissionCodes();
 *
 * // 获取当前用户权限详情（含角色信息）
 * const permissions = await rbacService.getUserPermissionDetails();
 * ```
 */
import type { UserPermissionInfo } from '@/database/models/rbac';
import type { PermissionItem, RoleItem } from '@/database/schemas/rbac';
import { lambdaClient } from '@/libs/trpc/client';

/**
 * 用户角色信息
 */
export type UserRole = RoleItem;

/**
 * 权限信息
 */
export type Permission = PermissionItem;

/**
 * RBAC (Role-Based Access Control) Service
 * 提供角色和权限相关的功能
 */
class RbacService {
  /**
   * 获取当前登录用户的角色列表
   */
  getCurrentUserRoles = async (): Promise<UserRole[]> => {
    return lambdaClient.rbac.getCurrentUserRoles.query();
  };

  /**
   * 获取当前用户的所有权限代码
   */
  getCurrentUserPermissionCodes = async (): Promise<string[]> => {
    return lambdaClient.rbac.getCurrentUserPermissionCodes.query();
  };

  /**
   * 获取用户权限详情（包含角色名称、类别等）
   */
  getUserPermissionDetails = async (userId?: string): Promise<UserPermissionInfo[]> => {
    return lambdaClient.rbac.getUserPermissionDetails.query(
      userId ? { userId } : undefined,
    ) as Promise<UserPermissionInfo[]>;
  };
}

export const rbacService = new RbacService();
