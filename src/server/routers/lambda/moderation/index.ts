import { z } from 'zod';

import { publicProcedure, router } from '@/libs/trpc/lambda';
import { checkSensitiveText } from '@/services/admin/sensitive';

export const moderationRouter = router({
  checkText: publicProcedure
    .input(
      z.object({
        infraId: z.string().optional(),
        modelId: z.string().optional(),
        text: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const res = (await checkSensitiveText({
        infraId: input.infraId,
        modelId: input.modelId,
        text: input.text,
      })) as { matched: boolean; reply: string };

      return res;
    }),
});

export type ModerationRouter = typeof moderationRouter;
