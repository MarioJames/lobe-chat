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
   * Get current user's permission codes list
   */
  getCurrentUserPermissionCodes: rbacProcedure.query(async ({ ctx }) => {
    return ctx.rbacModel.getUserPermissions();
  }),

  /**
   * Get current user's roles
   */
  getCurrentUserRoles: rbacProcedure.query(async ({ ctx }) => {
    return ctx.rbacModel.getUserRoles();
  }),

  /**
   * Get user permission details (including category, role information)
   */
  getUserPermissionDetails: rbacProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.rbacModel.getUserPermissionDetails(input?.userId);
    }),
});

export type RbacRouter = typeof rbacRouter;
