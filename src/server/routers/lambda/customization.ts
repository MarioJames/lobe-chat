import { z } from 'zod';

import { CustomizationModel } from '@/database/models/customization';
import { authedProcedure, publicProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { CreateAnnouncementSchema, UpdateAnnouncementSchema } from '@/types/customization';

/**
 * 定制化配置路由
 * 前台使用，只提供查询功能
 */
export const customizationRouter = router({
  /**
   * 获取当前生效的公告
   */
  getActiveAnnouncement: publicProcedure.use(serverDatabase).query(async ({ ctx }) => {
    const model = new CustomizationModel(ctx.serverDB);
    const announcement = await model.getActiveAnnouncement();

    if (!announcement) {
      return null;
    }

    return {
      content: announcement.content,
      createdAt: announcement.createdAt,
      effectiveEndAt: announcement.effectiveEndAt,
      effectiveStartAt: announcement.effectiveStartAt,
      id: announcement.id,
      title: announcement.title,
    };
  }),

  /**
   * 获取定制化配置
   */
  getConfig: publicProcedure.use(serverDatabase).query(async ({ ctx }) => {
    const model = new CustomizationModel(ctx.serverDB);
    const config = await model.getConfig();

    if (!config) {
      return {
        base: null,
        defaultAgent: null,
        welcome: null,
      };
    }

    return {
      base: config.base,
      defaultAgent: config.defaultAgent,
      welcome: config.welcome,
    };
  }),
});

/**
 * 管理端定制化配置路由
 * 需要认证，提供完整的 CRUD 功能
 */
const adminProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      customizationModel: new CustomizationModel(ctx.serverDB),
    },
  });
});

export const customizationAdminRouter = router({
  /**
   * 获取定制化配置（管理端）
   */
  getConfig: adminProcedure.query(async ({ ctx }) => {
    const config = await ctx.customizationModel.getConfig();

    if (!config) {
      return {
        base: null,
        defaultAgent: null,
        welcome: null,
      };
    }

    return {
      base: config.base,
      defaultAgent: config.defaultAgent,
      welcome: config.welcome,
    };
  }),

  /**
   * 更新定制化配置
   */
  updateConfig: adminProcedure
    .input(
      z.object({
        base: z.any().optional(),
        defaultAgent: z.any().optional(),
        welcome: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.customizationModel.updateConfig(
        {
          base: input.base ?? null,
          defaultAgent: input.defaultAgent ?? null,
          welcome: input.welcome ?? null,
        },
        ctx.userId,
      );

      return result;
    }),

  /**
   * 创建公告
   */
  createAnnouncement: adminProcedure
    .input(CreateAnnouncementSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.customizationModel.createAnnouncement({
        content: input.content,
        createdBy: ctx.userId,
        effectiveEndAt: new Date(input.effectiveEndAt),
        effectiveStartAt: new Date(input.effectiveStartAt),
        title: input.title,
        updatedBy: ctx.userId,
      });

      return result;
    }),

  /**
   * 更新公告
   */
  updateAnnouncement: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        ...UpdateAnnouncementSchema.shape,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const result = await ctx.customizationModel.updateAnnouncement(id, {
        ...data,
        effectiveEndAt: data.effectiveEndAt ? new Date(data.effectiveEndAt) : undefined,
        effectiveStartAt: data.effectiveStartAt ? new Date(data.effectiveStartAt) : undefined,
        updatedBy: ctx.userId,
      });

      return result;
    }),

  /**
   * 删除公告
   */
  deleteAnnouncement: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.customizationModel.deleteAnnouncement(input.id);
    }),

  /**
   * 查询公告列表
   */
  queryAnnouncements: adminProcedure
    .input(
      z.object({
        current: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(20),
        sortBy: z.enum(['createdAt', 'effectiveStartAt']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.customizationModel.queryAnnouncements(input);
    }),
});

export type CustomizationRouter = typeof customizationRouter;
export type CustomizationAdminRouter = typeof customizationAdminRouter;
