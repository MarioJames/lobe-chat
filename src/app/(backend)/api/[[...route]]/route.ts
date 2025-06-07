import { handle } from 'hono/vercel';

import { honoApp } from '../_hono/app';

// 设置Edge Runtime以优化性能
export const runtime = 'edge';

// 导出所有需要的HTTP方法处理器
export const GET = handle(honoApp);
export const POST = handle(honoApp);
export const PUT = handle(honoApp);
export const DELETE = handle(honoApp);
export const PATCH = handle(honoApp);
export const OPTIONS = handle(honoApp);
export const HEAD = handle(honoApp);
