import { z } from 'zod';

import { publicProcedure, router } from '@/libs/trpc/lambda';
import { SensitiveWordCheckResult, checkSensitiveText } from '@/services/admin/sensitive';

const RoleIdsSchema = z.union([z.string(), z.array(z.string())]).optional();
const RuleIdsSchema = z.union([z.string(), z.array(z.string())]).optional();

export const moderationRouter = router({
  checkText: publicProcedure
    .input(
      z.object({
        options: z.object({
          infraId: z.string().optional(),
          modelId: z.string(),
          roleIds: RoleIdsSchema,
          ruleIds: RuleIdsSchema,
          userId: z.string(),
        }),
        text: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const res = await checkSensitiveText({
        options: {
          infraId: input.options?.infraId,
          modelId: input.options?.modelId,
          roleIds: input.options?.roleIds,
          ruleIds: input.options?.ruleIds,
          userId: input.options?.userId,
        },
        text: input.text,
      });

      return res as SensitiveWordCheckResult;
    }),
});

export type ModerationRouter = typeof moderationRouter;
