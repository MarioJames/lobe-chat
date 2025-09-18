import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { getAllScopePermissions } from '@/utils/rbac';

import { ModelController } from '../controllers';
import { requireAuth } from '../middleware';
import { requireAnyPermission } from '../middleware/permission-check';
import { PaginationQuerySchema } from '../types';
import {
  CreateModelRequestSchema,
  ModelIdParamSchema,
  UpdateModelRequestSchema,
} from '../types/model.type';

// Models 相关路由
const ModelRoutes = new Hono();

// GET /api/v1/models - 获取模型列表 (支持分页、过滤和分组)
ModelRoutes.get(
  '/',
  requireAuth,
  requireAnyPermission(getAllScopePermissions('AI_MODEL_READ'), '您没有权限查看模型列表'),
  zValidator('query', PaginationQuerySchema),
  (c) => {
    const controller = new ModelController();
    return controller.handleGetModels(c);
  },
);

// POST /api/v1/models - 创建模型
ModelRoutes.post(
  '/',
  requireAuth,
  requireAnyPermission(getAllScopePermissions('AI_MODEL_CREATE'), '您没有权限创建模型'),
  zValidator('json', CreateModelRequestSchema),
  (c) => {
    const controller = new ModelController();
    return controller.handleCreateModel(c);
  },
);

// GET /api/v1/models/:providerId/:modelId - 获取模型详情
ModelRoutes.get(
  '/:providerId/:modelId',
  requireAuth,
  requireAnyPermission(getAllScopePermissions('AI_MODEL_READ'), '您没有权限查看模型详情'),
  zValidator('param', ModelIdParamSchema),
  (c) => {
    const controller = new ModelController();
    return controller.handleGetModel(c);
  },
);

// PATCH /api/v1/models/:providerId/:modelId - 更新模型
ModelRoutes.patch(
  '/:providerId/:modelId',
  requireAuth,
  requireAnyPermission(getAllScopePermissions('AI_MODEL_UPDATE'), '您没有权限更新模型'),
  zValidator('param', ModelIdParamSchema),
  zValidator('json', UpdateModelRequestSchema),
  (c) => {
    const controller = new ModelController();
    return controller.handleUpdateModel(c);
  },
);

export default ModelRoutes;
