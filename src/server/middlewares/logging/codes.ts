/**
 * 日志code映射
 */

export type LogCode =
  | 'agent-create'
  | 'agent-update'
  | 'agent-delete'
  | 'agent-read'
  | 'role-create'
  | 'role-update'
  | 'role-delete'
  | 'role-read'
  | 'session-create'
  | 'session-update'
  | 'session-delete'
  | 'session-read'
  | 'message-create'
  | 'message-update'
  | 'message-delete'
  | 'message-read'
  | 'file-create'
  | 'file-delete'
  | 'unknown';

export const LOG_CODE_MAP: Record<string, LogCode> = {
  'agent.create': 'agent-create',
  'agent.update': 'agent-update',
  'agent.delete': 'agent-delete',
  'agent.read': 'agent-read',
  'role.update': 'role-update',
  'role.create': 'role-create',
  'role.delete': 'role-delete',
  'role.read': 'role-read',
  'session.create': 'session-create',
  'session.update': 'session-update',
  'session.delete': 'session-delete',
  'session.read': 'session-read',
  'message.create': 'message-create',
  'message.update': 'message-update',
  'message.delete': 'message-delete',
  'message.read': 'message-read',
  'file.create': 'file-create',
  'file.delete': 'file-delete',
};

export const resolveLogCodeForTrpc = (path?: string): LogCode => {
  if (!path) return 'unknown';
  if (LOG_CODE_MAP[path]) return LOG_CODE_MAP[path];
  // fallback: agent.create => agent-create
  const normalized = path.replace(/\./g, '-');
  return (normalized as LogCode) || 'unknown';
};

export const resolveLogCodeForOpenapi = (method: string, pathname: string): LogCode => {
  const key = `${method.toUpperCase()} ${pathname}`;
  if (LOG_CODE_MAP[key]) return LOG_CODE_MAP[key];
  // 简单按路径第一段 + 方法推断
  const seg = pathname.split('/').find(Boolean) || 'unknown';
  const upper = method.toUpperCase();
  const action = upper === 'POST' ? 'create' : upper === 'PUT' || upper === 'PATCH' ? 'update' : upper === 'DELETE' ? 'delete' : 'read';
  const code = `${seg}-${action}`;
  return (code as LogCode) || 'unknown';
}; 