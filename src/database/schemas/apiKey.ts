/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { timestamps, timestamptz } from './_helpers';
import { users } from './user';

export const apiKeys = pgTable('api_keys', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(), // auto-increment primary key
  name: text('name').notNull(), // name of the API key
  key: text('key').notNull().unique(), // API key
  description: text('description'), // description of the API key
  enabled: boolean('enabled').default(true), // whether the API key is enabled
  expiresAt: timestamptz('expires_at'),
  lastUsedAt: timestamptz('last_used_at'),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  ...timestamps,
});

export const insertApiKeySchema = createInsertSchema(apiKeys);

export type ApiKeyItem = typeof apiKeys.$inferSelect;
export type NewApiKeyItem = typeof apiKeys.$inferInsert;
