import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';
import { authEnv } from '@/envs/auth';

import FeishuAutoLogin from './FeishuAutoLogin';

const appId = authEnv.AUTH_FEISHU_APP_ID ?? '';

export default function FeishuAutoLoginPage() {
  return (
    <Suspense fallback={<Loading debugId="feishu-auto-login" />}>
      <FeishuAutoLogin appId={appId} />
    </Suspense>
  );
}
