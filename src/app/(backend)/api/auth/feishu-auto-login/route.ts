import { createNanoId } from '@lobechat/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { account } from '@/database/schemas/betterAuth';
import { users } from '@/database/schemas/user';
import { serverDB } from '@/database/server';
import { authEnv } from '@/envs/auth';

const FEISHU_TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
const FEISHU_USERINFO_URL = 'https://open.feishu.cn/open-apis/authen/v1/user_info';

type FeishuUserProfile = {
  avatar_url?: string;
  email?: string;
  enterprise_email?: string;
  name?: string;
  open_id?: string;
  union_id?: string;
};

type FeishuTokenResponse = {
  access_token?: string;
  code?: number;
  data?: {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  message?: string;
  msg?: string;
};

type FeishuUserInfoResponse = {
  code?: number;
  data?: FeishuUserProfile;
  msg?: string;
};

interface FeishuAutoLoginRequest {
  code: string;
}

/**
 * Feishu Auto-Login API Endpoint
 *
 * Handles silent authentication when LobeChat is opened from within the
 * Feishu/Lark client. The Feishu JSSDK on the client side obtains an auth code
 * without user interaction, which is then exchanged here for a user_access_token
 * and user profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeishuAutoLoginRequest;
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const appId = authEnv.AUTH_FEISHU_APP_ID;
    const appSecret = authEnv.AUTH_FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[FeishuAutoLogin] AUTH_FEISHU_APP_ID or AUTH_FEISHU_APP_SECRET not set');
      return NextResponse.json({ error: 'Feishu SSO not configured' }, { status: 500 });
    }

    // Step 1: Exchange auth code for user_access_token
    const tokenRes = await fetch(FEISHU_TOKEN_URL, {
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        code,
        grant_type: 'authorization_code',
      }),
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      method: 'POST',
    });

    const tokenData = (await tokenRes.json()) as FeishuTokenResponse;

    // Handle both response formats: root level or nested in data
    const accessToken = tokenData.access_token || tokenData.data?.access_token;

    if (!accessToken) {
      console.error('[FeishuAutoLogin] Failed to get access_token:', tokenData);
      return NextResponse.json(
        { error: tokenData.msg || tokenData.message || 'Failed to get access token' },
        { status: 400 },
      );
    }

    // Step 2: Get user profile
    const userRes = await fetch(FEISHU_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = (await userRes.json()) as FeishuUserInfoResponse;

    if (userData.code !== 0 || !userData.data) {
      console.error('[FeishuAutoLogin] Failed to get user info:', userData);
      return NextResponse.json(
        { error: userData.msg || 'Failed to get user info' },
        { status: 400 },
      );
    }

    const profile = userData.data;
    const unionId = profile.union_id ?? profile.open_id;

    if (!unionId) {
      return NextResponse.json(
        { error: 'Invalid user profile: missing union_id' },
        { status: 400 },
      );
    }

    // Step 3: Find or create user
    // Use union_id to construct email for consistency (same as feishu OAuth provider)
    const email = profile.email || profile.enterprise_email || `${unionId}@feishu.sso`;
    const name = profile.name ?? unionId;
    const image = profile.avatar_url;

    // Check if user exists by email
    let [existingUser] = await serverDB
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // If not found by email, check if there's an account with this provider
    if (!existingUser) {
      const [existingAccount] = await serverDB
        .select({ userId: account.userId })
        .from(account)
        .where(and(eq(account.providerId, 'feishu'), eq(account.accountId, unionId)))
        .limit(1);

      if (existingAccount) {
        [existingUser] = await serverDB
          .select()
          .from(users)
          .where(eq(users.id, existingAccount.userId))
          .limit(1);
      }
    }

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user using better-auth internal API
      const ctx = await auth.$context;
      const newUser = await ctx.internalAdapter.createUser({
        email,
        emailVerified: false,
        image,
        name,
      });
      userId = newUser.id;

      // Create account link for feishu provider
      await serverDB.insert(account).values({
        accountId: unionId,
        createdAt: new Date(),
        id: createNanoId(12)(),
        providerId: 'feishu',
        userId,
      });
    }

    // Step 4: Create session using better-auth internal API
    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(userId);

    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Step 5: Set session cookie
    const response = NextResponse.json({
      redirect: '/',
      session,
      user: {
        email,
        id: userId,
        image,
        name,
      },
    });

    // Set the session cookie using better-auth's session configuration
    const sessionCookieName = 'better-auth.session_token';
    const isSecure = process.env.NODE_ENV === 'production';

    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      secure: isSecure,
    });

    return response;
  } catch (error) {
    console.error('[FeishuAutoLogin] Error during authentication:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
