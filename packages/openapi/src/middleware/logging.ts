import { Context, Next } from 'hono';
import debug from 'debug';

import { getServerDB } from '@/database/core/db-adaptor';
import { LogModel } from '@/database/models/log';
import { NewLogItem } from '@/database/schemas/log';
import { redactObject } from '@/server/middlewares/logging/redact';
import { resolveLogCodeForOpenapi } from '@/server/middlewares/logging/codes';

const log = debug('lobe-hono:logging');

export const loggingMiddleware = async (c: Context, next: Next) => {
  // 未鉴权（无 userId）不记录
  const userId = c.get('userId') as string | undefined;
  if (!userId) return next();

  const start = Date.now();

  // 入参
  let input: any = {};
  try {
    const req = c.req;
    const url = new URL(req.url);
    const method = req.method;

    // 克隆原始请求体，避免消费原流
    const raw = req.raw.clone();
    let body: any = undefined;
    try {
      const text = await raw.text();
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = text;
      }
    } catch {}

    input = redactObject({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
    });
  } catch (e) {
    log('parse input failed: %O', e);
  }

  await next();

  const duration = Date.now() - start;

  // 输出（流式仅记录元信息）
  const res = c.res;
  const success = res.ok;
  let output: any = { status: res.status };

  try {
    const contentType = res.headers.get('content-type') || '';
    const isStream = contentType.includes('text/event-stream') || contentType.includes('application/octet-stream');

    if (!isStream) {
      const cloned = res.clone();
      const text = await cloned.text();
      try {
        output = redactObject(text ? JSON.parse(text) : { status: res.status });
      } catch {
        output = redactObject(text);
      }
    } else {
      output = { status: res.status, streamed: true };
    }
  } catch (e) {
    log('parse output failed: %O', e);
  }

  try {
    const req = c.req;
    const url = new URL(req.url);

    const db = await getServerDB();
    const model = new LogModel(db);

    const userAgent = req.header('user-agent') || undefined;
    const forwardedFor = req.header('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0]?.trim() || undefined;

    const item: NewLogItem = {
      code: resolveLogCodeForOpenapi(req.method, url.pathname),
      type: 'openapi',
      belong: 'lobechat',
      userId: userId!,
      userAgent,
      ip,
      input: input as any,
      output: output as any,
      duration,
      success,
    } as NewLogItem;

    await model.create(item);
  } catch (e) {
    log('insert log failed: %O', e);
  }
}; 