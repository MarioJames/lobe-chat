import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { agents } from '../schemas/agent';
import type { AnnouncementSelectItem, CustomizationSelectItem } from '../schemas/customization';
import { announcements, customization } from '../schemas/customization';
import type { LobeChatDatabase } from '../type';

/**
 * 定制化配置数据库模型
 */
export class CustomizationModel {
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase) {
    this.db = db;
  }

  // ============== 定制化配置相关方法 ==============

  /**
   * 获取定制化配置（单行表，id 固定为 1）
   */
  getConfig = async () => {
    const result = await this.db
      .select()
      .from(customization)
      .where(eq(customization.id, 1))
      .limit(1);

    const config = result[0] ?? null;

    // 如果配置不存在或者不是推荐模式，直接返回
    if (!config || config.welcome?.type !== 'recommended') {
      return config;
    }

    // 获取推荐助手 ID 列表
    const recommendedAgentIds = config.welcome?.config?.recommendedAgentIds || [];

    // 如果没有推荐助手，直接返回
    if (recommendedAgentIds.length === 0) {
      return config;
    }

    // 批量查询推荐助手的详细信息
    const recommendedAgents = await this.db
      .select()
      .from(agents)
      .where(inArray(agents.id, recommendedAgentIds));

    return {
      ...config,
      welcome: {
        ...config.welcome,
        config: {
          ...config.welcome.config,
          recommendedAgents: recommendedAgents.map((agent) => ({
            ...agent,
            openingQuestions: agent.openingQuestions ?? undefined,
            plugins: agent.plugins ?? undefined,
            tags: agent.tags ?? undefined,
          })),
        },
      },
    };
  };

  /**
   * 更新定制化配置
   */
  updateConfig = async (data: Partial<CustomizationSelectItem>, updatedBy: string) => {
    const result = await this.db
      .update(customization)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(customization.id, 1))
      .returning();

    return result[0] ?? null;
  };

  // ============== 公告相关方法 ==============

  /**
   * 获取当前生效的公告
   * 规则：当前时间在 [effectiveStartAt, effectiveEndAt) 范围内
   * 当多个公告时间重叠时，返回最新创建的那条（按 created_at DESC 排序）
   */
  getActiveAnnouncement = async (): Promise<AnnouncementSelectItem | null> => {
    const now = new Date();

    const result = await this.db
      .select()
      .from(announcements)
      .where(
        and(
          lte(announcements.effectiveStartAt, now), // effectiveStartAt <= now
          gte(announcements.effectiveEndAt, now), // effectiveEndAt >= now
        ),
      )
      .orderBy(desc(announcements.createdAt)) // 取最新创建的
      .limit(1);

    return result[0] ?? null;
  };

  /**
   * 创建公告
   */
  createAnnouncement = async (data: {
    title: string;
    content: string;
    effectiveStartAt: Date;
    effectiveEndAt: Date;
    createdBy: string;
    updatedBy: string;
  }) => {
    const result = await this.db.insert(announcements).values(data).returning();
    return result[0];
  };

  /**
   * 更新公告
   */
  updateAnnouncement = async (
    id: number,
    data: {
      title?: string;
      content?: string;
      effectiveStartAt?: Date;
      effectiveEndAt?: Date;
      updatedBy: string;
    },
  ) => {
    const result = await this.db
      .update(announcements)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();

    return result[0] ?? null;
  };

  /**
   * 删除公告
   */
  deleteAnnouncement = async (id: number) => {
    return this.db.delete(announcements).where(eq(announcements.id, id));
  };

  /**
   * 查询公告列表
   */
  queryAnnouncements = async (params: {
    current: number;
    pageSize: number;
    sortBy?: 'createdAt' | 'effectiveStartAt';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const { current, pageSize, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const offset = (current - 1) * pageSize;

    const orderBy =
      sortOrder === 'desc' ? desc(announcements[sortBy]) : asc(announcements[sortBy] as any);

    const [items, total] = await Promise.all([
      this.db.select().from(announcements).orderBy(orderBy).limit(pageSize).offset(offset),
      this.db.$count(announcements),
    ]);

    return {
      items,
      total,
      current,
      pageSize,
    };
  };
}
