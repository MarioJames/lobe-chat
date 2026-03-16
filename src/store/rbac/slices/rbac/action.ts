import { type SWRResponse } from 'swr';

import { useClientDataSWR } from '@/libs/swr';
import type { UserRole } from '@/services/rbac';
import { rbacService } from '@/services/rbac';
import { type StoreSetter } from '@/store/types';

import { type RbacStore } from '../../store';

const FETCH_CURRENT_USER_ROLES_KEY = 'FETCH_CURRENT_USER_ROLES';
const FETCH_CURRENT_USER_PERMISSION_CODES_KEY = 'FETCH_CURRENT_USER_PERMISSION_CODES';

type Setter = StoreSetter<RbacStore>;
export const createRbacSlice = (set: Setter, get: () => RbacStore, _api?: unknown) =>
  new RbacActionImpl(set, get, _api);

export class RbacActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, _get: () => RbacStore, _api?: unknown) {
    void _get;
    void _api;
    this.#set = set;
  }

  refreshCurrentUserPermissionCodes = async (): Promise<void> => {
    const permissionCodes = await rbacService.getCurrentUserPermissionCodes();
    this.#set(
      {
        currentUserPermissionCodes: permissionCodes,
        initPermissionCodes: true,
      },
      false,
      'refreshCurrentUserPermissionCodes',
    );
  };

  refreshCurrentUserRoles = async (): Promise<void> => {
    const roles = await rbacService.getCurrentUserRoles();
    this.#set(
      {
        currentUserRoles: roles,
        initRoles: true,
      },
      false,
      'refreshCurrentUserRoles',
    );
  };

  useFetchCurrentUserPermissionCodes = (params?: {
    enabled?: boolean;
    suspense?: boolean;
  }): SWRResponse<string[]> =>
    useClientDataSWR<string[]>(
      params?.enabled === false ? null : FETCH_CURRENT_USER_PERMISSION_CODES_KEY,
      () => rbacService.getCurrentUserPermissionCodes(),
      {
        fallbackData: [],
        onSuccess: (codes) => {
          this.#set(
            {
              currentUserPermissionCodes: codes,
              initPermissionCodes: true,
            },
            false,
            'useFetchCurrentUserPermissionCodes/success',
          );
        },
        suspense: params?.suspense,
      },
    );

  useFetchCurrentUserRoles = (params?: {
    enabled?: boolean;
    suspense?: boolean;
  }): SWRResponse<UserRole[]> =>
    useClientDataSWR<UserRole[]>(
      params?.enabled === false ? null : FETCH_CURRENT_USER_ROLES_KEY,
      () => rbacService.getCurrentUserRoles(),
      {
        fallbackData: [],
        onSuccess: (roles) => {
          this.#set(
            {
              currentUserRoles: roles,
              initRoles: true,
            },
            false,
            'useFetchCurrentUserRoles/success',
          );
        },
        suspense: params?.suspense,
      },
    );
}

export type RbacAction = Pick<RbacActionImpl, keyof RbacActionImpl>;
