import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import { adminEnv } from '@/envs/admin';

export type AppRouter = any;

export const adminTrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      headers: () => ({
        'x-internal-token': adminEnv.ADMIN_INTERNAL_SECRET,
      }),
      transformer: superjson,
      url: adminEnv.ADMIN_TRPC_URL,
    }),
  ],
});
