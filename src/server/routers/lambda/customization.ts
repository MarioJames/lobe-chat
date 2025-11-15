import { CustomizationModel } from '@/database/models/customization';
import { publicProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

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

