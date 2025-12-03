'use client';

import type { RecommendedAgent } from '@lobechat/types';
import { Avatar, Button, Text } from '@lobehub/ui';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
import { LobeSessionType } from '@/types/session';

const useStyles = createStyles(({ css, token }) => ({
  addButton: css`
    flex: none;
    color: ${token.colorPrimary};
  `,

  card: css`
    width: 300px;
    padding-block: 12px;
    padding-inline: 16px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;

    background: ${token.colorBgContainer};

    transition: all 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  container: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
    justify-content: center;
  `,

  containerMultiple: css`
    max-width: 100%;
  `,
  description: css`
    font-size: 13px;
    line-height: 1.5;
    color: ${token.colorTextSecondary};
  `,
  title: css`
    font-size: 15px;
    font-weight: 500;
    color: ${token.colorText};
  `,
}));

interface RecommendedAgentsProps {
  agents?: RecommendedAgent[];
}

const RecommendedAgents = memo<RecommendedAgentsProps>(({ agents }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('discover');
  const { message } = App.useApp();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const createSession = useSessionStore((s) => s.createSession);
  const sessions = useSessionStore((s) => s.sessions);

  // 判断是否有多个元素
  const hasMultipleAgents = agents && agents.length > 1;

  // 检查助手是否已添加（从 store 或本地状态）
  const isAgentAdded = (agentId: string) => {
    // 先检查本地状态
    if (addedIds.has(agentId)) return true;
    // 再检查 store
    return sessions?.some(
      (session) => session.type === LobeSessionType.Agent && session.config?.id === agentId,
    );
  };

  const handleAddAgent = async (agent: RecommendedAgent) => {
    if (loadingIds.has(agent.id) || isAgentAdded(agent.id)) return;

    setLoadingIds((prev) => new Set(prev).add(agent.id));

    try {
      // createSession 会自动使用默认的 config
      await createSession(
        {
          config: { id: agent.id },
          meta: {
            avatar: agent.avatar ?? undefined,
            backgroundColor: agent.backgroundColor ?? undefined,
            description: agent.description ?? undefined,
            tags: agent.tags ?? undefined,
            title: agent.title ?? undefined,
          },
        },
        false,
      );

      // 添加到本地已添加列表，立即隐藏按钮
      setAddedIds((prev) => new Set(prev).add(agent.id));
      message.success(t('assistants.addAgentSuccess'));
    } catch (error) {
      console.error('Failed to add agent:', error);
      message.error(t('assistants.addAgentFailed'));
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    }
  };

  if (!agents || agents.length === 0) return null;

  return (
    <div className={cx(styles.container, hasMultipleAgents && styles.containerMultiple)}>
      {agents.map((agent) => {
        const isAdded = isAgentAdded(agent.id);
        const isLoading = loadingIds.has(agent.id);

        return (
          <Flexbox
            align={'center'}
            className={styles.card}
            horizontal
            justify={'space-between'}
            key={agent.id}
          >
            <Flexbox gap={12} horizontal style={{ flex: 1, minWidth: 0 }}>
              <Avatar
                avatar={agent.avatar}
                background={agent.backgroundColor || 'transparent'}
                size={40}
                style={{ flex: 'none' }}
              />
              <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
                <Text
                  className={styles.title}
                  ellipsis={{ rows: 1, tooltip: agent.title || agent.id }}
                >
                  {agent.title || agent.id}
                </Text>
                {agent.description && (
                  <Text
                    className={styles.description}
                    ellipsis={{ rows: 2, tooltip: agent.description }}
                  >
                    {agent.description}
                  </Text>
                )}
              </Flexbox>
            </Flexbox>
            {!isAdded && (
              <Button
                className={styles.addButton}
                loading={isLoading}
                onClick={() => handleAddAgent(agent)}
                size={'small'}
                type={'link'}
              >
                {t('assistants.addAgent')}
              </Button>
            )}
          </Flexbox>
        );
      })}
    </div>
  );
});

export default RecommendedAgents;
