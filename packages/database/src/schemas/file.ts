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
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { FileSource } from '@/types/files';

import { idGenerator } from '../utils/idGenerator';
import { accessedAt, createdAt, timestamps } from './_helpers';
import { asyncTasks } from './asyncTask';
import { roles } from './rbac';
import { users } from './user';

export const globalFiles = pgTable('global_files', {
  hashId: varchar('hash_id', { length: 64 }).primaryKey(),
  fileType: varchar('file_type', { length: 255 }).notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  metadata: jsonb('metadata'),
  creator: text('creator')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  createdAt: createdAt(),
  accessedAt: accessedAt(),
});

export type NewGlobalFile = typeof globalFiles.$inferInsert;
export type GlobalFileItem = typeof globalFiles.$inferSelect;

export const files = pgTable(
  'files',
  {
    id: text('id')
      .$defaultFn(() => idGenerator('files'))
      .primaryKey(),

    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /**
     * mime
     */
    fileType: varchar('file_type', { length: 255 }).notNull(),
    /**
     * sha256
     */
    fileHash: varchar('file_hash', { length: 64 }).references(() => globalFiles.hashId, {
      onDelete: 'no action',
    }),
    name: text('name').notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    source: text('source').$type<FileSource>(),

    clientId: text('client_id'),
    metadata: jsonb('metadata'),
    chunkTaskId: uuid('chunk_task_id').references(() => asyncTasks.id, { onDelete: 'set null' }),
    embeddingTaskId: uuid('embedding_task_id').references(() => asyncTasks.id, {
      onDelete: 'set null',
    }),

    ...timestamps,
  },
  (table) => {
    return {
      fileHashIdx: index('file_hash_idx').on(table.fileHash),
      clientIdUnique: uniqueIndex('files_client_id_user_id_unique').on(
        table.clientId,
        table.userId,
      ),
    };
  },
);
export type NewFile = typeof files.$inferInsert;
export type FileItem = typeof files.$inferSelect;

export const knowledgeBases = pgTable(
  'knowledge_bases',
  {
    id: text('id')
      .$defaultFn(() => idGenerator('knowledgeBases'))
      .primaryKey(),

    name: text('name').notNull(),
    description: text('description'),
    avatar: text('avatar'),

    // different types of knowledge bases need to be distinguished
    type: varchar('type', { enum: ['personal', 'shared'], length: 20 }).default('personal'),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: text('client_id'),
    enabled: boolean('enabled').default(true).notNull(),

    isPublic: boolean('is_public').default(false),

    settings: jsonb('settings'),

    ...timestamps,
  },
  (t) => ({
    clientIdUnique: uniqueIndex('knowledge_bases_client_id_user_id_unique').on(
      t.clientId,
      t.userId,
    ),
    userIdUnique: uniqueIndex('knowledge_bases_user_id_unique').on(t.userId),
    typeUnique: uniqueIndex('knowledge_bases_type_unique').on(t.type),
    enabledUnique: uniqueIndex('knowledge_bases_enabled_unique').on(t.enabled),
  }),
);

export const insertKnowledgeBasesSchema = createInsertSchema(knowledgeBases);

export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;
export type KnowledgeBaseItem = typeof knowledgeBases.$inferSelect;

export const knowledgeBaseFiles = pgTable(
  'knowledge_base_files',
  {
    knowledgeBaseId: text('knowledge_base_id')
      .references(() => knowledgeBases.id, { onDelete: 'cascade' })
      .notNull(),

    fileId: text('file_id')
      .references(() => files.id, { onDelete: 'cascade' })
      .notNull(),

    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    createdAt: createdAt(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.knowledgeBaseId, t.fileId],
    }),
  }),
);

// Knowledge base grants table
export const knowledgeBaseGrants = pgTable(
  'knowledge_base_grants',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),

    knowledgeBaseId: text('knowledge_base_id')
      .references(() => knowledgeBases.id, { onDelete: 'cascade' })
      .notNull(),

    granteeType: varchar('grantee_type', { enum: ['user', 'role'], length: 20 }).notNull(),
    granteeUserId: text('grantee_user_id').references(() => users.id, { onDelete: 'cascade' }),
    granteeRoleId: integer('grantee_role_id').references(() => roles.id, { onDelete: 'cascade' }),

    permission: varchar('permission', { enum: ['read', 'write', 'manage'], length: 20 })
      .default('read')
      .notNull(),

    ...timestamps,
  },
  (t) => ({
    // 确保同一条记录只能有一种授权方式
    chkGranteeEitherOr: sql`CHECK ((${t.granteeType} = 'user' AND ${t.granteeUserId} IS NOT NULL AND ${t.granteeRoleId} IS NULL) OR (${t.granteeType} = 'role' AND ${t.granteeRoleId} IS NOT NULL AND ${t.granteeUserId} IS NULL))`,

    // 唯一索引，避免重复授权
    granteeUserUnique: uniqueIndex('knowledge_base_grants_grantee_user_unique').on(
      t.knowledgeBaseId,
      t.granteeUserId,
    ),
    granteeRoleUnique: uniqueIndex('knowledge_base_grants_grantee_role_unique').on(
      t.knowledgeBaseId,
      t.granteeRoleId,
    ),
  }),
);

export type NewKnowledgeBaseGrant = typeof knowledgeBaseGrants.$inferInsert;
export type KnowledgeBaseGrantItem = typeof knowledgeBaseGrants.$inferSelect;
