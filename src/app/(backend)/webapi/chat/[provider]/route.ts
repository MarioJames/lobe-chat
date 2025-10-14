import {
  AGENT_RUNTIME_ERROR_SET,
  ChatCompletionErrorPayload,
  ModelRuntime,
} from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { createTraceOptions, initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { checkSensitiveText } from '@/services/admin/sensitive';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

export const maxDuration = 300;
// 每累计一定字符数再触发一次敏感词审查，减少调用频率
const MODERATION_CHAR_STEP = 32;

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const { provider } = await params;

  try {
    // ============  1. init chat model   ============ //
    let modelRuntime: ModelRuntime;
    if (createRuntime) {
      modelRuntime = createRuntime(jwtPayload);
    } else {
      modelRuntime = await initModelRuntimeWithUserPayload(provider, jwtPayload);
    }

    // ============  2. create chat completion   ============ //

    const data = (await req.json()) as ChatStreamPayload;

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, { provider, trace: tracePayload });
    }

    const res = await modelRuntime.chat(data, {
      user: jwtPayload.userId,
      ...traceOptions,
      signal: req.signal,
    });

    // 如果不是流式响应或无正文，直接返回
    if (!res.body) return res;

    // 包装一层流进行实时审查
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();

    let buffer = '';
    let currentEvent = '' as
      | 'text'
      | 'usage'
      | 'reasoning'
      | 'tool_calls'
      | 'grounding'
      | 'error'
      | '';
    let aggregatedText = '';
    let lastModeratedLength = 0;
    let lastEmittedLength = 0;
    let stopped = false;

    // 抽离敏感词检查，复用于 transform / flush
    const moderate = async (text: string) => {
      try {
        const mres = await checkSensitiveText({
          options: {
            infraId: provider,
            modelId: data.model,
            userId: jwtPayload.userId!,
          },
          text,
        });

        return {
          blocked: Boolean(mres?.hasSensitiveWords),
          replyText: mres?.violations?.[0]?.reply || '内容不合规',
        } as const;
      } catch {
        // 审查失败不影响主流程
        return { blocked: false as const };
      }
    };

    const moderationTransform = new TransformStream<Uint8Array, Uint8Array>({
      async flush(controller) {
        if (stopped) return;

        // 在流结束时，如果仍有未审查的新文本，进行一次最终审查
        if (aggregatedText.length > lastModeratedLength) {
          const res = await moderate(aggregatedText);
          if (res.blocked) {
            const out = `event: text\ndata: ${JSON.stringify(res.replyText)}\n\n`;
            controller.enqueue(textEncoder.encode(out));

            if (typeof controller.terminate === 'function') controller.terminate();

            stopped = true;
            return;
          }

          lastModeratedLength = aggregatedText.length;
        }

        // 未命中敏感词：补发未输出的尾部安全文本（如果还有增量）
        if (!stopped && aggregatedText.length > lastEmittedLength) {
          const tail = aggregatedText.slice(lastEmittedLength);
          if (tail) {
            const out = `event: text\ndata: ${JSON.stringify(tail)}\n\n`;
            controller.enqueue(textEncoder.encode(out));
            lastEmittedLength = aggregatedText.length;
          }
        }

        if (buffer) controller.enqueue(textEncoder.encode(buffer));
      },

      async transform(chunk, controller) {
        if (stopped) return;

        const str = textDecoder.decode(chunk, { stream: true });
        buffer += str;

        // 逐行处理，识别 SSE 的 event/data 格式
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1 && !stopped) {
          const line = buffer.slice(0, newlineIndex + 1); // 包含换行
          buffer = buffer.slice(newlineIndex + 1);

          const trimmed = line.trimEnd();

          if (trimmed.startsWith('event:')) {
            const evt = trimmed.slice('event:'.length).trim();
            // 仅识别我们关心的事件类型
            if (
              evt === 'text' ||
              evt === 'usage' ||
              evt === 'reasoning' ||
              evt === 'tool_calls' ||
              evt === 'grounding' ||
              evt === 'error'
            ) {
              currentEvent = evt as typeof currentEvent;
            } else {
              currentEvent = '';
            }

            // 对 text 事件不立即透传，等校验后统一输出（可完全替换）
            if (currentEvent !== 'text') controller.enqueue(textEncoder.encode(line));
          } else if (trimmed.startsWith('data:')) {
            // 仅对 text 事件进行实时审查
            if (currentEvent === 'text') {
              const rawData = trimmed.slice('data:'.length).trim();
              // data 行通常是 JSON 字符串，如 "你好"，这里尽量解析为纯文本
              let content = rawData;
              if (rawData.startsWith('"')) {
                try {
                  const parsed = JSON.parse(rawData);
                  if (typeof parsed === 'string') content = parsed;
                } catch {
                  // 非严格 JSON 或解析失败，回退为原文本
                }
              }

              // 先累积，再（按阈值）进行审查
              if (content) aggregatedText += content;
              const needByLength =
                aggregatedText.length - lastModeratedLength >= MODERATION_CHAR_STEP;

              if (needByLength) {
                const res = await moderate(aggregatedText);
                if (res.blocked) {
                  const out = `event: text\ndata: ${JSON.stringify(res.replyText)}\n\n`;
                  controller.enqueue(textEncoder.encode(out));

                  if (typeof controller.terminate === 'function') controller.terminate();

                  stopped = true;
                  return;
                }

                // 未命中则更新最近审查的长度，避免过于频繁
                lastModeratedLength = aggregatedText.length;

                // 通过审查后，按增量透出安全文本（仅输出新增部分）
                if (aggregatedText.length > lastEmittedLength) {
                  const safeChunk = aggregatedText.slice(lastEmittedLength);
                  if (safeChunk) {
                    const out = `event: text\ndata: ${JSON.stringify(safeChunk)}\n\n`;
                    controller.enqueue(textEncoder.encode(out));
                    lastEmittedLength = aggregatedText.length;
                  }
                }
              }

              // 对 text 的原始 data 行不透传，等待统一输出
            } else {
              // 非文本事件原样透传
              controller.enqueue(textEncoder.encode(line));
            }
          } else {
            // 其它行（空行或未识别）
            // 如果是 text 事件下的空行，跳过，避免产生没有 data 的空事件块
            if (currentEvent === 'text' && trimmed === '') {
              // skip empty line in text event
            } else {
              controller.enqueue(textEncoder.encode(line));
            }
          }

          newlineIndex = buffer.indexOf('\n');
        }
      },
    });

    const moderated = res.body.pipeThrough(moderationTransform);

    // 复用原响应头
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));

    return new Response(moderated, { headers });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    // track the error at server side
    console[logMethod](`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
