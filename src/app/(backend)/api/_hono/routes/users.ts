import { Hono } from 'hono';

import { UserController } from '../controllers';
import { requireAuth } from '../middleware';

export default function registryUserRouters(app: Hono) {
  app.get('/user/current', requireAuth, async (c) => {
    console.log('获取当前用户信息');

    const userController = new UserController();

    return await userController.getCurrentUser(c);
  });
}
