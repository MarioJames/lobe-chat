import debug from 'debug';

import { getServerDB } from '@/database/core/db-adaptor';
import { NewLogItem } from '@/database/schemas/log';
import { LogModel } from '@/database/models/log';
import { resolveLogCodeForTrpc } from '@/server/middlewares/logging/codes';
import { redactObject } from '@/server/middlewares/logging/redact';
import { asyncTrpc } from '../init';

const log = debug('lobe-trpc:async:logging');

export const loggingMiddleware = asyncTrpc.middleware(async ({ ctx, next, path, getRawInput }) => {
  if (!ctx.userId) return next();

  const start = Date.now();
  let input: unknown = undefined;

  try {
    input = await (getRawInput?.() ?? Promise.resolve(undefined));
  } catch (e) {
    log('getRawInput failed: %O', e);
  }

  const result = await next();

  const duration = Date.now() - start;
  const success = result.ok;

  let output: unknown = undefined;
  if (success) {
    output = redactObject(result.data);
  } else {
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