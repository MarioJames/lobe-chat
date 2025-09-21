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
    const client = adminTrpc as any;
    const res = await client.sensitiveWord.checkText.mutate(
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

    return res as unknown;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * 获取敏感词规则（测试连通性/权限用）
 */
export const fetchSensitiveWordRules = async () => {
  if (typeof window !== 'undefined') throw new Error('仅能在服务端调用');
  if (!adminEnv.ADMIN_TRPC_URL) throw new Error('ADMIN_TRPC_URL 未配置');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('rules_probe_timeout'), 5000);

  try {
    const client = adminTrpc as any;
    const res = await client.sensitiveWord.getAllSensitiveWordRules.query(undefined, {
      signal: controller.signal,
    });
    return res as unknown;
  } finally {
    clearTimeout(timer);
  }
};
