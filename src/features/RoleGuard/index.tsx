'use client';

import { Button, Icon, Text } from '@lobehub/ui';
import { Card } from 'antd';
import { createStyles } from 'antd-style';
import { ShieldAlert } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { enableAuth } from '@/const/auth';
import { isServerMode } from '@/const/version';
import { rbacSelectors, useRbacStore } from '@/store/rbac';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

const useStyles = createStyles(({ css, token }) => ({
  button: css`
    margin-block-start: ${token.marginLG}px;
  `,
  card: css`
    width: 100%;
    max-width: 520px;
    margin: ${token.margin}px;
    border: none;

    background: transparent;
    box-shadow: none;
  `,
  container: css`
    padding: ${token.paddingXL}px;
  `,
  description: css`
    max-width: 100%;

    font-size: ${token.fontSizeLG}px;
    line-height: 1.6;
    color: ${token.colorTextSecondary};
    text-align: center;
  `,
  iconWrapper: css`
    display: flex;
    align-items: center;
    justify-content: center;

    width: 64px;
    height: 64px;
    margin-block-end: ${token.marginMD}px;
    border-radius: 50%;

    color: ${token.colorText};

    background-color: ${token.colorFillTertiary};
  `,
  overlay: css`
    position: fixed;
    z-index: 9999;
    inset: 0;
    background: ${token.colorBgBase};
  `,
  title: css`
    margin-block-end: ${token.marginSM}px;

    font-size: ${token.fontSizeHeading3}px;
    font-weight: ${token.fontWeightStrong};
    color: ${token.colorText};
    text-align: center;
  `,
}));

const handleRefresh = () => {
  window.location.href = '/';
};

const RoleGuard = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('common');

  const [isLoaded, isLoginWithAuth] = useUserStore((s) => [
    Boolean(authSelectors.isLoaded(s)),
    Boolean(authSelectors.isLoginWithAuth(s)),
  ]);

  const [roles, isRolesInitialized] = useRbacStore((s) => [
    rbacSelectors.currentUserRoles(s),
    rbacSelectors.isRolesInitialized(s),
  ]);
  const useFetchCurrentUserRoles = useRbacStore((s) => s.useFetchCurrentUserRoles);

  useFetchCurrentUserRoles({
    enabled: enableAuth && isServerMode && isLoaded && isLoginWithAuth,
  });

  const shouldCheckRoles = enableAuth && isServerMode;
  const hasActiveRole = roles.some((r) => r.isActive);
  const shouldShowNoPermission =
    shouldCheckRoles && !hasActiveRole && isRolesInitialized && isLoginWithAuth;

  if (!shouldShowNoPermission) return null;

  return (
    <Center className={styles.overlay}>
      <Card className={styles.card}>
        <Flexbox align="center" className={styles.container}>
          <div className={styles.iconWrapper}>
            <Icon icon={ShieldAlert} size={32} />
          </div>
          <Text className={styles.title}>{t('rbac.noPermission.title')}</Text>
          <Text className={styles.description}>{t('rbac.noPermission.desc')}</Text>
          <Button className={styles.button} onClick={handleRefresh} type="primary">
            {t('rbac.noPermission.refresh')}
          </Button>
        </Flexbox>
      </Card>
    </Center>
  );
});

RoleGuard.displayName = 'RoleGuard';

export default RoleGuard;
