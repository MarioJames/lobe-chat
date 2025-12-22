'use client';

import { Button } from '@lobehub/ui';
import { Card, Result } from 'antd';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center } from 'react-layout-kit';

import FullscreenLoading from '@/components/Loading/FullscreenLoading';
import { enableAuth } from '@/const/auth';
import { isServerMode } from '@/const/version';
import { rbacSelectors, useRbacStore } from '@/store/rbac';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

export interface RoleGuardProps extends PropsWithChildren {
  redirectTo?: string;
}

const RoleGuard = memo<RoleGuardProps>(({ children, redirectTo = '/no-permission' }) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { t: tError } = useTranslation('error');

  const [isLoaded, isLoginWithAuth, isUserStateInit] = useUserStore((s) => [
    Boolean(authSelectors.isLoaded(s)),
    Boolean(authSelectors.isLoginWithAuth(s)),
    Boolean(s.isUserStateInit),
  ]);
  const logout = useUserStore((s) => s.logout);

  const [roles, isRolesInitialized] = useRbacStore((s) => [
    rbacSelectors.currentUserRoles(s),
    rbacSelectors.isRolesInitialized(s),
  ]);
  const useFetchCurrentUserRoles = useRbacStore((s) => s.useFetchCurrentUserRoles);

  const rolesSWR = useFetchCurrentUserRoles({
    enabled: enableAuth && isServerMode && isLoaded && isLoginWithAuth,
  });

  const stages = useMemo(
    () => [t('appLoading.initAuth'), t('appLoading.initUser'), t('appLoading.appInitializing')],
    [t],
  );

  const hasActiveRole = roles.some((r) => r.isActive);

  const shouldCheckRoles = enableAuth && isServerMode;

  useEffect(() => {
    if (!shouldCheckRoles) return;
    if (!isLoaded) return;
    if (!isLoginWithAuth) return;
    if (!isUserStateInit) return;
    if (!isRolesInitialized) return;
    if (hasActiveRole) return;

    router.replace(redirectTo);
  }, [
    hasActiveRole,
    isLoaded,
    isLoginWithAuth,
    isRolesInitialized,
    isUserStateInit,
    redirectTo,
    router,
    shouldCheckRoles,
  ]);

  if (!shouldCheckRoles) return children;

  // auth state not ready yet
  if (!isLoaded) {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <FullscreenLoading activeStage={0} stages={stages} />
      </div>
    );
  }

  // not logged in, allow access (route protection is handled by middleware if enabled)
  if (!isLoginWithAuth) {
    return children;
  }

  // wait for user initialization (onboard checks etc.)
  if (!isUserStateInit) {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <FullscreenLoading activeStage={1} stages={stages} />
      </div>
    );
  }

  if (rolesSWR.error) {
    return (
      <Center height="100vh">
        <Card
          style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            margin: 16,
            maxWidth: 520,
            minHeight: 280,
            width: '100%',
          }}
        >
          <Result
            extra={[
              <Button
                key="retry"
                onClick={() => {
                  rolesSWR.mutate();
                }}
                type="primary"
              >
                {tError('error.retry')}
              </Button>,
              <Button
                key="logout"
                onClick={() => {
                  logout();
                }}
              >
                {t('rbac.noPermission.logout')}
              </Button>,
            ]}
            status="error"
            subTitle={rolesSWR.error.message}
            title={tError('fetchError.title')}
          />
        </Card>
      </Center>
    );
  }

  // wait for roles ready
  if (!isRolesInitialized) {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <FullscreenLoading activeStage={2} stages={stages} />
      </div>
    );
  }

  // no available roles, redirecting...
  if (!hasActiveRole) {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <FullscreenLoading activeStage={2} stages={stages} />
      </div>
    );
  }

  return children;
});

RoleGuard.displayName = 'RoleGuard';

export default RoleGuard;
