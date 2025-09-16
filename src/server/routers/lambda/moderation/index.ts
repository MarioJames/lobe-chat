import { z } from 'zod';

import { publicProcedure, router } from '@/libs/trpc/lambda';
import { checkSensitiveText } from '@/services/admin/sensitive';

export const moderationRouter = router({
  /**
   * 用于流式输出的实时审查：
   * - 输入为当前增量文本（chunk 或累积文本均可）
   * - 命中 matched=true 时，调用方应立刻中止大模型输出，并采用 reply 作为兜底回复
   */
  checkText: publicProcedure
    .input(
      z.object({
        infraId: z.string().optional(),
        modelId: z.string().optional(),
        roleId: z.string().optional(),
        text: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { text, roleId, infraId, modelId } = input;

      const res = (await checkSensitiveText({
        infraId,
        modelId,
        roleId,
        text,
      })) as { matched: boolean; reply: string };

      return res;
    }),
});

export type ModerationRouter = typeof moderationRouter;
