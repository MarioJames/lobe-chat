import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Admin (external) tRPC service environment variables
 * Server-side only
 */
export const adminEnv = createEnv({
  runtimeEnv: {
    ADMIN_INTERNAL_SECRET: process.env.ADMIN_INTERNAL_SECRET,
    ADMIN_TRPC_URL: process.env.ADMIN_TRPC_URL,
  },
  server: {
    ADMIN_INTERNAL_SECRET: z.string().optional(),
    ADMIN_TRPC_URL: z.string().url().optional(),
  },
});
