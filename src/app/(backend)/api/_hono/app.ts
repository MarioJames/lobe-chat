import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// 暂时注释掉，稍后添加
// import { errorHandler } from './middleware/error';
// import { v1Router } from './routes/v1';

// 创建Hono应用实例
const app = new Hono().basePath('/api');

// 配置Edge Runtime兼容性
export const runtime = 'edge';

// 全局中间件
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// 错误处理中间件 - 暂时使用简单的错误处理
app.onError((error, c) => {
  console.error('Hono Error:', error);
  return c.json({ error: error.message }, 500);
});

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    service: 'lobe-chat-api',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 版本信息端点
app.get('/version', (c) => {
  return c.json({
    api: 'v1',
    framework: 'hono',
    version: '1.0.0',
  });
});

// 注册v1版本路由 - 暂时添加简单的v1路由
app.get('/v1/status', (c) => {
  return c.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    version: 'v1',
  });
});

export { app as honoApp };
