import { and, desc, eq } from 'drizzle-orm';

import { generateApiKey, isApiKeyExpired, validateApiKeyFormat } from '@/utils/apiKey';

import { ApiKeyItem, NewApiKeyItem, apiKeys } from '../schemas';
import { LobeChatDatabase } from '../type';

type EncryptAPIKeyVaults = (keyVaults: string) => Promise<string>;
type DecryptAPIKeyVaults = (
  keyVaults: string,
) => Promise<{ plaintext: string; wasAuthentic: boolean }>;

const defaultSerialize = (s: string) => s;

export class ApiKeyModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  create = async (
    params: Omit<NewApiKeyItem, 'userId' | 'id' | 'key'>,
    encryptor?: EncryptAPIKeyVaults,
  ) => {
    const key = generateApiKey();

    const encrypt = encryptor || defaultSerialize;

    const encryptedKey = await encrypt(key);

    const [result] = await this.db
      .insert(apiKeys)
      .values({ ...params, key: encryptedKey, userId: this.userId })
      .returning();

    return result;
  };

  delete = async (id: number) => {
    return this.db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, this.userId)));
  };

  deleteAll = async () => {
    return this.db.delete(apiKeys).where(eq(apiKeys.userId, this.userId));
  };

  query = async (decryptor?: DecryptAPIKeyVaults) => {
    const results = await this.db.query.apiKeys.findMany({
      orderBy: [desc(apiKeys.updatedAt)],
      where: eq(apiKeys.userId, this.userId),
    });

    // 如果没有提供解密器，直接返回原始结果
    if (!decryptor) {
      return results;
    }

    // 对每个 API Key 的 key 字段进行解密
    const decryptedResults = await Promise.all(
      results.map(async (apiKey) => {
        const decryptedKey = await decryptor(apiKey.key);
        return {
          ...apiKey,
          key: decryptedKey.plaintext,
        };
      }),
    );

    return decryptedResults;
  };

  findByKey = async (key: string, decryptor?: DecryptAPIKeyVaults) => {
    if (!validateApiKeyFormat(key)) {
      return null;
    }

    // Since API keys are encrypted with AES-GCM (which uses random IV),
    // we cannot search by encrypted value. Instead, we need to decrypt
    // all keys and compare with the plaintext.

    if (!decryptor) {
      // Without decryptor, we cannot find the key
      return null;
    }

    // Get all API keys from database
    const allKeys = await this.db.query.apiKeys.findMany();

    // Try to find matching key by decrypting each one
    for (const apiKey of allKeys) {
      try {
        const { plaintext, wasAuthentic } = await decryptor(apiKey.key);

        if (wasAuthentic && plaintext === key) {
          return apiKey;
        }
      } catch {
        // Skip keys that cannot be decrypted
        continue;
      }
    }

    return null;
  };

  validateKey = async (key: string, decryptor?: DecryptAPIKeyVaults) => {
    const apiKey = await this.findByKey(key, decryptor);

    if (!apiKey) return false;
    if (!apiKey.enabled) return false;
    if (isApiKeyExpired(apiKey.expiresAt)) return false;

    return true;
  };

  update = async (id: number, value: Partial<ApiKeyItem>) => {
    return this.db
      .update(apiKeys)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, this.userId)));
  };

  findById = async (id: number) => {
    return this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, id), eq(apiKeys.userId, this.userId)),
    });
  };

  updateLastUsed = async (id: number) => {
    return this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, this.userId)));
  };
}
