import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Feishu Auto-Login Provider
 *
 * Handles silent authentication when LobeChat is opened from within the
 * Feishu/Lark client (e.g. via Workspace). The Feishu JSSDK on the client
 * side obtains an auth code without user interaction, which is then exchanged
 * here for a user_access_token and user profile.
 *
 * This provider is separate from the standard Feishu OAuth provider because
 * it receives a pre-obtained auth code from the JSSDK rather than going
 * through the browser-based OAuth redirect flow.
 */
function FeishuAutoLogin() {
  return CredentialsProvider({
    authorize: async (credentials) => {
      const code = credentials?.code as string | undefined;
      if (!code) return null;

      const appId = process.env.AUTH_FEISHU_APP_ID;
      const appSecret = process.env.AUTH_FEISHU_APP_SECRET;

      if (!appId || !appSecret) {
        console.error('[FeishuAutoLogin] AUTH_FEISHU_APP_ID or AUTH_FEISHU_APP_SECRET not set');
        return null;
      }

      try {
        // Step 1: Exchange auth code for user_access_token
        const tokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
          body: JSON.stringify({
            client_id: appId,
            client_secret: appSecret,
            code,
            grant_type: 'authorization_code',
          }),
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          method: 'POST',
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
          console.error('[FeishuAutoLogin] Failed to get access_token:', tokenData);
          return null;
        }

        // Step 2: Get user profile
        const userRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userRes.json();

        if (userData.code !== 0 || !userData.data) {
          console.error('[FeishuAutoLogin] Failed to get user info:', userData);
          return null;
        }

        const profile = userData.data;

        // Return user object consistent with Feishu OAuth provider's profile mapping
        return {
          email: profile.email ?? null,
          id: profile.union_id,
          image: profile.avatar_url,
          name: profile.name,
        };
      } catch (error) {
        console.error('[FeishuAutoLogin] Error during authentication:', error);
        return null;
      }
    },
    credentials: {
      code: { label: 'Feishu Auth Code', type: 'text' },
    },
    id: 'feishu-auto-login',
    name: 'Feishu Auto Login',
  });
}

const provider = {
  id: 'feishu-auto-login',
  provider: FeishuAutoLogin(),
};

export default provider;
