import { FluentEmoji } from '@lobehub/ui';
import { t } from 'i18next';

import { notification } from '@/components/AntdStaticMethods';

import RedirectLogin from './RedirectLogin';

const whiteList = new Set(['/feishu-auto-login']);

const isAutoLoginPage = () =>
  typeof window !== 'undefined' && whiteList.has(window.location.pathname);

export const loginRequired = {
  redirect: ({ timeout = 2000 }: { timeout?: number } = {}) => {
    if (isAutoLoginPage()) return;

    notification.error({
      description: <RedirectLogin timeout={timeout} />,
      duration: timeout / 1000,
      icon: <FluentEmoji emoji={'🫡'} size={24} />,
      message: t('loginRequired.title', { ns: 'error' }),
      showProgress: true,
      type: 'warning',
    });
  },
};
