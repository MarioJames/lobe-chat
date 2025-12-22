'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect } from 'react';

import { enableAuth } from '@/const/auth';
import { rbacSelectors, useRbacStore } from '@/store/rbac';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { AppLoadingStage } from '../stage';

interface RedirectProps {
  setLoadingStage: (value: AppLoadingStage) => void;
}

const Redirect = memo<RedirectProps>(({ setLoadingStage }) => {
  const router = useRouter();
  const [isLogin, isLoaded, isUserStateInit, isOnboard] = useUserStore((s) => [
    authSelectors.isLogin(s),
    authSelectors.isLoaded(s),
    s.isUserStateInit,
    s.isOnboard,
  ]);

  const [isRolesInitialized, roles] = useRbacStore((s) => [
    rbacSelectors.isRolesInitialized(s),
    rbacSelectors.currentUserRoles(s),
  ]);

  const navToChat = () => {
    setLoadingStage(AppLoadingStage.GoToChat);
    router.replace('/chat');
  };

  useEffect(() => {
    // if user auth state is not ready, wait for loading
    if (!isLoaded) {
      setLoadingStage(AppLoadingStage.InitAuth);
      return;
    }

    // this mean user is definitely not login
    if (!isLogin) {
      navToChat();
      return;
    }

    // if user state not init, wait for loading
    if (!isUserStateInit) {
      setLoadingStage(AppLoadingStage.InitUser);
      return;
    }

    // wait for roles info to be ready and valid
    if (enableAuth) {
      if (!isRolesInitialized) {
        setLoadingStage(AppLoadingStage.InitUser);
        return;
      }

      if (roles.length === 0) {
        router.replace('/no-permission');
        return;
      }
    }

    // user need to onboard
    if (!isOnboard) {
      router.replace('/onboard');
      return;
    }

    // finally go to chat
    navToChat();
  }, [isUserStateInit, isLoaded, isOnboard, isLogin, isRolesInitialized, roles.length]);

  return null;
});

export default Redirect;
