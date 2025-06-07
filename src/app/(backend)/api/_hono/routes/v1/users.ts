import { Hono } from 'hono';

import { UserController } from '../../controllers/v1/user.controller';

// 创建用户路由实例
const userRouter = new Hono();

// 获取当前用户信息 - 需要认证
userRouter.get('/profile', async (c) => {
  const userController = new UserController();
  return await userController.getProfile(c);
});

// 获取用户公开信息 - 可选认证
userRouter.get('/info', async (c) => {
  const userController = new UserController();
  return await userController.getInfo(c);
});

// 用户状态检查 - 无需认证
userRouter.get('/status', async (c) => {
  const userController = new UserController();
  return await userController.getStatus(c);
});

export { userRouter };
