import { KnowledgeBaseStoreState } from '@/store/knowledgeBase/initialState';

const activeKnowledgeBaseId = (s: KnowledgeBaseStoreState) => s.activeKnowledgeBaseId;

const getKnowledgeBaseById = (id: string) => (s: KnowledgeBaseStoreState) =>
  s.activeKnowledgeBaseItems[id];

const getKnowledgeBaseNameById = (id: string) => (s: KnowledgeBaseStoreState) =>
  getKnowledgeBaseById(id)(s)?.name;

// 判断当前用户是否是知识库的所有者
// 用于控制前端的读写权限（共享知识库为只读）
const isKnowledgeBaseOwner =
  (id: string, currentUserId?: string) => (s: KnowledgeBaseStoreState) => {
    const kb = getKnowledgeBaseById(id)(s);
    if (!kb || !currentUserId) return false;
    return kb.userId === currentUserId;
  };

export const knowledgeBaseSelectors = {
  activeKnowledgeBaseId,
  getKnowledgeBaseNameById,
  isKnowledgeBaseOwner,
};
