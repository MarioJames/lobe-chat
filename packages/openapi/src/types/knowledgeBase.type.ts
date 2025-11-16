import { z } from 'zod';

import { KnowledgeBaseItem } from '@/database/schemas';

import { IPaginationQuery, PaginationQueryResponse, PaginationQuerySchema } from './common.type';

// ==================== Knowledge Base Query Types ====================

/**
 * 知识库列表查询参数
 */
export interface KnowledgeBaseListQuery extends IPaginationQuery {
  /** 是否只查询启用的知识库 */
  enabled?: boolean;
  /** 类型过滤 */
  type?: 'personal' | 'shared';
}

export const KnowledgeBaseListQuerySchema = PaginationQuerySchema.extend({
  enabled: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .nullish(),
  type: z.enum(['personal', 'shared']).nullish(),
});

/**
 * 知识库文件列表查询参数
 */
export interface KnowledgeBaseFileListQuery extends IPaginationQuery {
  /** 文件类型过滤 */
  fileType?: string;
}

export const KnowledgeBaseFileListQuerySchema = PaginationQuerySchema.extend({
  fileType: z.string().nullish(),
});

/**
 * 知识库列表响应类型
 */
export interface KnowledgeBaseListItem extends KnowledgeBaseItem {
  /** 当前用户是否被授权 */
  isAuthorized: boolean;
}

export type KnowledgeBaseListResponse = PaginationQueryResponse<{
  /** 知识库列表 */
  knowledgeBases: KnowledgeBaseListItem[];
}>;

// ==================== Knowledge Base Management Types ====================

/**
 * 知识库ID参数
 */
export const KnowledgeBaseIdParamSchema = z.object({
  id: z.string().min(1, '知识库 ID 不能为空'),
});

/**
 * 创建知识库请求类型
 */
export interface CreateKnowledgeBaseRequest {
  /** 知识库头像 */
  avatar?: string;
  /** 知识库描述 */
  description?: string;
  /** 是否公开 */
  isPublic?: boolean;
  /** 知识库名称 */
  name: string;
  /** 知识库设置 */
  settings?: any;
  /** 知识库类型 */
  type?: 'personal' | 'shared';
}

export const CreateKnowledgeBaseSchema = z.object({
  avatar: z.string().url('头像必须是有效的URL').optional(),
  description: z.string().max(1000, '知识库描述过长').optional(),
  isPublic: z.boolean().optional(),
  name: z.string().min(1, '知识库名称不能为空').max(255, '知识库名称过长'),
  settings: z.any().optional(),
  type: z.enum(['personal', 'shared']).optional(),
});

/**
 * 创建知识库响应类型
 */
export interface CreateKnowledgeBaseResponse {
  /** 知识库信息 */
  knowledgeBase: KnowledgeBaseItem;
}

/**
 * 更新知识库请求类型
 */
export interface UpdateKnowledgeBaseRequest {
  /** 知识库头像 */
  avatar?: string;
  /** 知识库描述 */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 是否公开 */
  isPublic?: boolean;
  /** 知识库名称 */
  name?: string;
  /** 知识库设置 */
  settings?: any;
  /** 知识库类型 */
  type?: 'personal' | 'shared';
}

export const UpdateKnowledgeBaseSchema = z.object({
  avatar: z.string().url('头像必须是有效的URL').optional(),
  description: z.string().max(1000, '知识库描述过长').optional(),
  enabled: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  name: z.string().min(1, '知识库名称不能为空').max(255, '知识库名称过长').optional(),
  settings: z.any().optional(),
  type: z.enum(['personal', 'shared']).optional(),
});

/**
 * 知识库详情响应类型
 */
export interface KnowledgeBaseDetailResponse {
  /** 知识库信息 */
  knowledgeBase: KnowledgeBaseItem;
}

/**
 * 删除知识库响应类型
 */
export interface DeleteKnowledgeBaseResponse {
  /** 响应消息 */
  message?: string;
  /** 是否删除成功 */
  success: boolean;
}
