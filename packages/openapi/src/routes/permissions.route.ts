import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { getScopePermissions } from '@/utils/rbac';

import { PermissionController } from '../controllers/permission.controller';
import { requireAuth } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/permission-check';
import {
  CreatePermissionRequestSchema,
  PermissionIdParamSchema,
  PermissionsListQuerySchema,
  UpdatePermissionRequestSchema,
} from '../types/permission.type';

const PermissionsRoutes = new Hono();

/**
 * Get permission list
 * GET /api/v1/permissions 获取权限列表
 */
PermissionsRoutes.get(
  '/',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('RBAC_PERMISSION_READ', ['ALL', 'WORKSPACE']),
    '您没有权限查看权限列表',
  ),
  zValidator('query', PermissionsListQuerySchema),
  async (c) => {
    const permissionController = new PermissionController();

    return await permissionController.getPermissions(c);
  },
);

/**
 * Get permission detail by ID
 * GET /api/v1/permissions/:id 获取权限详情
 */
PermissionsRoutes.get(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('RBAC_PERMISSION_READ', ['ALL', 'WORKSPACE']),
    '您没有权限查看权限详情',
  ),
  zValidator('param', PermissionIdParamSchema),
  async (c) => {
    const permissionController = new PermissionController();

    return await permissionController.getPermissionById(c);
  },
);

/**
 * Create a new permission
 * POST /api/v1/permissions 创建新的权限
 */
PermissionsRoutes.post(
  '/',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('RBAC_PERMISSION_CREATE', ['ALL', 'WORKSPACE']),
    '您没有权限创建权限',
  ),
  zValidator('json', CreatePermissionRequestSchema),
  async (c) => {
    const permissionController = new PermissionController();

    return await permissionController.createPermission(c);
  },
);

/**
 * Update permission by ID
 * PATCH /api/v1/permissions/:id 更新权限信息
 */
PermissionsRoutes.patch(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('RBAC_PERMISSION_UPDATE', ['ALL', 'WORKSPACE']),
    '您没有权限更新权限',
  ),
  zValidator('param', PermissionIdParamSchema),
  zValidator('json', UpdatePermissionRequestSchema),
  async (c) => {
    const permissionController = new PermissionController();

    return await permissionController.updatePermission(c);
  },
);

/**
 * Delete permission by ID
 * DELETE /api/v1/permissions/:id 删除权限
 */
PermissionsRoutes.delete(
  '/:id',
  requireAuth,
  requireAnyPermission(
    getScopePermissions('RBAC_PERMISSION_DELETE', ['ALL', 'WORKSPACE']),
    '您没有权限删除权限',
  ),
  zValidator('param', PermissionIdParamSchema),
  async (c) => {
    const permissionController = new PermissionController();

    return await permissionController.deletePermission(c);
  },
);

export default PermissionsRoutes;
