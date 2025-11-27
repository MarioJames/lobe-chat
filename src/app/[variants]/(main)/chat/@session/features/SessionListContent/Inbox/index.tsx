import Link from 'next/link';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_INBOX_AVATAR } from '@/const/meta';
import { INBOX_SESSION_ID } from '@/const/session';
import { SESSION_CHAT_URL } from '@/const/url';
import { useSwitchSession } from '@/hooks/useSwitchSession';
import { getChatStoreState, useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';
import { useSessionStore } from '@/store/session';

import ListItem from '../ListItem';

const Inbox = memo(() => {
  const { t } = useTranslation('chat');
  const mobile = useServerConfigStore((s) => s.isMobile);
  const activeId = useSessionStore((s) => s.activeId);
  const switchSession = useSwitchSession();

  // Get default agent config from customization
  const defaultAgentConfig = useServerConfigStore(customizationSelectors.defaultAgent);

  // Use customization config or fallback to defaults
  const inboxAvatar = useMemo(
    () => defaultAgentConfig?.avatar || DEFAULT_INBOX_AVATAR,
    [defaultAgentConfig?.avatar],
  );

  const inboxTitle = useMemo(
    () => defaultAgentConfig?.title || t('inbox.title'),
    [defaultAgentConfig?.title, t],
  );

  const openNewTopicOrSaveTopic = useChatStore((s) => s.openNewTopicOrSaveTopic);

  return (
    <Link
      aria-label={inboxTitle}
      href={SESSION_CHAT_URL(INBOX_SESSION_ID, mobile)}
      onClick={async (e) => {
        e.preventDefault();

        if (activeId === INBOX_SESSION_ID && !mobile) {
          // If user tap the inbox again, open a new topic.
          // Only for desktop.
          const inboxMessages = chatSelectors.inboxActiveTopicMessages(getChatStoreState());

          if (inboxMessages.length > 0) {
            await openNewTopicOrSaveTopic();
          }
        } else {
          switchSession(INBOX_SESSION_ID);
        }
      }}
    >
      <ListItem
        active={activeId === INBOX_SESSION_ID}
        avatar={inboxAvatar}
        key={INBOX_SESSION_ID}
        styles={{
          container: {
            gap: 12,
          },
          content: {
            gap: 6,
            maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
          },
        }}
        title={inboxTitle}
      />
    </Link>
  );
});

export default Inbox;
