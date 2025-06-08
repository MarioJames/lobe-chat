import { Hono } from 'hono';

import { getAuthData, getAuthType, getUserId, requireAuth } from '../../middleware/oidc-auth';

/**
 * Demo routes to showcase the new authentication middleware
 * These routes demonstrate how to use OIDC and API Key authentication
 */
export function registryAuthDemoRouters(app: Hono) {
  // Public endpoint - no authentication required
  app.get('/v1/auth-demo/public', async (c) => {
    const userId = getUserId(c);
    const authType = getAuthType(c);

    return c.json({
      authType: authType || 'none',
      authenticated: !!userId,
      message: 'This is a public endpoint',
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
    });
  });

  // Protected endpoint - authentication required
  app.get('/v1/auth-demo/protected', requireAuth, async (c) => {
    const userId = getUserId(c);
    const authType = getAuthType(c);
    const authData = getAuthData(c);

    return c.json({
      authData:
        authType === 'apikey'
          ? {
              apiKey: '***masked***',
              userId: authData?.userId,
            }
          : authData,
      authType,
      message: 'This is a protected endpoint',
      timestamp: new Date().toISOString(),
      userId,
    });
  });

  // Endpoint to show authentication details
  app.get('/v1/auth-demo/whoami', requireAuth, async (c) => {
    const userId = getUserId(c);
    const authType = getAuthType(c);
    const authData = getAuthData(c);

    let authDetails: any = {
      authType,
      timestamp: new Date().toISOString(),
      userId,
    };

    // Add type-specific details
    switch (authType) {
      case 'oidc': {
        authDetails.oidc = {
          // Don't expose full payload for security
hasPayload: !!authData?.payload,
          
          sub: authData?.sub,
        };
        break;
      }
      case 'apikey': {
        authDetails.apiKey = {
          // Don't expose actual key for security
          keyProvided: !!authData?.apiKey,
          userId: authData?.userId,
        };
        break;
      }
      case 'clerk': {
        authDetails.clerk = {
          hasClerkAuth: !!authData,
        };
        break;
      }
      case 'nextauth': {
        authDetails.nextAuth = {
          hasSession: !!authData,
          // Don't expose full session for security
        };
        break;
      }
      case 'debug': {
        authDetails.debug = {
          mode: 'development',
        };
        break;
      }
    }

    return c.json({
      message: 'Authentication details',
      ...authDetails,
    });
  });

  // Endpoint to test different authentication methods
  app.post('/v1/auth-demo/test-auth', async (c) => {
    const userId = getUserId(c);
    const authType = getAuthType(c);

    if (!userId) {
      return c.json(
        {
          error: 'No authentication provided',
          message: 'Authentication test failed',
          suggestions: [
            'Use Bearer token with OIDC token',
            'Use Bearer token with API key (format: sk-{prefix}-{random})',
            'Use Clerk authentication',
            'Use NextAuth session',
          ],
        },
        401,
      );
    }

    return c.json({
      authType,
      message: 'Authentication test successful',
      timestamp: new Date().toISOString(),
      userId,
    });
  });
}
