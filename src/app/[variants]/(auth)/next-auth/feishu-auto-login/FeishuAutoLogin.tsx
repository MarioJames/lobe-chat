'use client';

import { Button, Text } from '@lobehub/ui';
import { LobeHub } from '@lobehub/ui/brand';
import { Alert, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

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
  | 'loading-sdk'
  | 'requesting-code'
  | 'signing-in'
  | 'success'
  | 'error'
  | 'not-feishu';

const STATUS_TEXT: Record<Status, string> = {
  'detecting': '正在检测飞书环境...',
  'error': '登录失败',
  'loading-sdk': '正在加载飞书 SDK...',
  'not-feishu': '请在飞书客户端中打开此页面',
  'requesting-code': '正在获取授权...',
  'signing-in': '正在登录...',
  'success': '登录成功，正在跳转...',
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
  window.location.href = '/next-auth/signin';
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

export default memo<FeishuAutoLoginProps>(({ appId }) => {
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
        setErrorMsg('飞书应用未配置，请设置 AUTH_FEISHU_APP_ID 环境变量');
        return;
      }

      // Step 2: Load Feishu JSSDK
      setStatus('loading-sdk');
      await loadScript(FEISHU_JSSDK_URL);

      // Step 3: Request auth code silently
      setStatus('requesting-code');
      const code = await requestFeishuCode();

      // Step 4: Sign in via NextAuth Credentials provider
      setStatus('signing-in');
      const result = await signIn('feishu-auto-login', {
        callbackUrl,
        code,
        redirect: false,
      });

      if (result?.error) {
        setStatus('error');
        setErrorMsg(
          result.error === 'CredentialsSignin'
            ? '飞书账号验证失败，请确认应用配置是否正确'
            : `登录失败: ${result.error}`,
        );
        return;
      }

      // Step 5: Redirect
      setStatus('success');
      window.location.href = result?.url || callbackUrl;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '未知错误');
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
          飞书免登录
        </Text>

        {status === 'error' ? (
          <Flexbox align="center" gap={16} width="100%">
            <Alert description={errorMsg} message="登录失败" showIcon type="error" />
            <Flexbox gap={8} horizontal>
              <Button onClick={handleRetry}>重试</Button>
              <Button onClick={handleFallbackLogin} type="primary">
                手动登录
              </Button>
            </Flexbox>
          </Flexbox>
        ) : status === 'not-feishu' ? (
          <Flexbox align="center" gap={16} width="100%">
            <Alert
              description="此页面仅支持在飞书客户端内打开，请在飞书工作台中访问。"
              message="非飞书环境"
              showIcon
              type="warning"
            />
            <Button onClick={handleFallbackLogin} type="primary">
              前往登录页
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
