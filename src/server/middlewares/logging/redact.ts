/**
 * 敏感信息脱敏、长文本截断、安全序列化
 */

const SENSITIVE_KEYS = new Set([
  'apiKey',
  'apikey',
  'token',
  'access_token',
  'authorization',
  'password',
  'secret',
]);

export interface RedactOptions {
  maxLength?: number; // 最大长度，超出截断
}

const DEFAULT_OPTIONS: Required<RedactOptions> = {
  maxLength: 16 * 1024, // 16KB
};

export const redactObject = (value: unknown, options: RedactOptions = {}): unknown => {
  const { maxLength } = { ...DEFAULT_OPTIONS, ...options };

  const seen = new WeakSet();

  const truncate = (str: string) => (str.length > maxLength ? str.slice(0, maxLength) + '...[truncated]' : str);

  const walk = (v: unknown, keyPath: string[] = []): unknown => {
    if (v === null || v === undefined) return v;

    if (typeof v === 'string') return truncate(v);

    if (typeof v === 'number' || typeof v === 'boolean') return v;

    if (typeof v === 'object') {
      if (seen.has(v as object)) return '[circular]';
      seen.add(v as object);

      if (Array.isArray(v)) return v.map((item) => walk(item, keyPath));

      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const lower = k.toLowerCase();
        if (SENSITIVE_KEYS.has(lower)) {
          out[k] = '[redacted]';
        } else {
          out[k] = walk(val, keyPath.concat(k));
        }
      }
      return out;
    }

    try {
      return truncate(String(v));
    } catch {
      return '[unserializable]';
    }
  };

  return walk(value);
}; 