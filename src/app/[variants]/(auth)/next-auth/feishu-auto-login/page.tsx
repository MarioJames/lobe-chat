import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';

import FeishuAutoLogin from './FeishuAutoLogin';

export const dynamic = 'force-dynamic';

export default () => {
  const appId = process.env.AUTH_FEISHU_APP_ID ?? '';

  return (
    <Suspense fallback={<Loading />}>
      <FeishuAutoLogin appId={appId} />
    </Suspense>
  );
};
