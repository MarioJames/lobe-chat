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
    return {
      canCreate: rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.create))(s),
      canDelete: rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.delete))(s),
      canUpdate: rbacSelectors.hasAnyPermission(getAllScopePermissions(keys.update))(s),
      isRbacReady: rbacSelectors.isPermissionCodesInitialized(s),
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
  const { canCreate, canDelete, canUpdate } = basePermissions;

  return {
    ...basePermissions,
    isRbacReady: basePermissions.isRbacReady,
    showProviderMenu: canUpdate || canCreate || canDelete,
  };
};
