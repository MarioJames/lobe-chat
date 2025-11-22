/**
 * RBAC Service - Role-Based Access Control
 *
 * This service provides methods to interact with the RBAC system,
 * including fetching user roles, role permissions, and checking permissions.
 *
 * @example
 * ```typescript
 * import { rbacService } from '@/services/rbac';
 *
 * // Get current user's roles
 * const roles = await rbacService.getCurrentUserRoles();
 *
 * // Get current user's permission codes
 * const permissionCodes = await rbacService.getCurrentUserPermissionCodes();
 *
 * // Check if user has a specific permission
 * const canRead = await rbacService.hasPermission('FILE_READ');
 *
 * // Check if user has any of the permissions
 * const canManageFiles = await rbacService.hasAnyPermission(['FILE_CREATE', 'FILE_UPDATE']);
 *
 * // Check if user has all of the permissions
 * const isAdmin = await rbacService.hasAllPermissions(['USER_READ', 'USER_CREATE', 'USER_UPDATE']);
 * ```
 */
import { createHeaderWithAuth } from './_auth';

/**
 * 用户角色信息
 */
export interface UserRole {
  active: boolean;
  createdAt: string;
  description?: string;
  expiresAt?: string;
  id: number;
  name: string;
  system: boolean;
  updatedAt: string;
}

/**
 * 用户角色列表响应
 */
export interface UserRolesResponse {
  data: {
    roles: UserRole[];
  };
  message: string;
  success: boolean;
}

/**
 * 权限信息
 */
export interface Permission {
  active: boolean;
  category: string;
  code: string;
  createdAt: string;
  description?: string;
  id: number;
  name: string;
  scope: string;
  updatedAt: string;
}

/**
 * 角色权限列表响应
 */
export interface RolePermissionsResponse {
  data: {
    items: Permission[];
    page: number;
    pageSize: number;
    total: number;
  };
  message: string;
  success: boolean;
}

/**
 * RBAC (Role-Based Access Control) Service
 * 提供角色和权限相关的功能
 */
class RbacService {
  /**
   * 获取当前登录用户的角色列表
   * GET /api/v1/users/me/roles
   */
  getCurrentUserRoles = async (): Promise<UserRole[]> => {
    const headers = await createHeaderWithAuth({
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await fetch('/api/v1/users/me/roles', {
      headers,
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to fetch current user roles: ${error}`);
    }

    const response: UserRolesResponse = await res.json();
    return response.data.roles;
  };

  /**
   * 获取指定用户的角色列表
   * GET /api/v1/users/:userId/roles
   */
  getUserRoles = async (userId: string): Promise<UserRole[]> => {
    const headers = await createHeaderWithAuth({
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await fetch(`/api/v1/users/${userId}/roles`, {
      headers,
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to fetch user roles: ${error}`);
    }

    const response: UserRolesResponse = await res.json();
    return response.data.roles;
  };

  /**
   * 获取指定角色的权限列表
   * GET /api/v1/roles/:roleId/permissions
   */
  getRolePermissions = async (
    roleId: number,
    params?: {
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<RolePermissionsResponse['data']> => {
    const headers = await createHeaderWithAuth({
      headers: { 'Content-Type': 'application/json' },
    });

    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const url = `/api/v1/roles/${roleId}/permissions${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers,
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to fetch role permissions: ${error}`);
    }

    const response: RolePermissionsResponse = await res.json();
    return response.data;
  };

  /**
   * 获取当前用户的所有权限代码
   * 通过获取用户所有角色，再获取每个角色的权限，最后合并所有权限代码
   */
  getCurrentUserPermissionCodes = async (): Promise<string[]> => {
    try {
      // 1. 获取当前用户的所有角色
      const roles = await this.getCurrentUserRoles();

      if (!roles || roles.length === 0) {
        return [];
      }

      // 2. 获取所有激活角色的权限
      const activeRoles = roles.filter((role) => role.active);

      // 并行获取所有角色的权限
      const permissionsPromises = activeRoles.map((role) => this.getRolePermissions(role.id));

      const permissionsResults = await Promise.allSettled(permissionsPromises);

      // 3. 合并所有权限代码（去重）
      const permissionCodes = new Set<string>();

      for (const result of permissionsResults) {
        if (result.status === 'fulfilled') {
          const permissions = result.value.items;
          permissions.forEach((permission) => {
            if (permission.active) {
              permissionCodes.add(permission.code);
            }
          });
        }
      }

      return Array.from(permissionCodes);
    } catch (error) {
      console.error('Failed to get current user permission codes:', error);
      throw error;
    }
  };

  /**
   * 检查当前用户是否拥有指定权限
   * @param permissionCode 权限代码
   */
  hasPermission = async (permissionCode: string): Promise<boolean> => {
    try {
      const permissionCodes = await this.getCurrentUserPermissionCodes();
      return permissionCodes.includes(permissionCode);
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  };

  /**
   * 检查当前用户是否拥有任意一个指定权限
   * @param permissionCodes 权限代码数组
   */
  hasAnyPermission = async (permissionCodes: string[]): Promise<boolean> => {
    try {
      const userPermissionCodes = await this.getCurrentUserPermissionCodes();
      return permissionCodes.some((code) => userPermissionCodes.includes(code));
    } catch (error) {
      console.error('Failed to check any permission:', error);
      return false;
    }
  };

  /**
   * 检查当前用户是否拥有所有指定权限
   * @param permissionCodes 权限代码数组
   */
  hasAllPermissions = async (permissionCodes: string[]): Promise<boolean> => {
    try {
      const userPermissionCodes = await this.getCurrentUserPermissionCodes();
      return permissionCodes.every((code) => userPermissionCodes.includes(code));
    } catch (error) {
      console.error('Failed to check all permissions:', error);
      return false;
    }
  };
}

export const rbacService = new RbacService();
