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

interface AIProviderPermissions {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  isRbacReady: boolean;
  showProviderMenu: boolean;
}

const createCrudPermissionHook = (keys: CrudPermissionKeys) => (): CrudPermissionResult =>
  useRbacStore((s) => {
    const isRbacReady = rbacSelectors.isPermissionCodesInitialized(s);

    // Hide all permissions by default when RBAC is not ready
    return {
      canCreate: isRbacReady
        ? rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.create))(s)
        : false,
      canDelete: isRbacReady
        ? rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.delete))(s)
        : false,
      canUpdate: isRbacReady
        ? rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.update))(s)
        : false,
      isRbacReady,
    };
  });

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

export const useAIProviderPermissions = (): AIProviderPermissions => {
  const basePermissions = createCrudPermissionHook({
    create: 'AI_PROVIDER_CREATE',
    delete: 'AI_PROVIDER_DELETE',
    update: 'AI_PROVIDER_UPDATE',
  })();
  const { canCreate, canDelete, canUpdate, isRbacReady } = basePermissions;

  // Hide provider menu by default when RBAC is not ready
  const showProviderMenu = isRbacReady ? canUpdate || canCreate || canDelete : false;

  return {
    ...basePermissions,
    isRbacReady,
    showProviderMenu,
  };
};
