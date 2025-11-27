import { useAnalytics } from '@lobehub/analytics/react';
import { Empty } from 'antd';
import { createStyles } from 'antd-style';
import Link from 'next/link';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center } from 'react-layout-kit';
import LazyLoad from 'react-lazy-load';

import { DEFAULT_AVATAR } from '@/const/meta';
import { SESSION_CHAT_URL } from '@/const/url';
import { useSwitchSession } from '@/hooks/useSwitchSession';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';
import { getSessionStoreState, useSessionStore } from '@/store/session';
import { sessionGroupSelectors, sessionSelectors } from '@/store/session/selectors';
import { getUserStoreState } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { LobeSessionType, LobeSessions } from '@/types/session';

import SkeletonList from '../../SkeletonList';
import ListItem from '../ListItem';
import AddButton from './AddButton';
import SessionItem from './Item';

const useStyles = createStyles(
  ({ css }) => css`
    min-height: 70px;
  `,
);
interface SessionListProps {
  dataSource?: LobeSessions;
  groupId?: string;
  showAddButton?: boolean;
}
const SessionList = memo<SessionListProps>(({ dataSource, groupId, showAddButton = true }) => {
  const { t } = useTranslation('chat');
  const { analytics } = useAnalytics();
  const { styles } = useStyles();

  const isInit = useSessionStore(sessionSelectors.isSessionListInit);
  const { showCreateSession } = useServerConfigStore(featureFlagsSelectors);
  const mobile = useServerConfigStore((s) => s.isMobile);

  // Get recommended agents from welcome config
  const welcomeConfig = useServerConfigStore(customizationSelectors.welcome);
  const recommendedAgents = useMemo(() => {
    if (welcomeConfig?.type === 'recommended' && welcomeConfig.config.recommendedAgents) {
      return welcomeConfig.config.recommendedAgents;
    }
    return [];
  }, [welcomeConfig]);

  const switchSession = useSwitchSession();
  const createSession = useSessionStore((s) => s.createSession);
  const sessions = useSessionStore((s) => s.sessions);
  const activeId = useSessionStore((s) => s.activeId);

  // Find or create session for recommended agent
  const handleRecommendedAgentClick = async (agentId: string, agent: any) => {
    // Find existing session by agent id
    const existingSession = sessions?.find(
      (session) =>
        session.type === LobeSessionType.Agent && (session as any).config?.id === agentId,
    );

    if (existingSession) {
      switchSession(existingSession.id);
    } else {
      // Create new session for recommended agent
      const sessionId = await createSession({
        config: {
          id: agentId,
          virtual: true,
        },
        meta: {
          avatar: agent.avatar || DEFAULT_AVATAR,
          backgroundColor: agent.backgroundColor,
          description: agent.description,
          tags: agent.tags,
          title: agent.title,
        },
      });
      switchSession(sessionId);
    }
  };

  const isEmpty = !dataSource || dataSource.length === 0;

  // Check if we have recommended agents
  const hasRecommendedAgents = recommendedAgents.length > 0;

  // Render recommended agent item
  const renderRecommendedAgent = (agent: any) => {
    const existingSession = sessions?.find(
      (session) =>
        session.type === LobeSessionType.Agent && (session as any).config?.id === agent.id,
    );

    return (
      <LazyLoad className={styles} key={agent.id}>
        <Link
          aria-label={agent.id}
          href={existingSession ? SESSION_CHAT_URL(existingSession.id, mobile) : '#'}
          onClick={async (e) => {
            e.preventDefault();
            await handleRecommendedAgentClick(agent.id, agent);
          }}
        >
          <ListItem
            {...({
              active: existingSession ? activeId === existingSession.id : false,
              avatar: agent.avatar || DEFAULT_AVATAR,
              avatarBackground: agent.backgroundColor || undefined,
              styles: {
                container: {
                  gap: 12,
                },
                content: {
                  gap: 6,
                  maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
                },
              },
              title: agent.title || t('defaultSession'),
              type: 'agent',
            } as any)}
          />
        </Link>
      </LazyLoad>
    );
  };

  return !isInit ? (
    <SkeletonList />
  ) : !isEmpty ? (
    // Keep original logic: if has data, check if we should replace with recommended agents
    hasRecommendedAgents ? (
      // If we have recommended agents, show them instead of dataSource
      <>{recommendedAgents.map(renderRecommendedAgent)}</>
    ) : (
      // If no recommended agents, show original dataSource
      <>
        {dataSource.map(({ id }) => (
          <LazyLoad className={styles} key={id}>
            <Link
              aria-label={id}
              href={SESSION_CHAT_URL(id, mobile)}
              onClick={(e) => {
                e.preventDefault();
                switchSession(id);

                // Enhanced analytics tracking
                if (analytics) {
                  const userStore = getUserStoreState();
                  const sessionStore = getSessionStoreState();

                  const userId = userProfileSelectors.userId(userStore);
                  const session = sessionSelectors.getSessionById(id)(sessionStore);

                  if (session) {
                    const sessionGroupId = session.group || 'default';
                    const group = sessionGroupSelectors.getGroupById(sessionGroupId)(sessionStore);
                    const groupName =
                      group?.name || (sessionGroupId === 'default' ? 'Default' : 'Unknown');

                    analytics?.track({
                      name: 'switch_session',
                      properties: {
                        assistant_name: session.meta?.title || 'Untitled Agent',
                        assistant_tags: session.meta?.tags || [],
                        group_id: sessionGroupId,
                        group_name: groupName,
                        session_id: id,
                        spm: 'homepage.chat.session_list_item.click',
                        user_id: userId || 'anonymous',
                      },
                    });
                  }
                }
              }}
            >
              <SessionItem id={id} />
            </Link>
          </LazyLoad>
        ))}
      </>
    )
  ) : showCreateSession ? (
    showAddButton && <AddButton groupId={groupId} />
  ) : (
    <Center>
      <Empty description={t('emptyAgent')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Center>
  );
});

export default SessionList;
