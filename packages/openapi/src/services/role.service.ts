import { SQL, and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { RoleItem, permissions, rolePermissions, roles, userRoles } from '@/database/schemas/rbac';
import { LobeChatDatabase } from '@/database/type';

import { BaseService } from '../common/base.service';
import { processPaginationConditions } from '../helpers/pagination';
import { ServiceResult } from '../types';
import {
  CreateRoleRequest,
  RolePermissionsListRequest,
  RolePermissionsListResponse,
  RolesListQuery,
  RolesListResponse,
  UpdateRolePermissionsRequest,
  UpdateRoleRequest,
} from '../types/role.type';

export class RoleService extends BaseService {
  constructor(db: LobeChatDatabase, userId: string | null) {
    super(db, userId);
  }

  /**
   * Get all roles in the system
   * @returns Promise<RoleItem[]> - Array of all roles
   */
  async getRoles(request: RolesListQuery): ServiceResult<RolesListResponse> {
    try {
      // 权限检查
      const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_READ');
      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权访问角色列表');
      }

      const conditions = [];

      if (request?.active) {
        conditions.push(eq(roles.isActive, request.active));
      }

      if (request?.system) {
        conditions.push(eq(roles.isSystem, request.system));
      }

      if (request?.keyword) {
        conditions.push(
          or(
            ilike(roles.name, `%${request.keyword}%`),
            ilike(roles.displayName, `%${request.keyword}%`),
          ),
        );
      }

      const { limit, offset } = processPaginationConditions(request);

      const whereExpr = conditions.length ? and(...conditions) : undefined;

      const [listResult, totalResult] = await Promise.all([
        this.db.query.roles.findMany({
          limit,
          offset,
          orderBy: [roles.isSystem, roles.createdAt],
          where: whereExpr,
        }),
        this.db.select({ count: count() }).from(roles).where(whereExpr),
      ]);

      return {
        roles: listResult,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      this.handleServiceError(error, '获取角色列表');
    }
  }

  /**
   * Get all active roles in the system
   * @returns Promise<RoleItem[]> - Array of active roles
   */
  async getActiveRoles(): ServiceResult<RoleItem[]> {
    // 权限检查
    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_READ');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权访问活跃角色列表');
    }

    try {
      return await this.db.query.roles.findMany({
        orderBy: [roles.isSystem, roles.createdAt],
        where: eq(roles.isActive, true),
      });
    } catch (error) {
      this.handleServiceError(error, '获取活跃角色列表');
    }
  }

  /**
   * Get role by ID
   * @param id - Role ID
   * @returns Promise<RoleItem | undefined> - Role item or undefined if not found
   */
  async getRoleById(id: number): ServiceResult<RoleItem | null> {
    // 权限检查
    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_READ');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权访问此角色');
    }

    try {
      const role = await this.db.query.roles.findFirst({
        where: eq(roles.id, id),
      });
      return role || null;
    } catch (error) {
      this.handleServiceError(error, '获取角色详情');
    }
  }

  /**
   * Get role by name
   * @param name - Role name
   * @returns Promise<RoleItem | undefined> - Role item or undefined if not found
   */
  async getRoleByName(name: string): ServiceResult<RoleItem | null> {
    // 权限检查
    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_READ');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权访问此角色');
    }

    try {
      const role = await this.db.query.roles.findFirst({
        where: eq(roles.name, name),
      });
      return role || null;
    } catch (error) {
      this.handleServiceError(error, '获取角色详情');
    }
  }

  /**
   * Create a new role
   */
  async createRole(payload: CreateRoleRequest): ServiceResult<RoleItem> {
    this.log('info', '创建角色', { payload });

    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_CREATE');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权创建角色');
    }

    try {
      return await this.db.transaction(async (tx) => {
        // Ensure role name is unique
        const existingRole = await tx.query.roles.findFirst({
          where: eq(roles.name, payload.name),
        });
        if (existingRole) {
          throw this.createBusinessError(`角色名称 "${payload.name}" 已存在`);
        }

        const [createdRole] = await tx
          .insert(roles)
          .values({
            description: payload.description ?? null,
            displayName: payload.displayName,
            isActive: payload.isActive ?? true,
            isSystem: payload.isSystem ?? false,
            name: payload.name,
          })
          .returning();

        this.log('info', '角色创建成功', { roleId: createdRole.id, roleName: createdRole.name });
        return createdRole;
      });
    } catch (error) {
      this.handleServiceError(error, '创建角色');
    }
  }

  /**
   * Get role permissions by role ID
   * @param id - Role ID
   * @returns Promise<PermissionItem[]> - Array of permissions
   */
  async getRolePermissions(
    request: RolePermissionsListRequest,
  ): ServiceResult<RolePermissionsListResponse> {
    try {
      // 权限检查
      const permissionResult = await this.resolveOperationPermission('RBAC_PERMISSION_READ');
      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权访问角色权限');
      }

      const conditions: SQL<unknown>[] = [eq(rolePermissions.roleId, request.roleId)];

      if (request?.keyword) {
        conditions.push(
          or(
            ilike(permissions.name, `%${request.keyword}%`),
            ilike(permissions.code, `%${request.keyword}%`),
            ilike(permissions.description, `%${request.keyword}%`),
          ) as SQL<unknown>,
        );
      }

      const whereExpr = conditions.length ? and(...conditions) : undefined;

      const { limit, offset } = processPaginationConditions(request);

      // 构建列表查询基础
      const baseListQuery = this.db
        .select({
          category: permissions.category,
          code: permissions.code,
          description: permissions.description,
          id: permissions.id,
          isActive: permissions.isActive,
          name: permissions.name,
        })
        .from(permissions)
        .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
        .where(whereExpr);

      const listQuery = limit ? baseListQuery.limit(limit).offset(offset!) : baseListQuery;

      // 构建计数查询
      const countQuery = this.db
        .select({ count: count() })
        .from(permissions)
        .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
        .where(whereExpr);

      const [listResult, totalResult] = await Promise.all([listQuery, countQuery]);

      return {
        permissions: listResult,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      this.handleServiceError(error, '获取角色权限');
    }
  }

  /**
   * Update role permissions by granting or revoking permission IDs
   */
  async updateRolePermissions(
    roleId: number,
    payload: UpdateRolePermissionsRequest,
  ): ServiceResult<{ granted: number; revoked: number; roleId: number }> {
    this.log('info', '更新角色权限', { payload, roleId });

    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_UPDATE');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权更新角色权限');
    }

    const rawGrantIds = payload.grant ?? [];
    const rawRevokeIds = payload.revoke ?? [];

    const grantSet = new Set(rawGrantIds.filter((id) => Number.isInteger(id)) as number[]);
    const revokeSet = new Set(rawRevokeIds.filter((id) => Number.isInteger(id)) as number[]);

    // 解决grant和revoke的交集，交集的权限操作相抵，实际上等于没有操作
    const intersection = new Set<number>();
    grantSet.forEach((id) => {
      if (revokeSet.has(id)) {
        intersection.add(id);
      }
    });
    intersection.forEach((id) => {
      grantSet.delete(id);
      revokeSet.delete(id);
    });

    const grantIds = Array.from(grantSet);
    const revokeIds = Array.from(revokeSet);

    if (!grantIds.length && !revokeIds.length) {
      throw this.createBusinessError('未提供有效的 grant 或 revoke 权限 ID');
    }

    try {
      return await this.db.transaction(async (tx) => {
        const existingRole = await tx.query.roles.findFirst({ where: eq(roles.id, roleId) });
        if (!existingRole) {
          throw this.createNotFoundError(`角色 ID "${roleId}" 不存在`);
        }

        let granted = 0;
        if (grantIds.length) {
          const targetPermissions = await tx.query.permissions.findMany({
            columns: { id: true },
            where: inArray(permissions.id, grantIds),
          });

          const validPermissionIds = targetPermissions.map((item) => item.id);
          const missingPermissionIds = grantIds.filter((id) => !validPermissionIds.includes(id));
          if (missingPermissionIds.length) {
            throw this.createNotFoundError(
              `权限 ID [${missingPermissionIds.join(', ')}] 不存在，无法授权`,
            );
          }

          if (validPermissionIds.length) {
            const existingMappings = await tx
              .select({ permissionId: rolePermissions.permissionId })
              .from(rolePermissions)
              .where(
                and(
                  eq(rolePermissions.roleId, roleId),
                  inArray(rolePermissions.permissionId, validPermissionIds),
                ),
              );

            const existingPermissionIds = new Set(
              existingMappings.map((item) => item.permissionId),
            );
            const toInsert = validPermissionIds.filter((id) => !existingPermissionIds.has(id));

            if (toInsert.length) {
              await tx
                .insert(rolePermissions)
                .values(toInsert.map((permissionId) => ({ permissionId, roleId })));
            }

            granted = toInsert.length;
          }
        }

        let revoked = 0;
        if (revokeIds.length) {
          const deleted = await tx
            .delete(rolePermissions)
            .where(
              and(
                eq(rolePermissions.roleId, roleId),
                inArray(rolePermissions.permissionId, revokeIds),
              ),
            )
            .returning({ permissionId: rolePermissions.permissionId });

          revoked = deleted.length;
        }

        return { granted, revoked, roleId };
      });
    } catch (error) {
      this.handleServiceError(error, '更新角色权限');
    }
  }

  /**
   * Update role information by ID
   * @param id - Role ID to update
   * @param updateData - Role update data
   * @returns Promise<RoleItem> - Updated role item
   */
  async updateRole(id: number, updateData: UpdateRoleRequest): ServiceResult<RoleItem> {
    this.log('info', '更新角色信息', { roleId: id, updateData });

    // 权限检查
    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_UPDATE');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权更新角色');
    }

    try {
      return await this.db.transaction(async (tx) => {
        // 检查角色是否存在
        const existingRole = await tx.query.roles.findFirst({
          where: eq(roles.id, id),
        });

        if (!existingRole) {
          throw this.createNotFoundError(`角色 ID "${id}" 不存在`);
        }

        // 检查是否为系统角色，系统角色不允许修改某些字段
        if (existingRole.isSystem && (updateData.name || updateData.isSystem === false)) {
          throw this.createBusinessError('系统角色不允许修改名称或系统属性');
        }

        // 如果要修改角色名称，检查新名称是否已存在
        if (updateData.name && updateData.name !== existingRole.name) {
          const duplicateRole = await tx.query.roles.findFirst({
            where: eq(roles.name, updateData.name),
          });

          if (duplicateRole) {
            throw this.createBusinessError(`角色名称 "${updateData.name}" 已存在`);
          }
        }

        // 准备更新数据
        const updateFields = {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.displayName && { displayName: updateData.displayName }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
          ...(updateData.isSystem !== undefined && { isSystem: updateData.isSystem }),
          updatedAt: new Date(),
        };

        // 执行更新
        const [updatedRole] = await tx
          .update(roles)
          .set(updateFields)
          .where(eq(roles.id, id))
          .returning();

        this.log('info', '角色更新成功', { roleId: id, roleName: updatedRole.name });
        return updatedRole;
      });
    } catch (error) {
      this.handleServiceError(error, '更新角色');
    }
  }

  /**
   * Clear a role's permission mappings
   */
  async clearRolePermissions(roleId: number): ServiceResult<{ removed: number; roleId: number }> {
    this.log('info', '清空角色权限', { roleId });

    // 权限检查
    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_UPDATE');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权清空角色权限');
    }

    try {
      // 检查角色是否存在
      const existingRole = await this.db.query.roles.findFirst({ where: eq(roles.id, roleId) });
      if (!existingRole) {
        throw this.createNotFoundError(`角色 ID "${roleId}" 不存在`);
      }

      // 统计并删除
      const before = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      return { removed: Number(before[0]?.count || 0), roleId };
    } catch (error) {
      this.handleServiceError(error, '清空角色权限');
    }
  }

  /**
   * Delete role by ID
   */
  async deleteRole(id: number): ServiceResult<{ deleted: boolean; id: number }> {
    this.log('info', '删除角色', { roleId: id });

    const permissionResult = await this.resolveOperationPermission('RBAC_ROLE_DELETE');
    if (!permissionResult.isPermitted) {
      throw this.createAuthorizationError(permissionResult.message || '无权删除角色');
    }

    try {
      return await this.db.transaction(async (tx) => {
        const existingRole = await tx.query.roles.findFirst({ where: eq(roles.id, id) });

        if (!existingRole) {
          throw this.createNotFoundError(`角色 ID "${id}" 不存在`);
        }

        if (existingRole.isSystem) {
          throw this.createBusinessError('系统角色不允许删除');
        }

        const linkedUser = await tx.query.userRoles.findFirst({ where: eq(userRoles.roleId, id) });
        if (linkedUser) {
          throw this.createBusinessError('角色仍然关联用户，无法删除');
        }

        const [deletedRole] = await tx
          .delete(roles)
          .where(eq(roles.id, id))
          .returning({ id: roles.id });

        if (!deletedRole) {
          throw this.createBusinessError('删除角色失败');
        }

        this.log('info', '角色删除成功', { roleId: id });
        return { deleted: true, id: deletedRole.id };
      });
    } catch (error) {
      this.handleServiceError(error, '删除角色');
    }
  }
}
