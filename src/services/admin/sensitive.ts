import { adminTrpc } from '@/libs/trpc/client/admin';

export interface SensitiveCheckParams {
  infraId?: string;
  modelId?: string;
  roleId?: string;
  signal?: AbortSignal;
  text: string;
}

/**
 * 调用外部 Admin 服务的敏感词检测（服务端专用）。
 */
export const checkSensitiveText = async (params: SensitiveCheckParams) => {
  if (typeof window !== 'undefined') {
    throw new Error('checkSensitiveText 仅能在服务端调用');
  }

  const { text, infraId, modelId, roleId, signal } = params;

  const client = adminTrpc as any;
  const res = await client.sensitiveWord.checkText.mutate(
    {
      infraId,
      modelId,
      roleId,
      text,
    },
    { signal },
  );

  return res as unknown;
};
