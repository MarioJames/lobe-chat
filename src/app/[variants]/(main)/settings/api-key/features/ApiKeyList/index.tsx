import { Button } from '@lobehub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flex, Switch, Table } from 'antd';
import { createStyles } from 'antd-style';
import { Pencil, Trash } from 'lucide-react';
import { FC, useState } from 'react';

import { apiKeyService } from '@/services/apiKey';
import { ApiKeyItem, CreateApiKeyParams, UpdateApiKeyParams } from '@/types/apiKey';

import ApiKeyModal from '../ApiKeyModal';
import ApiKeyDisplay from './Key';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    padding: ${token.padding}px;
  `,
  header: css`
    display: flex;
    justify-content: flex-end;
    margin-block-end: ${token.margin}px;
  `,
  table: css`
    border-radius: ${token.borderRadius}px;
    background: ${token.colorBgContainer};
  `,
}));

const ApiKeyList: FC = () => {
  const { styles } = useStyles();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKeyItem | undefined>();

  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyItem[]>({
    queryFn: () => apiKeyService.list(),
    queryKey: ['apiKeys'],
  });

  const createMutation = useMutation({
    mutationFn: (params: CreateApiKeyParams) => apiKeyService.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: UpdateApiKeyParams }) =>
      apiKeyService.update(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiKeyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const handleCreate = () => {
    setEditingApiKey(undefined);
    setModalOpen(true);
  };

  const handleEdit = (record: ApiKeyItem) => {
    setEditingApiKey(record);
    setModalOpen(true);
  };

  const handleModalOk = (values: CreateApiKeyParams | UpdateApiKeyParams) => {
    if (editingApiKey) {
      updateMutation.mutate({ id: editingApiKey.id!, params: values });
    } else {
      createMutation.mutate(values as CreateApiKeyParams);
    }
  };

  const columns = [
    {
      dataIndex: 'name',
      key: 'name',
      title: '名称',
    },
    {
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <ApiKeyDisplay apiKey={key} />,
      title: 'Key',
      width: '30%',
    },
    {
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || '-',
      title: '描述',
    },
    {
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: ApiKeyItem) => (
        <Switch
          checked={enabled}
          loading={updateMutation.isPending}
          onChange={(checked) => {
            updateMutation.mutate({ id: record.id!, params: { enabled: checked } });
          }}
        />
      ),
      title: '状态',
    },
    {
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (expiresAt: Date | null) => expiresAt?.toLocaleString() || '永不过期',
      title: '过期时间',
    },
    {
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (lastUsedAt: Date | null) => lastUsedAt?.toLocaleString() || '从未使用',
      title: '最后使用时间',
    },
    {
      key: 'action',
      render: (_: any, record: ApiKeyItem) => (
        <Flex gap={4}>
          <Button
            icon={Pencil}
            onClick={() => handleEdit(record)}
            size="small"
            title="编辑"
            type="text"
          />
          <Button
            icon={Trash}
            onClick={() => deleteMutation.mutate(record.id!)}
            size="small"
            title="删除"
            type="text"
          />
        </Flex>
      ),
      title: '操作',
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button onClick={handleCreate} type="primary">
          创建 API Key
        </Button>
      </div>
      <Table
        className={styles.table}
        columns={columns}
        dataSource={apiKeys}
        loading={isLoading}
        rowKey="id"
      />
      <ApiKeyModal
        initialValues={editingApiKey}
        onCancel={() => setModalOpen(false)}
        onOk={handleModalOk}
        open={modalOpen}
      />
    </div>
  );
};

export default ApiKeyList;
