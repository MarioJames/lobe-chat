import debug from 'debug';

import { getServerDB } from '@/database/core/db-adaptor';
import { NewLogItem } from '@/database/schemas/log';
import { LogModel } from '@/database/models/log';
import { trpc } from '../init';
import { resolveLogCodeForTrpc } from '@/server/middlewares/logging/codes';
import { redactObject } from '@/server/middlewares/logging/redact';

const log = debug('lobe-trpc:lambda:logging');

export const loggingMiddleware = trpc.middleware(async ({ ctx, next, path, getRawInput }) => {
  // 按要求：未鉴权（无 userId）则不记录
  if (!ctx.userId) return next();

  const start = Date.now();
  let input: unknown = undefined;

  try {
    input = await (getRawInput?.() ?? Promise.resolve(undefined));
  } catch (e) {
    // 读取失败不影响主流程
    log('getRawInput failed: %O', e);
  }

  const result = await next();

  const duration = Date.now() - start;
  const success = result.ok;

  let output: unknown = undefined;
  if (success) {
    output = redactObject(result.data);
  } else {
    // 简化错误输出
    output = redactObject({ error: result.error?.message, code: result.error?.code });
  }

  try {
    const db = await getServerDB();
    const model = new LogModel(db);
    const item: NewLogItem = {
      code: resolveLogCodeForTrpc(path),
      type: 'trpc',
      belong: 'lobechat',
      userId: ctx.userId!,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      input: redactObject(input),
      output,
      duration,
      success,
    } as NewLogItem;

    await model.create(item);
  } catch (e) {
    log('insert log failed: %O', e);
  }

  return result;
}); 