import { Hono } from 'hono';

import { userRouter } from './users';

// 创建v1版本的路由实例
const v1Router = new Hono();

// 注册各个业务域的路由
v1Router.route('/user', userRouter);

// v1版本的状态端点
v1Router.get('/status', (c) => {
  return c.json({
    endpoints: {
      user: '/api/v1/user',
    },
    status: 'active',
    timestamp: new Date().toISOString(),
    version: 'v1',
  });
});

export { v1Router };
