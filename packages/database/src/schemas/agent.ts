/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { LobeAgentChatConfig, LobeAgentTTSConfig } from '@/types/agent';

import { idGenerator, randomSlug } from '../utils/idGenerator';
import { timestamps } from './_helpers';
import { files, knowledgeBases } from './file';
import { roles } from './rbac';
import { users } from './user';

// Agent table is the main table for storing agents
// agent is a model that represents the assistant that is created by the user
// agent can have its own knowledge base and files

export const agents = pgTable(
  'agents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => idGenerator('agents'))
      .notNull(),
    slug: varchar('slug', { length: 100 })
      .$defaultFn(() => randomSlug(4))
      .unique(),
    title: varchar('title', { length: 255 }),
    description: varchar('description', { length: 1000 }),
    tags: jsonb('tags').$type<string[]>().default([]),
    avatar: text('avatar'),
    backgroundColor: text('background_color'),

    plugins: jsonb('plugins').$type<string[]>().default([]),

    clientId: text('client_id'),

    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    chatConfig: jsonb('chat_config').$type<LobeAgentChatConfig>(),

    fewShots: jsonb('few_shots'),
    model: text('model'),
    params: jsonb('params').default({}),
    provider: text('provider'),
    systemRole: text('system_role'),
    tts: jsonb('tts').$type<LobeAgentTTSConfig>(),

    virtual: boolean('virtual').default(false),
    enabled: boolean('enabled').default(false),
    deleted: boolean('deleted').default(false),

    openingMessage: text('opening_message'),
    openingQuestions: text('opening_questions').array().default([]),

    sourceAgentId: text('source_agent_id'),

    ...timestamps,
  },
  (t) => ({
    clientIdUnique: uniqueIndex('client_id_user_id_unique').on(t.clientId, t.userId),
    titleIndex: index('agents_title_idx').on(t.title),
    descriptionIndex: index('agents_description_idx').on(t.description),
    enabledIndex: index('agents_enabled_idx').on(t.enabled),
    deletedIndex: index('agents_deleted_idx').on(t.deleted),
    sourceAgentIdIndex: index('agents_source_agent_id_idx').on(t.sourceAgentId),
    // 唯一约束：同一个源 agent 对于同一个用户只能有一个副本
    sourceUserUnique: uniqueIndex('agents_source_user_unique').on(t.sourceAgentId, t.userId),
    // 外键约束：sourceAgentId 引用 agents.id（自引用）
    sourceAgentIdFk: sql`CONSTRAINT agents_source_agent_id_fk FOREIGN KEY (source_agent_id) REFERENCES agents(id) ON DELETE CASCADE`,
  }),
);

export const insertAgentSchema = createInsertSchema(agents);

export type NewAgent = typeof agents.$inferInsert;
export type AgentItem = typeof agents.$inferSelect;

export type NewAgentGrant = typeof agentsGrants.$inferInsert;
export type AgentGrantItem = typeof agentsGrants.$inferSelect;

export const agentsKnowledgeBases = pgTable(
  'agents_knowledge_bases',
  {
    agentId: text('agent_id')
      .references(() => agents.id, { onDelete: 'cascade' })
      .notNull(),
    knowledgeBaseId: text('knowledge_base_id')
      .references(() => knowledgeBases.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    enabled: boolean('enabled').default(true),

    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.knowledgeBaseId] }),
  }),
);

export const agentsFiles = pgTable(
  'agents_files',
  {
    fileId: text('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').default(true),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.fileId, t.agentId, t.userId] }),
  }),
);

// Agent grants table
export const agentsGrants = pgTable(
  'agents_grants',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),

    agentId: text('agent_id')
      .references(() => agents.id, { onDelete: 'cascade' })
      .notNull(),

    granteeType: varchar('grantee_type', { enum: ['user', 'role'], length: 20 }).notNull(),
    granteeUserId: text('grantee_user_id').references(() => users.id, { onDelete: 'cascade' }),
    granteeRoleId: integer('grantee_role_id').references(() => roles.id, { onDelete: 'cascade' }),

    ...timestamps,
  },
  (t) => ({
    // 确保同一条记录只能有一种授权方式
    chkGranteeEitherOr: sql`CHECK ((${t.granteeType} = 'user' AND ${t.granteeUserId} IS NOT NULL AND ${t.granteeRoleId} IS NULL) OR (${t.granteeType} = 'role' AND ${t.granteeRoleId} IS NOT NULL AND ${t.granteeUserId} IS NULL))`,

    // 唯一索引，避免重复授权
    granteeUserUnique: uniqueIndex('agents_grants_grantee_user_unique').on(
      t.agentId,
      t.granteeUserId,
    ),
    granteeRoleUnique: uniqueIndex('agents_grants_grantee_role_unique').on(
      t.agentId,
      t.granteeRoleId,
    ),
    // 为角色查询添加索引
    granteeRoleIdIndex: index('agents_grants_grantee_role_id_idx').on(t.granteeRoleId),
  }),
);
