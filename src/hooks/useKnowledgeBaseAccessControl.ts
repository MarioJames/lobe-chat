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
export const useKnowledgeBaseAccessControl = (knowledgeBaseId?: string) => {
  const currentUserId = useUserStore(userProfileSelectors.userId);
  const isOwner = useKnowledgeBaseStore(
    knowledgeBaseSelectors.isKnowledgeBaseOwner(knowledgeBaseId || '', currentUserId),
  );

  // If in a knowledge base context and not the owner, it's read-only (shared knowledge base)
  const isReadOnly = !!knowledgeBaseId && !isOwner;

  return {
    hasWriteAccess: !isReadOnly,
    isOwner,
    isReadOnly,
  };
};
