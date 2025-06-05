import { isDesktop } from '@/const/version';
import { getDBInstance } from '@/database/core/web-server';
import { LobeChatDatabase } from '@/database/type';
import { initializeRBAC } from '@/database/utils/rbacInit';

import { getPgliteInstance } from './electron';

/**
 * Lazy load database instance
 * Avoid initializing database on every module import
 */
let cachedDB: LobeChatDatabase | null = null;

export const getServerDB = async (): Promise<LobeChatDatabase> => {
  // If cached instance already exists, return it directly
  if (cachedDB) return cachedDB;

  try {
    // Choose appropriate database instance based on environment
    cachedDB = isDesktop ? await getPgliteInstance() : getDBInstance();

    // Asynchronously initialize RBAC system without blocking database return
    setImmediate(async () => {
      try {
        await initializeRBAC(cachedDB || undefined);
      } catch (error) {
        console.warn('RBAC initialization failed:', error);
      }
    });

    return cachedDB;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

export const serverDB = getDBInstance();
