import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { AnnouncementSelectItem, announcements, customization } from '../schemas';
import { agents } from '../schemas/agent';
import { LobeChatDatabase } from '../type';

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
          recommendedAgents,
        },
      },
    };
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
}

