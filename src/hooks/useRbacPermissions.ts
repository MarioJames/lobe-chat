'use client';

import { PERMISSION_ACTIONS } from '@/const/rbac';
import { rbacSelectors, useRbacStore } from '@/store/rbac';
import { getAllScopePermissions } from '@/utils/rbac';

interface CrudPermissionKeys {
  create: keyof typeof PERMISSION_ACTIONS;
  delete: keyof typeof PERMISSION_ACTIONS;
  update: keyof typeof PERMISSION_ACTIONS;
}

interface CrudPermissionResult {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  isRbacReady: boolean;
}

const createCrudPermissionHook = (keys: CrudPermissionKeys) => (): CrudPermissionResult => {
  const [isRbacReady, canCreate, canUpdate, canDelete] = useRbacStore((s) => {
    const ready = rbacSelectors.isPermissionCodesInitialized(s);

    const createPermissions = getAllScopePermissions(keys.create);
    const updatePermissions = getAllScopePermissions(keys.update);
    const deletePermissions = getAllScopePermissions(keys.delete);

    return [
      ready,
      ready && rbacSelectors.hasAnyPermission(createPermissions)(s),
      ready && rbacSelectors.hasAnyPermission(updatePermissions)(s),
      ready && rbacSelectors.hasAnyPermission(deletePermissions)(s),
    ];
  });

  return {
    canCreate: !!canCreate,
    canDelete: !!canDelete,
    canUpdate: !!canUpdate,
    isRbacReady,
  };
};

export const useAgentPermissions = createCrudPermissionHook({
  create: 'AGENT_CREATE',
  delete: 'AGENT_DELETE',
  update: 'AGENT_UPDATE',
});

export const useKnowledgeBasePermissions = createCrudPermissionHook({
  create: 'KNOWLEDGE_BASE_CREATE',
  delete: 'KNOWLEDGE_BASE_DELETE',
  update: 'KNOWLEDGE_BASE_UPDATE',
});
