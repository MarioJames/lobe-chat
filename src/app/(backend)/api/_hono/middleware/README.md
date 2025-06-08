# Hono Middleware

This directory contains middleware for the Hono API framework, including authentication and authorization components.

## Overview

The middleware system provides:

1. **Authentication Middleware** (`oidc-auth.ts`):

   - OIDC tokens via Bearer token
   - API keys via Bearer token
   - Clerk authentication (fallback)
   - NextAuth sessions (fallback)
   - Development debug mode

2. **Permission Check Middleware** (`permission-check.ts`):

   - RBAC-based permission validation
   - Single and multiple permission checks
   - AND/OR logic for multiple permissions
   - Custom error messages
   - Development mode bypass

3. **Error Handling Middleware** (`error.ts`):
   - Centralized error handling
   - Structured error responses

## Authentication Middleware

The authentication middleware follows Bearer token priority:

- First attempts OIDC token validation
- If OIDC fails, attempts API key validation
- Falls back to other authentication methods

3. **Sets authentication context** in Hono context for use by controllers

## Permission Check Middleware

The permission check middleware provides RBAC-based authorization for Hono routes.

### Features

- **Single Permission Check**: Verify user has a specific permission
- **Multiple Permission Check**: Check multiple permissions with AND/OR logic
- **Custom Error Messages**: Provide meaningful error responses
- **Development Mode Bypass**: Skip checks in development environment
- **Context Integration**: Store permission check results in Hono context

### Basic Usage

```typescript
import { BASIC_PERMISSIONS } from '@/const/rbac';

import { requirePermission, requireSinglePermission } from './permission-check';

// Single permission check
app.get('/users', requireSinglePermission(BASIC_PERMISSIONS.USER_READ), async (c) => {
  return c.json({ users: [] });
});

// Multiple permissions with OR logic (default)
app.get(
  '/dashboard',
  requirePermission({
    permissions: [BASIC_PERMISSIONS.SYSTEM_MONITOR, BASIC_PERMISSIONS.SYSTEM_LOG_VIEW],
    operator: 'OR',
  }),
  async (c) => {
    return c.json({ dashboard: 'data' });
  },
);

// Multiple permissions with AND logic
app.put(
  '/users/:id',
  requirePermission({
    permissions: [BASIC_PERMISSIONS.USER_UPDATE, BASIC_PERMISSIONS.USER_PROFILE_UPDATE],
    operator: 'AND',
    errorMessage: 'Insufficient permissions to update user profile',
  }),
  async (c) => {
    return c.json({ message: 'User updated' });
  },
);
```

### Advanced Usage

```typescript
import { checkPermissionInHandler, getCheckedPermissions } from './permission-check';

// Manual permission check in handler
app.post('/files', async (c) => {
  const canUpload = await checkPermissionInHandler(c, BASIC_PERMISSIONS.FILE_UPLOAD);

  if (!canUpload) {
    return c.json({ error: 'Permission denied' }, 403);
  }

  // Process file upload
  return c.json({ message: 'File uploaded' });
});

// Access permission check results
app.get('/api-info', requireSinglePermission(BASIC_PERMISSIONS.API_KEY_READ), async (c) => {
  const checkedPermissions = getCheckedPermissions(c);

  return c.json({
    data: 'API information',
    permissions: checkedPermissions,
  });
});
```

### Configuration Options

The `requirePermission` function accepts the following options:

- `permissions`: String or array of permission codes to check
- `operator`: 'AND' or 'OR' logic for multiple permissions (default: 'OR')
- `errorMessage`: Custom error message for permission failures
- `skipInDev`: Skip permission check in development mode (default: false)

### Convenience Functions

- `requireSinglePermission(code, errorMessage?)`: Check single permission
- `requireAllPermissions(codes, errorMessage?)`: Check all permissions (AND logic)
- `requireAnyPermission(codes, errorMessage?)`: Check any permission (OR logic)

## Usage

### Basic Setup

The authentication middleware is automatically applied globally in `app.ts`:

```typescript
import { userAuthMiddleware } from './middleware/oidc-auth';

app.use('*', userAuthMiddleware);
```

### Permission-Protected Routes

For routes that require specific permissions, apply both authentication and permission middleware:

```typescript
import { BASIC_PERMISSIONS } from '@/const/rbac';

import { userAuthMiddleware } from './middleware/oidc-auth';
import { requireSinglePermission } from './middleware/permission-check';

// Apply authentication globally
app.use('*', userAuthMiddleware);

// Apply permission check to specific routes
app.get('/admin/users', requireSinglePermission(BASIC_PERMISSIONS.USER_READ), async (c) => {
  // Handler code - user is authenticated and has USER_READ permission
  return c.json({ users: [] });
});
```

### Requiring Authentication

Use the `requireAuth` middleware for protected routes:

```typescript
import { requireAuth } from '../middleware/oidc-auth';

app.get('/protected-route', requireAuth, async (c) => {
  // Route handler - user is guaranteed to be authenticated
});
```

### Accessing Authentication Information

In your controllers, use the helper functions:

```typescript
import { getAuthData, getAuthType, getUserId } from '../middleware/oidc-auth';

// Or use the base controller methods:
class MyController extends BaseController {
  async myMethod(c: Context) {
    const userId = this.getUserId(c);
    const authType = this.getAuthType(c);
    const authData = this.getAuthData(c);
    const isAuth = this.isAuthenticated(c);

    // Your logic here
  }
}
```

## Authentication Methods

### 1. OIDC Token Authentication

Send OIDC token in Authorization header:

```bash
curl -H "Authorization: Bearer <oidc-token>" /api/v1/protected
```

### 2. API Key Authentication

Send API key in Authorization header:

```bash
curl -H "Authorization: Bearer sk-lobe-1234567890abcdef" /api/v1/protected
```

API keys must follow the format: `sk-{prefix}-{16-char-hex}`

### 3. Development Debug Mode

In development, use the debug header:

```bash
curl -H "lobe-auth-dev-backend-api: 1" /api/v1/protected
```

## Context Variables

The middleware sets the following variables in Hono context:

- `userId`: User ID (string | null)
- `authType`: Authentication type ('oidc' | 'apikey' | 'clerk' | 'nextauth' | 'debug' | null)
- `authData`: Authentication-specific data object
- `authorizationHeader`: Original Authorization header value
- `lobeChatAuth`: LobeChat custom auth header (for backward compatibility)

## Authentication Types

### OIDC (`authType: 'oidc'`)

```typescript
authData = {
  payload: tokenData,
  sub: userId,
  // ...other OIDC claims
};
```

### API Key (`authType: 'apikey'`)

```typescript
authData = {
  apiKey: 'sk-lobe-...',
  userId: 'user-123',
};
```

### Clerk (`authType: 'clerk'`)

```typescript
authData = clerkAuthObject;
```

### NextAuth (`authType: 'nextauth'`)

```typescript
authData = sessionUser;
```

### Debug (`authType: 'debug'`)

```typescript
authData = null;
```

## Testing

Test the authentication with the demo endpoints:

- `GET /api/v1/auth-demo/public` - Public endpoint
- `GET /api/v1/auth-demo/protected` - Protected endpoint
- `GET /api/v1/auth-demo/whoami` - Authentication details
- `POST /api/v1/auth-demo/test-auth` - Test authentication

## Error Handling

- Unauthenticated requests to protected routes return 401
- Invalid API keys are silently ignored (falls back to other methods)
- OIDC validation errors are logged and fall back to API key validation
- Database errors during API key validation are logged and return null

## Security Considerations

1. API keys are validated against the database and checked for:

   - Existence
   - Enabled status
   - Expiration date

2. Last used timestamp is updated on successful API key authentication

3. Sensitive data is not exposed in responses (API keys are masked)

4. Debug mode only works in development environment
