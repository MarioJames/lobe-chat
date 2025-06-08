import { Hono } from 'hono';

import { UserController } from '../../controllers/v1/user.controller';
import { requireAuth } from '../../middleware/oidc-auth';

export function registryUserRouters(app: Hono) {
  // 用户相关路由 - 路径前缀：/api/v1/user
  app.get('/v1/user/profile', requireAuth, async (c) => {
    const userController = new UserController();
    return await userController.getProfile(c);
  });

  app.get('/v1/user/info', async (c) => {
    const userController = new UserController();
    return await userController.getInfo(c);
  });

  app.get('/v1/user/status', async (c) => {
    const userController = new UserController();
    return await userController.getStatus(c);
  });
}
