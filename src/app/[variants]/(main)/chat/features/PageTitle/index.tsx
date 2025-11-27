'use client';

import { memo } from 'react';

import PageTitle from '@/components/PageTitle';
import { withSuspense } from '@/components/withSuspense';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/selectors';

const Title = memo(() => {
  const agentTitle = useSessionStore(sessionMetaSelectors.currentAgentTitle);
  const defaultAgentConfig = useServerConfigStore(customizationSelectors.defaultAgent);
  const currentAgentTitle = defaultAgentConfig?.title || agentTitle;
  const topicTitle = useChatStore((s) => topicSelectors.currentActiveTopic(s)?.title);

  return <PageTitle title={[topicTitle, currentAgentTitle].filter(Boolean).join(' · ')} />;
});

export default withSuspense(Title);
