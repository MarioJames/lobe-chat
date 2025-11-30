import { z } from 'zod';

import { RbacModel } from '@/database/models/rbac';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

const rbacProcedure = authedProcedure.use(serverDatabase).use(async ({ ctx, next }) => {
  return next({
    ctx: {
      rbacModel: new RbacModel(ctx.serverDB, ctx.userId),
    },
  });
});

export const rbacRouter = router({
  /**
   * 获取当前用户的权限代码列表
   */
  getCurrentUserPermissionCodes: rbacProcedure.query(async ({ ctx }) => {
    return ctx.rbacModel.getUserPermissions();
  }),

  /**
   * 获取当前用户角色
   */
  getCurrentUserRoles: rbacProcedure.query(async ({ ctx }) => {
    return ctx.rbacModel.getUserRoles();
  }),

  /**
   * 获取用户权限详情（包含类别、角色信息）
   */
  getUserPermissionDetails: rbacProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.rbacModel.getUserPermissionDetails(input?.userId);
    }),
});

export type RbacRouter = typeof rbacRouter;
