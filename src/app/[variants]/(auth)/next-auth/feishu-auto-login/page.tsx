import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';

import FeishuAutoLogin from './FeishuAutoLogin';

export default () => (
  <Suspense fallback={<Loading />}>
    <FeishuAutoLogin />
  </Suspense>
);
