import { adminEnv } from '@/envs/admin';
import { adminTrpc } from '@/libs/trpc/client/admin';

/**
 * 敏感词校验结果
 */
export interface SensitiveWordCheckResult {
  error?: string;
  externalResponse?: any;
  hasSensitiveWords: boolean;
  mode?: 'internal' | 'external';
  processedLength: number;
  processingTime: number;
  rulesUsed: string[];
  violations: SensitiveWordViolation[];
}

/**
 * 敏感词违规项
 */
export interface SensitiveWordViolation {
  confidence?: number;
  endIndex: number;
  id?: string;
  reply?: string;
  ruleId: string;
  ruleName?: string;
  source: 'internal' | 'external';
  startIndex: number;
  word: string;
}

export type AdminRoleIds = string | string[] | undefined;
export type AdminRuleIds = string | string[] | undefined;

export interface AdminSensitiveCheckInputOptions {
  infraId?: string;
  modelId: string;
  roleIds?: AdminRoleIds;
  ruleIds?: AdminRuleIds;
  userId: string;
}

export interface AdminSensitiveCheckInput {
  options: AdminSensitiveCheckInputOptions;
  text: string;
}

/**
 * 调用外部 Admin 服务的敏感词检测（服务端专用）。
 */
export const checkSensitiveText = async (params: AdminSensitiveCheckInput) => {
  if (typeof window !== 'undefined') throw new Error('checkSensitiveText 仅能在服务端调用');
  if (!adminEnv.ADMIN_TRPC_URL) throw new Error('ADMIN_TRPC_URL 未配置');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('moderation_timeout'), 10_000);

  try {
    // @ts-expect-error
    const res = (await adminTrpc.sensitiveWord.checkText.mutate(params, {
      signal: controller.signal,
    })) as SensitiveWordCheckResult;

    return res;
  } finally {
    clearTimeout(timer);
  }
};
