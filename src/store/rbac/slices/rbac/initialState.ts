import { UserRole } from '@/services/rbac';

export interface RbacState {
  /**
   * 当前用户的权限代码列表
   */
  currentUserPermissionCodes: string[];
  /**
   * 当前用户的角色列表
   */
  currentUserRoles: UserRole[];
  /**
   * 权限代码是否已初始化
   */
  initPermissionCodes: boolean;
  /**
   * 角色列表是否已初始化
   */
  initRoles: boolean;
}

export const initialRbacState: RbacState = {
  currentUserPermissionCodes: [],
  currentUserRoles: [],
  initPermissionCodes: false,
  initRoles: false,
};
