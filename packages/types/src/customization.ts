import { z } from 'zod';

// ==================== 自定义配置类型 ====================

/**
 * Theme 配置（浅色/深色主题）
 */
export const ThemeConfigSchema = z.object({
  dark: z.string().url('深色主题配置必须是有效的 URL'),
  light: z.string().url('浅色主题配置必须是有效的 URL'),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

/**
 * 基础配置 Schema
 */
export const BaseConfigSchema = z.object({
  brandDescription: z.string().optional(),
  brandName: z.string().optional(),
  favicon: ThemeConfigSchema.optional(),
  logo: ThemeConfigSchema.optional(),
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

/**
 * 欢迎界面配置 - 推荐模式
 */
export const WelcomeRecommendedConfigSchema = z.object({
  defaultQuestions: z.array(z.string()).default([]), // 默认常见问题
  newUserQuestions: z.array(z.string()).default([]), // 新用户常见问题
  recommendedAgentIds: z.array(z.string()).default([]), // 推荐助手 ID 列表
  welcomeContent: z.string().optional(), // 支持 Markdown
});

export type WelcomeRecommendedConfig = z.infer<typeof WelcomeRecommendedConfigSchema>;

/**
 * 欢迎界面配置 - 自定义模式
 */
export const WelcomeCustomConfigSchema = z.object({
  render: z.string().optional(), // Markdown 渲染内容
});

export type WelcomeCustomConfig = z.infer<typeof WelcomeCustomConfigSchema>;

/**
 * 欢迎界面配置（联合类型）
 */
export const WelcomeConfigSchema = z.discriminatedUnion('type', [
  z.object({
    config: WelcomeRecommendedConfigSchema,
    type: z.literal('recommended'),
  }),
  z.object({
    config: WelcomeCustomConfigSchema,
    type: z.literal('custom'),
  }),
]);

export type WelcomeConfig = z.infer<typeof WelcomeConfigSchema>;

/**
 * 模型参数配置
 */
export const ModelParametersSchema = z.object({
  maxTokens: z.number().int().positive().default(4096), // 最大长度
  temperature: z.number().min(0).max(2).default(0.7), // 温度
  topP: z.number().min(0).max(1).default(0.9), // Top P
});

export type ModelParameters = z.infer<typeof ModelParametersSchema>;

/**
 * 默认助手配置
 */
export const DefaultAgentConfigSchema = z.object({
  avatar: z.string().optional(), // emoji
  description: z.string().optional(),
  knowledgeBases: z.array(z.string()).default([]), // 知识库 ID 列表
  modelId: z.string().min(1, '模型 ID 不能为空'),
  params: ModelParametersSchema.default({}),
  plugins: z.array(z.string()).default([]), // 插件 ID 列表
  systemRole: z.string().optional(),
  title: z.string().min(1, '助手名称不能为空'),
});

export type DefaultAgentConfig = z.infer<typeof DefaultAgentConfigSchema>;

/**
 * 完整的自定义配置
 */
export const CustomizationConfigSchema = z.object({
  base: BaseConfigSchema.optional(),
  defaultAgent: DefaultAgentConfigSchema.optional(),
  welcome: WelcomeConfigSchema.optional(),
});

export type CustomizationConfig = z.infer<typeof CustomizationConfigSchema>;

// ==================== 公告类型 ====================

/**
 * 公告状态
 */
export const AnnouncementStatusSchema = z.enum(['pending', 'active', 'expired']);
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>;

/**
 * 公告创建参数
 */
export const CreateAnnouncementSchema = z.object({
  content: z.string().min(1, '内容不能为空'), // 支持 Markdown
  effectiveEndAt: z.string().datetime('生效结束时间必须是有效的 ISO 8601 格式'),
  effectiveStartAt: z.string().datetime('生效开始时间必须是有效的 ISO 8601 格式'),
  title: z.string().min(1, '标题不能为空'),
});

export type CreateAnnouncement = z.infer<typeof CreateAnnouncementSchema>;

/**
 * 更新公告参数
 */
export const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial();
export type UpdateAnnouncement = z.infer<typeof UpdateAnnouncementSchema>;

/**
 * 公告列表查询参数
 */
export const AnnouncementListQuerySchema = z.object({
  current: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
  sortBy: z.enum(['createdAt', 'effectiveStartAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>;

// ==================== 数据库类型推断 ====================

/**
 * 自定义配置表数据结构
 */
export interface CustomizationConfigRow {
  base?: BaseConfig | null;
  defaultAgent?: DefaultAgentConfig | null;
  id: number; // 固定为 1
  updatedAt: Date | null;
  updatedBy: string | null;
  welcome?: WelcomeConfig | null;
}

/**
 * 公告表插入类型
 */
export interface InsertAnnouncement {
  content: string;
  createdBy: string;
  effectiveEndAt: Date;
  effectiveStartAt: Date;
  title: string;
  updatedBy: string;
}
