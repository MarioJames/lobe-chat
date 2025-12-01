'use client';

import type { RecommendedAgent } from '@lobechat/types';
import { Avatar, Button } from '@lobehub/ui';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { discoverService } from '@/services/discover';
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
    gap: 12px;
  `,
  description: css`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${token.colorTextSecondary};
  `,
  title: css`
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: ${token.colorText};
  `,
}));

interface RecommendedAgentsProps {
  agents?: RecommendedAgent[];
}

const RecommendedAgents = memo<RecommendedAgentsProps>(({ agents }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('discover');
  const { message } = App.useApp();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const createSession = useSessionStore((s) => s.createSession);
  const sessions = useSessionStore((s) => s.sessions);

  // 检查助手是否已添加
  const isAgentAdded = (agentId: string) => {
    return sessions?.some(
      (session) => session.type === LobeSessionType.Agent && session.config?.id === agentId,
    );
  };

  const handleAddAgent = async (agent: RecommendedAgent) => {
    if (loadingIds.has(agent.id) || isAgentAdded(agent.id)) return;

    setLoadingIds((prev) => new Set(prev).add(agent.id));

    try {
      // 获取助手详情
      const detail = await discoverService.getAssistantDetail({ identifier: agent.id });

      if (!detail?.config) {
        message.error(t('assistants.addAgentFailed'));
        return;
      }

      const meta = {
        avatar: agent.avatar ?? undefined,
        backgroundColor: agent.backgroundColor ?? undefined,
        description: agent.description ?? undefined,
        tags: agent.tags ?? undefined,
        title: agent.title ?? undefined,
      };

      // 创建会话
      await createSession({ config: detail.config, meta }, false);
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
    <Flexbox className={styles.container} gap={12} horizontal justify="space-between" wrap={'wrap'}>
      {[...agents, ...agents, ...agents].map((agent) => {
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
                <h3 className={styles.title}>{agent.title || agent.id}</h3>
                {agent.description && (
                  <p className={styles.description} title={agent.description}>
                    {agent.description}
                  </p>
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
    </Flexbox>
  );
});

export default RecommendedAgents;
