import { adminEnv } from '@/envs/admin';
import { adminTrpc } from '@/libs/trpc/client/admin';

export interface SensitiveCheckParams {
  aggregatedModelIdsForScope?: string[];
  infraId?: string;
  modelId?: string;
  roleIdsForScope?: string[];
  ruleIds?: string[];
  signal?: AbortSignal;
  text: string;
}

/**
 * 调用外部 Admin 服务的敏感词检测（服务端专用）。
 */
export const checkSensitiveText = async (params: SensitiveCheckParams) => {
  if (typeof window !== 'undefined') throw new Error('checkSensitiveText 仅能在服务端调用');

  const {
    text,
    infraId = 'infra_x',
    modelId = 'model_y',
    ruleIds,
    aggregatedModelIdsForScope,
    roleIdsForScope,
    signal,
  } = params;

  if (!adminEnv.ADMIN_TRPC_URL) throw new Error('ADMIN_TRPC_URL 未配置');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('moderation_timeout'), 10_000);

  try {
    const res = await adminTrpc.sensitiveWord.checkText.mutate(
      {
        infraId,
        modelId,
        options: {
          aggregatedModelIdsForScope,
          roleIdsForScope,
          ruleIds,
        },
        text,
      },
      { signal: signal ?? controller.signal },
    );

    return res as { hasSensitiveWords: boolean; violations: any[] };
  } finally {
    clearTimeout(timer);
  }
};
