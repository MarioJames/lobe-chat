import { isDesktop } from '@/const/version';
import { getDBInstance } from '@/database/core/web-server';
import { LobeChatDatabase } from '@/database/type';

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

    return cachedDB;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

export const serverDB = getDBInstance();
