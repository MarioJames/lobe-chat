/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { boolean, integer, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';

import { createdAt } from '@/database/schemas/_helpers';

/**
 * 操作日志表
 */
export const logs = pgTable('logs', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(), // 主键,自增
  code: text('code').notNull(), // 操作code,非空
  type: varchar('type', { enum: ['trpc', 'openapi'], length: 20 }).notNull(), // 分类，非空
  belong: varchar('belong', { enum: ['lobechat', 'lobeadmin'], length: 20 }), // 归属，非空
  userId: text('user_id').notNull(), // 用户ID，非空
  userAgent: text('user_agent'), // 用户设备信息
  ip: text('ip'), // 用户ip地址
  input: jsonb('input'), // 接口入参
  output: jsonb('output'), // 接口出参
  duration: integer('duration'), // 请求耗时
  success: boolean('success'), // 结果，true成功，false失败
  createdAt: createdAt(), // 操作时间,非空,默认当前时间
});

export type LogItem = typeof logs.$inferSelect;
export type NewLogItem = typeof logs.$inferInsert;
