import { knowledgeBaseSelectors, useKnowledgeBaseStore } from '@/store/knowledgeBase';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/slices/auth/selectors';

/**
 * Hook to check if the current user has owner access to a knowledge base
 * Used to control read/write permissions (shared knowledge bases are read-only)
 *
 * @param knowledgeBaseId - The ID of the knowledge base to check
 * @returns Object containing ownership and read-only status
 */
export const useKnowledgeBaseAccess = (knowledgeBaseId?: string) => {
  const currentUserId = useUserStore(userProfileSelectors.userId);

  const [isOwner] = useKnowledgeBaseStore((s) => [
    !knowledgeBaseId || // 文件列表根路径，不需要权限检查
      knowledgeBaseSelectors.isKnowledgeBaseOwner(knowledgeBaseId || '', currentUserId)(s),
  ]);

  return {
    isOwner,
    isReadOnly: !isOwner,
  };
};
