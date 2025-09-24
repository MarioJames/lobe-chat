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
    let stopped = false;

    const moderationTransform = new TransformStream<Uint8Array, Uint8Array>({
      flush(controller) {
        if (!stopped && buffer) controller.enqueue(textEncoder.encode(buffer));
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

            controller.enqueue(textEncoder.encode(line));
          } else if (trimmed.startsWith('data:')) {
            // 仅对 text 事件进行实时审查
            if (currentEvent === 'text') {
              const content = trimmed.slice('data:'.length).trim();

              // 先累积，再进行审查
              if (content) aggregatedText += content;

              try {
                const mres = await checkSensitiveText({
                  infraId: provider,
                  modelId: data.model as string,
                  text: aggregatedText,
                });

                if (mres?.hasSensitiveWords) {
                  const replyText = mres?.violations?.[0]?.reply || '内容不合规';
                  const out = `event: text\ndata: ${JSON.stringify(replyText)}\n\n`;
                  controller.enqueue(textEncoder.encode(out));

                  if (typeof controller.terminate === 'function') controller.terminate();

                  stopped = true;
                  return;
                }
              } catch {
                // 审查失败不影响主流程，仅告警（最小改动，不抛错）
              }

              // 未命中时才透传原始 data 行
              controller.enqueue(textEncoder.encode(line));
            } else {
              // 非文本事件原样透传
              controller.enqueue(textEncoder.encode(line));
            }
          } else {
            // 其它行（空行或未识别）原样透传
            controller.enqueue(textEncoder.encode(line));
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
