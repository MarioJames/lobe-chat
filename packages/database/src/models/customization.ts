import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { AnnouncementSelectItem, announcements, customization } from '../schemas';
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
}

