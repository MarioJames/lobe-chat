'use client';

import { Button, Flexbox, Text } from '@lobehub/ui';
import { LobeHub } from '@lobehub/ui/brand';
import { Alert, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface FeishuAutoLoginProps {
  appId: string;
}

const FEISHU_JSSDK_URL = 'https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.23.js';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    min-width: 360px;
    padding-block: 2.5rem;
    padding-inline: 2rem;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;

    background: ${token.colorBgContainer};
  `,
}));

type Status =
  | 'detecting'
  | 'error'
  | 'loading-sdk'
  | 'not-feishu'
  | 'requesting-code'
  | 'signing-in'
  | 'success';

const STATUS_TEXT: Record<Status, string> = {
  'detecting': 'Detecting Feishu environment...',
  'error': 'Login failed',
  'loading-sdk': 'Loading Feishu SDK...',
  'not-feishu': 'Please open this page in Feishu client',
  'requesting-code': 'Requesting authorization...',
  'signing-in': 'Signing in...',
  'success': 'Login successful, redirecting...',
};

declare global {
  interface Window {
    tt?: {
      requestAccess: (opts: {
        appID: string;
        fail: (err: { errString: string; errno: number }) => void;
        scopeList: string[];
        success: (res: { code: string }) => void;
      }) => void;
      requestAuthCode: (opts: {
        appId: string;
        fail: (err: { errString: string; errno: number }) => void;
        success: (res: { code: string }) => void;
      }) => void;
    };
  }
}

const isFeishuClient = () => /lark|feishu/i.test(navigator.userAgent);

const handleFallbackLogin = () => {
  window.location.href = '/signin';
};

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)));
    document.head.append(script);
  });

const FeishuAutoLogin = memo<FeishuAutoLoginProps>(({ appId }) => {
  const { styles } = useStyles();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [status, setStatus] = useState<Status>('detecting');
  const [errorMsg, setErrorMsg] = useState('');
  const hasStarted = useRef(false);

  const requestFeishuCode = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.tt) {
        reject(new Error('Feishu JSSDK not loaded'));
        return;
      }

      const callRequestAuthCode = () => {
        window.tt!.requestAuthCode({
          appId,
          fail: (fallbackErr) => reject(new Error(fallbackErr.errString)),
          success: (res) => resolve(res.code),
        });
      };

      // Fallback 1: JSSDK version too low, requestAccess not available
      if (!window.tt.requestAccess) {
        callRequestAuthCode();
        return;
      }

      // Primary: use requestAccess (recommended by Feishu docs)
      window.tt.requestAccess({
        appID: appId,
        fail: (err) => {
          // Fallback 2: client version too low (errno 103)
          if (err.errno === 103) {
            callRequestAuthCode();
          } else {
            reject(new Error(err.errString || `Feishu auth failed (errno: ${err.errno})`));
          }
        },
        scopeList: [],
        success: (res) => resolve(res.code),
      });
    });
  }, [appId]);

  const startAutoLogin = useCallback(async () => {
    try {
      // Step 1: Detect Feishu environment
      if (!isFeishuClient()) {
        setStatus('not-feishu');
        return;
      }

      if (!appId) {
        setStatus('error');
        setErrorMsg(
          'Feishu app not configured. Please set AUTH_FEISHU_APP_ID environment variable.',
        );
        return;
      }

      // Step 2: Load Feishu JSSDK
      setStatus('loading-sdk');
      await loadScript(FEISHU_JSSDK_URL);

      // Step 3: Request auth code silently
      setStatus('requesting-code');
      const code = await requestFeishuCode();

      // Step 4: Sign in via our custom API endpoint
      setStatus('signing-in');
      const response = await fetch('/api/auth/feishu-auto-login', {
        body: JSON.stringify({ code }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setStatus('error');
        setErrorMsg(result.error || 'Authentication failed');
        return;
      }

      // Step 5: Redirect
      setStatus('success');
      window.location.href = result.redirect || callbackUrl;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [appId, callbackUrl, requestFeishuCode]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAutoLogin();
  }, [startAutoLogin]);

  const handleRetry = () => {
    hasStarted.current = false;
    setStatus('detecting');
    setErrorMsg('');
    startAutoLogin();
  };

  return (
    <div className={styles.container}>
      <Flexbox align="center" gap={24}>
        <LobeHub size={48} />
        <Text as="h4" style={{ margin: 0 }}>
          Feishu Auto Login
        </Text>

        {status === 'error' ? (
          <Flexbox align="center" gap={16} width="100%">
            <Alert showIcon description={errorMsg} message="Login Failed" type="error" />
            <Flexbox horizontal gap={8}>
              <Button onClick={handleRetry}>Retry</Button>
              <Button type="primary" onClick={handleFallbackLogin}>
                Manual Login
              </Button>
            </Flexbox>
          </Flexbox>
        ) : status === 'not-feishu' ? (
          <Flexbox align="center" gap={16} width="100%">
            <Alert
              showIcon
              description="This page only supports being opened in Feishu client. Please access via Feishu workspace."
              message="Non-Feishu Environment"
              type="warning"
            />
            <Button type="primary" onClick={handleFallbackLogin}>
              Go to Login Page
            </Button>
          </Flexbox>
        ) : (
          <Flexbox align="center" gap={12}>
            <Spin />
            <Text style={{ color: 'inherit' }}>{STATUS_TEXT[status]}</Text>
          </Flexbox>
        )}
      </Flexbox>
    </div>
  );
});

export default FeishuAutoLogin;
