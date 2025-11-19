import { SWRResponse } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { useClientDataSWR } from '@/libs/swr';
import { UserRole, rbacService } from '@/services/rbac';
import { RbacStore } from '@/store/rbac/store';

const FETCH_CURRENT_USER_ROLES_KEY = 'FETCH_CURRENT_USER_ROLES';
const FETCH_CURRENT_USER_PERMISSION_CODES_KEY = 'FETCH_CURRENT_USER_PERMISSION_CODES';

export interface RbacAction {
  /**
   * 刷新当前用户的权限代码列表
   */
  refreshCurrentUserPermissionCodes: () => Promise<void>;

  /**
   * 刷新当前用户的角色列表
   */
  refreshCurrentUserRoles: () => Promise<void>;

  /**
   * 使用 SWR 获取当前用户的权限代码列表
   */
  useFetchCurrentUserPermissionCodes: (params?: {
    enabled?: boolean;
    suspense?: boolean;
  }) => SWRResponse<string[]>;

  /**
   * 使用 SWR 获取当前用户的角色列表
   */
  useFetchCurrentUserRoles: (params?: {
    enabled?: boolean;
    suspense?: boolean;
  }) => SWRResponse<UserRole[]>;
}

export const createRbacSlice: StateCreator<
  RbacStore,
  [['zustand/devtools', never]],
  [],
  RbacAction
> = (set) => ({
  refreshCurrentUserPermissionCodes: async () => {
    const permissionCodes = await rbacService.getCurrentUserPermissionCodes();
    set(
      {
        currentUserPermissionCodes: permissionCodes,
        initPermissionCodes: true,
      },
      false,
      'refreshCurrentUserPermissionCodes',
    );
  },

  refreshCurrentUserRoles: async () => {
    const roles = await rbacService.getCurrentUserRoles();
    set(
      {
        currentUserRoles: roles,
        initRoles: true,
      },
      false,
      'refreshCurrentUserRoles',
    );
  },

  useFetchCurrentUserPermissionCodes: (params = {}) =>
    useClientDataSWR<string[]>(
      params.enabled === false ? null : FETCH_CURRENT_USER_PERMISSION_CODES_KEY,
      () => rbacService.getCurrentUserPermissionCodes(),
      {
        fallbackData: [],
        onSuccess: (codes) => {
          set(
            {
              currentUserPermissionCodes: codes,
              initPermissionCodes: true,
            },
            false,
            'useFetchCurrentUserPermissionCodes/success',
          );
        },
        suspense: params.suspense,
      },
    ),

  useFetchCurrentUserRoles: (params = {}) =>
    useClientDataSWR<UserRole[]>(
      params.enabled === false ? null : FETCH_CURRENT_USER_ROLES_KEY,
      () => rbacService.getCurrentUserRoles(),
      {
        fallbackData: [],
        onSuccess: (roles) => {
          set(
            {
              currentUserRoles: roles,
              initRoles: true,
            },
            false,
            'useFetchCurrentUserRoles/success',
          );
        },
        suspense: params.suspense,
      },
    ),
});
