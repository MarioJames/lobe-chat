import { Hono } from 'hono';

import { registryAuthDemoRouters } from './auth-demo';
import { registryUserRouters } from './users';

export default function registryV1Routers(app: Hono) {
  // V1 版本状态端点
  app.get('/v1/status', (c) => {
    return c.json({
      endpoints: {
        'auth-demo/protected': '/api/v1/auth-demo/protected (需要认证)',
        'auth-demo/public': '/api/v1/auth-demo/public (无需认证)',
        'auth-demo/test-auth': '/api/v1/auth-demo/test-auth (测试认证)',
        'auth-demo/whoami': '/api/v1/auth-demo/whoami (需要认证)',
        'user/info': '/api/v1/user/info (可选认证)',
        'user/profile': '/api/v1/user/profile (需要认证)',
        'user/status': '/api/v1/user/status (无需认证)',
      },
      status: 'active',
      timestamp: new Date().toISOString(),
      version: 'v1',
    });
  });

  // 注册认证演示路由
  registryAuthDemoRouters(app);

  // 注册用户相关路由
  registryUserRouters(app);

  // 未来可以在这里注册其他业务模块路由
  // registryMessageRouters(app);
  // registryFileRouters(app);
  // registrySettingsRouters(app);
}
