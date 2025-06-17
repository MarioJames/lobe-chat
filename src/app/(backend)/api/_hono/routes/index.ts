import { Hono } from 'hono';

import registerV1Routers from './v1';

export default function registerRouters(app: Hono) {
  // 注册 v1 相关路由
  registerV1Routers(app);
}
