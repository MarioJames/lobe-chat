import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RoleGuard from '../RoleGuard';

const mockState = vi.hoisted(() => ({
  mutate: vi.fn(),
  pathname: '/chat',
  replace: vi.fn(),
  rbac: {
    initRoles: true,
    roles: [] as Array<{ id: number; isActive: boolean; name: string }>,
  },
  user: {
    isLoaded: true,
    isSignedIn: true,
    isUserStateInit: true,
    logout: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
  useRouter: () => ({ replace: mockState.replace }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/Loading/FullscreenLoading', () => ({
  default: () => <div data-testid="fullscreen-loading">loading</div>,
}));

vi.mock('@/const/auth', () => ({
  enableAuth: true,
}));

vi.mock('@/const/version', () => ({
  isServerMode: true,
}));

vi.mock('@/store/user/selectors', () => ({
  authSelectors: {
    isLoaded: (s: any) => s.isLoaded,
    isLoginWithAuth: (s: any) => s.isSignedIn,
  },
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: any) =>
    selector({
      isLoaded: mockState.user.isLoaded,
      isSignedIn: mockState.user.isSignedIn,
      isUserStateInit: mockState.user.isUserStateInit,
      logout: mockState.user.logout,
    }),
}));

vi.mock('@/store/rbac', () => ({
  rbacSelectors: {
    currentUserRoles: (s: any) => s.currentUserRoles,
    isRolesInitialized: (s: any) => s.initRoles,
  },
  useRbacStore: (selector: any) =>
    selector({
      currentUserRoles: mockState.rbac.roles,
      initRoles: mockState.rbac.initRoles,
      useFetchCurrentUserRoles: () => ({
        error: undefined,
        mutate: mockState.mutate,
      }),
    }),
}));

describe('RoleGuard', () => {
  beforeEach(() => {
    mockState.pathname = '/chat';
    mockState.replace.mockReset();
    mockState.rbac.initRoles = true;
    mockState.rbac.roles = [];
    mockState.user.isLoaded = true;
    mockState.user.isSignedIn = true;
    mockState.user.isUserStateInit = true;
  });

  it('should not redirect again when already on no-permission page', async () => {
    mockState.pathname = '/no-permission';

    render(
      <RoleGuard>
        <div>guard-content</div>
      </RoleGuard>,
    );

    await waitFor(() => {
      expect(mockState.replace).not.toHaveBeenCalled();
    });

    expect(screen.getByText('guard-content')).toBeInTheDocument();
    expect(screen.queryByTestId('fullscreen-loading')).not.toBeInTheDocument();
  });

  it('should redirect to no-permission when user has no active role', async () => {
    render(
      <RoleGuard>
        <div>guard-content</div>
      </RoleGuard>,
    );

    await waitFor(() => {
      expect(mockState.replace).toHaveBeenCalledWith('/no-permission');
    });

    expect(screen.getByTestId('fullscreen-loading')).toBeInTheDocument();
  });

  it('should keep content when auth status is temporarily loading after initialization', () => {
    mockState.user.isLoaded = false;
    mockState.user.isUserStateInit = true;
    mockState.rbac.initRoles = true;
    mockState.rbac.roles = [{ id: 1, isActive: true, name: 'member' }];

    render(
      <RoleGuard>
        <div>guard-content</div>
      </RoleGuard>,
    );

    expect(screen.getByText('guard-content')).toBeInTheDocument();
    expect(screen.queryByTestId('fullscreen-loading')).not.toBeInTheDocument();
  });
});
