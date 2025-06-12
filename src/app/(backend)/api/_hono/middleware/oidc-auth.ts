import debug from 'debug';
import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { LOBE_CHAT_AUTH_HEADER } from '@/const/auth';
import { getServerDB } from '@/database/core/db-adaptor';
import { ApiKeyModel } from '@/database/models/apiKey';
import { oidcEnv } from '@/envs/oidc';
import { OIDCService } from '@/server/services/oidc';
import { validateApiKeyFormat } from '@/utils/apiKey';
import { extractBearerToken } from '@/utils/server/auth';

// Create context logger namespace
const log = debug('lobe-hono:auth-middleware');

/**
 * Validate API Key and get associated user ID
 * @param apiKey - The API key to validate
 * @returns User ID if valid, null otherwise
 */
const validateApiKey = async (apiKey: string): Promise<string | null> => {
  try {
    log('Validating API Key: %s', apiKey ? 'provided' : 'not provided');

    if (!apiKey) return null;

    // Get database instance
    const db = await getServerDB();

    // Create API Key model without userId (for validation purposes)
    const apiKeyModel = new ApiKeyModel(db, '');

    // Find API key in database
    const apiKeyRecord = await apiKeyModel.findByKey(apiKey);

    if (!apiKeyRecord) {
      log('API Key not found in database');
      return null;
    }

    // Validate API key (check if enabled and not expired)
    const isValid = await apiKeyModel.validateKey(apiKey);

    if (!isValid) {
      log('API Key validation failed (disabled or expired)');
      return null;
    }

    log('API Key validation successful, userId: %s', apiKeyRecord.userId);

    // Update last used timestamp
    await apiKeyModel.updateLastUsed(apiKeyRecord.id);

    return apiKeyRecord.userId;
  } catch (error) {
    log('API Key validation error: %O', error);
    console.error('API Key validation error:', error);
    return null;
  }
};

/**
 * Standard Hono authentication middleware
 * Supports both OIDC tokens and API keys via Bearer token
 */
export const userAuthMiddleware = async (c: Context, next: Next) => {
  // Development mode debug bypass
  const isDebugApi = c.req.header('lobe-auth-dev-backend-api') === '1';
  if (process.env.NODE_ENV === 'development' && isDebugApi) {
    log('Development debug mode, using mock user ID');
    c.set('userId', process.env.MOCK_DEV_USER_ID);
    c.set('authType', 'debug');
    return next();
  }

  log('Processing authentication for request: %s %s', c.req.method, c.req.url);

  // Get Authorization header (standard Bearer token)
  const authorizationHeader = c.req.header('Authorization');
  const bearerToken = extractBearerToken(authorizationHeader);

  // Get LobeChat custom header (for backward compatibility)
  const lobeChatAuth = c.req.header(LOBE_CHAT_AUTH_HEADER);

  log('Authorization header: %s', authorizationHeader ? 'provided' : 'not provided');
  log('Bearer token extracted: %s', bearerToken ? 'yes' : 'no');
  log('LobeChat auth header: %s', lobeChatAuth ? 'provided' : 'not provided');

  let userId: string | null = null;
  let authType: string | null = null;
  let authData: any = null;

  // Try Bearer token authentication (OIDC first, then API Key)
  if (bearerToken) {
    // 1. if bearerToken is valid API-KEY, try API Key authentication
    if (validateApiKeyFormat(bearerToken)) {
      userId = await validateApiKey(bearerToken);
      if (userId) {
        authType = 'apikey';
        authData = {
          apiKey: bearerToken,
          userId: userId,
        };
        log('API Key authentication successful, userId: %s', userId);
      }
    }

    // 2. Try OIDC authentication, need ensure OIDC is ENABLE
    if (oidcEnv.ENABLE_OIDC) {
      log('Attempting OIDC authentication with Bearer token');
      try {
        const oidcService = await OIDCService.initialize();
        const tokenInfo = await oidcService.validateToken(bearerToken);

        userId = tokenInfo.userId;
        authType = 'oidc';
        authData = {
          payload: tokenInfo.tokenData,
          ...tokenInfo.tokenData,
          sub: tokenInfo.userId,
        };

        log('OIDC authentication successful, userId: %s', userId);
      } catch (error) {
        log('OIDC authentication failed: %O', error);
        // Continue to try API Key authentication
      }
    }
  }

  // Set authentication context in Hono context
  if (userId) {
    c.set('userId', userId);
    c.set('authType', authType);
    c.set('authData', authData);
    c.set('authorizationHeader', authorizationHeader);
    c.set('lobeChatAuth', lobeChatAuth);

    log('Authentication successful - userId: %s, authType: %s', userId, authType);
  } else {
    log('Authentication failed - no valid credentials found');
    // Don't throw error here, let individual routes decide if auth is required
    c.set('userId', null);
    c.set('authType', null);
  }

  await next();

  // todo: update API-KEY last usage time
};

/**
 * Helper middleware to require authentication
 * Throws 401 error if user is not authenticated
 */
export const requireAuth = async (c: Context, next: Next) => {
  const userId = c.get('userId');

  if (!userId) {
    log('Authentication required but user not authenticated');
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  return next();
};
