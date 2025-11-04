/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, timestamptz, updatedAt } from '@/database/schemas/_helpers';
import type { BaseConfig, DefaultAgentConfig, WelcomeConfig } from '@/types/customization';

/**
 * 自定义配置表（单行表）
 *
 * 用于存储平台的所有自定义配置，整个表只有一行数据（id=1）
 *
 * 使用方式：
 * - 查询：SELECT * FROM customization WHERE id = 1
 * - 更新：UPDATE customization SET base = ..., updated_by = ... WHERE id = 1
 *
 * 注意：
 * - id 固定为 1，应用层始终使用 UPDATE WHERE id = 1
 * - 首次使用前需要通过数据库迁移脚本插入初始行
 * - 各配置字段都是可选的 JSONB
 */
export const customization = pgTable('customization', {
  // ========== 固定 ID（始终为 1）==========
  id: integer('id').primaryKey().default(1),

  // ========== 基础配置 ==========
  // 存储格式：
  // {
  //   "brandName": "品牌名称",
  //   "brandDescription": "品牌描述",
  //   "logo": { "light": "url", "dark": "url" },
  //   "favicon": { "light": "url", "dark": "url" }
  // }
  base: jsonb('base').$type<BaseConfig>(),

  // ========== 欢迎界面配置 ==========
  // 存储格式：
  // {
  //   "type": "recommended" | "custom",
  //   "config": {
  //     推荐模式: { "welcomeContent": "...", "recommendedAgentIds": [...], "defaultQuestions": [...], "newUserQuestions": [...] }
  //     自定义模式: { "render": "..." }
  //   }
  // }
  welcome: jsonb('welcome').$type<WelcomeConfig>(),

  // ========== 默认助手配置 ==========
  // 存储格式：
  // {
  //   "title": "助手名称",
  //   "avatar": "🤖",
  //   "description": "描述",
  //   "systemRole": "提示词",
  //   "modelId": "model-id",
  //   "params": { "temperature": 0.7, "maxTokens": 4096, "topP": 0.9 },
  //   "plugins": ["plugin-1"],
  //   "knowledgeBases": ["kb-1"]
  // }
  defaultAgent: jsonb('default_agent').$type<DefaultAgentConfig>(),

  // ========== 审计字段 ==========
  updatedBy: text('updated_by'),
  updatedAt: updatedAt(),
});

export type CustomizationSelectItem = typeof customization.$inferSelect;
export type NewCustomizationItem = typeof customization.$inferInsert;

/**
 * 公告表
 *
 * 用于管理系统消息通知/公告，支持定时生效和过期
 *
 * 状态计算规则（动态计算，不存储）：
 * - 未生效：当前时间 < effective_start_at
 * - 生效中：effective_start_at <= 当前时间 < effective_end_at
 * - 已失效：当前时间 >= effective_end_at
 *
 * 生效规则：
 * - 当多个公告时间重叠时，生效最新创建的那条（按 created_at DESC 排序）
 */
export const announcements = pgTable(
  'announcements',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),

    // ========== 基础信息 ==========
    title: text('title').notNull(),
    content: text('content').notNull(), // 支持 Markdown

    // ========== 生效时间 ==========
    effectiveStartAt: timestamptz('effective_start_at').notNull(), // 生效开始时间
    effectiveEndAt: timestamptz('effective_end_at').notNull(), // 生效结束时间

    // ========== 审计字段 ==========
    createdBy: text('created_by').notNull(),
    updatedBy: text('updated_by').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    // 索引：用于查询生效时间范围
    effectiveTimeIdx: index('announcements_effective_time_idx').on(
      table.effectiveStartAt,
      table.effectiveEndAt,
    ),
    // 索引：用于按创建时间排序（用于多个公告重叠时取最新）
    createdAtIdx: index('announcements_created_at_idx').on(table.createdAt),
  }),
);

export type AnnouncementSelectItem = typeof announcements.$inferSelect;
export type NewAnnouncementItem = typeof announcements.$inferInsert;
