import { LobeAgentConfig, MetaData } from '@lobechat/types';
import { z } from 'zod';

import { AgentItem, SessionItem, UserItem } from '@/database/schemas';

import { IPaginationQuery, PaginationQueryResponse, PaginationQuerySchema } from '.';

// ==================== Session CRUD Types ====================

/**
 * 创建会话请求参数
 */
export interface CreateSessionRequest {
  agentId?: string; // 关联的 Agent ID，用于创建基于 Agent 的会话
  avatar?: string;
  backgroundColor?: string;
  config?: LobeAgentConfig;
  description?: string;
  groupId?: string;
  meta?: MetaData;
  pinned?: boolean;
  title?: string;
  type?: 'agent' | 'group'; // 克隆源会话ID
}

export const CreateSessionRequestSchema = z.object({
  agentId: z.string().nullish(),
  avatar: z.string().nullish(),
  backgroundColor: z.string().nullish(),
  config: z.object({}).passthrough().nullish(),
  description: z.string().nullish(),
  groupId: z.string().nullish(),
  meta: z.object({}).passthrough().nullish(),
  pinned: z.boolean().nullish(),
  title: z.string().nullish(),
  type: z.enum(['agent', 'group']).nullish(),
});

/**
 * 更新会话请求参数
 */
export interface UpdateSessionRequest {
  agentId?: string;
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  groupId?: string;
  id: string;
  pinned?: boolean;
  title?: string;
  userId?: string;
}

export const UpdateSessionRequestSchema = z.object({
  agentId: z.string().nullish(),
  avatar: z.string().nullish(),
  backgroundColor: z.string().nullish(),
  description: z.string().nullish(),
  groupId: z.string().nullish(),
  pinned: z.boolean().nullish(),
  title: z.string().nullish(),
  userId: z.string().nullish(),
});

/**
 * 克隆会话请求参数
 */
export interface CloneSessionRequest {
  id: string;
  newTitle: string;
}

// ==================== Session Query Types ====================

/**
 * 获取会话列表请求参数 (统一查询接口)
 */
export interface QuerySessionsRequest extends IPaginationQuery {
  agentId?: string;
  ids?: string[];
  sessionIds?: string[];
  userId?: string;
}

export const QuerySessionsRequestSchema = z
  .object({
    agentId: z.string().nullish(),
    ids: z
      .string()
      .nullish()
      .transform((val) => (val ? val.split(',') : [])),
    userId: z.string().nullish(),
  })
  .extend(PaginationQuerySchema.shape);

// ==================== Session Groups Types ====================

/**
 * 分组查询请求参数
 */
export interface SessionsGroupsRequest {
  groupBy: 'agent';
}

export const SessionsGroupsRequestSchema = z.object({
  groupBy: z.literal('agent'),
});

/**
 * 分组查询响应类型
 */
export interface SessionsGroupsResponse {
  agent: AgentItem;
  sessions: SessionListItem[];
  total: number;
}

// ==================== Session Batch Operations ====================

/**
 * 批量更新会话请求参数
 */
export type BatchUpdateSessionsRequest = Array<{
  agentId?: string;
  avatar?: string;
  backgroundColor?: string;
  description?: string;
  groupId?: string;
  id: string;
  pinned?: boolean;
  title?: string;
  userId?: string;
}>;

export const BatchUpdateSessionsRequestSchema = z
  .array(
    z.object({
      data: UpdateSessionRequestSchema,
      id: z.string().min(1, '会话 ID 不能为空'),
    }),
  )
  .min(1, '至少需要提供一个要更新的会话');

// ==================== Session Response Types ====================

/**
 * 会话列表项类型
 */
export interface SessionListItem extends SessionItem {
  agent?: AgentItem;
  user: UserItem;
}

/**
 * Agent 信息类型
 */
export interface AgentInfo {
  avatar: string | null;
  backgroundColor: string | null;
  chatConfig: any | null;
  description: string | null;
  id: string;
  model: string | null;
  provider: string | null;
  systemRole: string | null;
  title: string | null;
}

/**
 * 会话详情响应类型
 */
export interface SessionDetailResponse extends SessionItem {
  agent?: AgentItem | null;
  user?: UserItem | null;
}

/**
 * 按Agent分组的会话数量响应类型
 */
export interface SessionCountByAgentResponse {
  agent: AgentItem | null;
  count: number;
}

/**
 * 批量查询会话响应类型
 */
export type BatchGetSessionsResponse = {
  sessions: SessionListItem[];
  total: number;
};

/**
 * 会话列表响应类型
 */
export type SessionListResponse = PaginationQueryResponse<{
  sessions: SessionListItem[];
}>;

// ==================== Common Schemas ====================

export const SessionIdParamSchema = z.object({
  id: z.string().min(1, '会话 ID 不能为空'),
});
