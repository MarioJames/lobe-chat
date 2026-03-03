'use client';

import { Button } from '@lobehub/ui';
import { Card, Result } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
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

const normalizePathSegments = (path: string) => path.replace(/\/+$/, '').split('/').filter(Boolean);

const isSameRoute = (pathname: string | null, redirectTo: string) => {
  if (!pathname) return false;

  const pathnameSegments = normalizePathSegments(pathname);
  const redirectSegments = normalizePathSegments(redirectTo);

  if (redirectSegments.length === 0) return pathnameSegments.length === 0;
  if (pathnameSegments.length < redirectSegments.length) return false;

  return redirectSegments.every((segment, index) => {
    const pathnameIndex = pathnameSegments.length - redirectSegments.length + index;
    return pathnameSegments[pathnameIndex] === segment;
  });
};

const RoleGuard = memo<RoleGuardProps>(({ children, redirectTo = '/no-permission' }) => {
  const pathname = usePathname();
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
  const isOnRedirectPage = useMemo(() => isSameRoute(pathname, redirectTo), [pathname, redirectTo]);
  const shouldWaitForInitialAuth = !isLoaded && !isUserStateInit && !isRolesInitialized;

  const shouldCheckRoles = enableAuth && isServerMode;

  useEffect(() => {
    if (!shouldCheckRoles) return;
    if (shouldWaitForInitialAuth) return;
    if (!isLoginWithAuth) return;
    if (!isUserStateInit) return;
    if (!isRolesInitialized) return;
    if (hasActiveRole) return;
    if (isOnRedirectPage) return;

    router.replace(redirectTo);
  }, [
    isOnRedirectPage,
    hasActiveRole,
    isLoginWithAuth,
    isRolesInitialized,
    isUserStateInit,
    redirectTo,
    router,
    shouldWaitForInitialAuth,
    shouldCheckRoles,
  ]);

  if (!shouldCheckRoles) return children;

  // auth state not ready yet
  if (shouldWaitForInitialAuth) {
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
    if (isOnRedirectPage) return children;

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
