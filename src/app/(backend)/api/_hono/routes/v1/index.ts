import { Hono } from 'hono';

import registerUserRouters from './users';

export default function registerV1Routers(app: Hono) {
  // 注册用户相关路由
  registerUserRouters(app);

  // 未来可以在这里注册其他业务模块路由
  // registryMessageRouters(app);
  // registryFileRouters(app);
  // registrySettingsRouters(app);
}
