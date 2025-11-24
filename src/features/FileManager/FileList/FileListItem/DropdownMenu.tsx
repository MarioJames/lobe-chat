import { ActionIcon, Dropdown, Icon, copyToClipboard } from '@lobehub/ui';
import { App } from 'antd';
import { ItemType } from 'antd/es/menu/interface';
import {
  BookMinusIcon,
  BookPlusIcon,
  DownloadIcon,
  LinkIcon,
  MoreHorizontalIcon,
  Trash,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAddFilesToKnowledgeBaseModal } from '@/features/KnowledgeBaseModal';
import { useFileStore } from '@/store/file';
import { useKnowledgeBaseStore } from '@/store/knowledgeBase';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { downloadFile } from '@/utils/client/downloadFile';

interface DropdownMenuProps {
  filename: string;
  id: string;
  knowledgeBaseId?: string;
  url: string;
  userId: string;
}

const DropdownMenu = memo<DropdownMenuProps>(({ id, knowledgeBaseId, url, filename, userId }) => {
  const { t } = useTranslation(['components', 'common']);
  const { message, modal } = App.useApp();

  const [removeFile] = useFileStore((s) => [s.removeFileItem]);
  const [removeFilesFromKnowledgeBase] = useKnowledgeBaseStore((s) => [
    s.removeFilesFromKnowledgeBase,
  ]);

  const isFileOwner = useUserStore((s) => userProfileSelectors.userId(s) === userId);

  const inKnowledgeBase = !!knowledgeBaseId;
  const { open } = useAddFilesToKnowledgeBaseModal();

  const items = useMemo(() => {
    // 基础的复制链接、下载操作
    const commonActions = [
      {
        icon: <Icon icon={LinkIcon} />,
        key: 'copyUrl',
        label: t('FileManager.actions.copyUrl'),
        onClick: async ({ domEvent }) => {
          domEvent.stopPropagation();
          await copyToClipboard(url);
          message.success(t('FileManager.actions.copyUrlSuccess'));
        },
      },
      {
        icon: <Icon icon={DownloadIcon} />,
        key: 'download',
        label: t('download', { ns: 'common' }),
        onClick: async ({ domEvent }) => {
          domEvent.stopPropagation();
          const key = 'file-downloading';
          message.loading({
            content: t('FileManager.actions.downloading'),
            duration: 0,
            key,
          });
          await downloadFile(url, filename);
          message.destroy(key);
        },
      },
    ] as ItemType[];

    // 只读模式下，只保留基础操作
    if (!isFileOwner) {
      return commonActions;
    }

    // 完整权限模式
    const knowledgeBaseActions = (
      inKnowledgeBase
        ? [
            {
              icon: <Icon icon={BookPlusIcon} />,
              key: 'addToOtherKnowledgeBase',
              label: t('FileManager.actions.addToOtherKnowledgeBase'),
              onClick: async ({ domEvent }) => {
                domEvent.stopPropagation();

                open({ fileIds: [id], knowledgeBaseId });
              },
            },
            {
              icon: <Icon icon={BookMinusIcon} />,
              key: 'removeFromKnowledgeBase',
              label: t('FileManager.actions.removeFromKnowledgeBase'),
              onClick: async ({ domEvent }) => {
                domEvent.stopPropagation();

                modal.confirm({
                  okButtonProps: {
                    danger: true,
                  },
                  onOk: async () => {
                    await removeFilesFromKnowledgeBase(knowledgeBaseId, [id]);

                    message.success(t('FileManager.actions.removeFromKnowledgeBaseSuccess'));
                  },
                  title: t('FileManager.actions.confirmRemoveFromKnowledgeBase', {
                    count: 1,
                  }),
                });
              },
            },
          ]
        : [
            {
              icon: <Icon icon={BookPlusIcon} />,
              key: 'addToKnowledgeBase',
              label: t('FileManager.actions.addToKnowledgeBase'),
              onClick: async ({ domEvent }) => {
                domEvent.stopPropagation();
                open({ fileIds: [id] });
              },
            },
          ]
    ) as ItemType[];

    return (
      [
        ...knowledgeBaseActions,
        {
          type: 'divider',
        },
        ...commonActions,
        {
          type: 'divider',
        },
        {
          danger: true,
          icon: <Icon icon={Trash} />,
          key: 'delete',
          label: t('delete', { ns: 'common' }),
          onClick: async ({ domEvent }) => {
            domEvent.stopPropagation();
            modal.confirm({
              content: t('FileManager.actions.confirmDelete'),
              okButtonProps: { danger: true },
              onOk: async () => {
                await removeFile(id);
              },
            });
          },
        },
      ] as ItemType[]
    ).filter(Boolean);
  }, [inKnowledgeBase, isFileOwner]);

  return (
    <Dropdown menu={{ items }}>
      <ActionIcon icon={MoreHorizontalIcon} size={'small'} />
    </Dropdown>
  );
});

export default DropdownMenu;
