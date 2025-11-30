import { memo } from 'react';

import FileParsingStatusTag from '@/components/FileParsingStatus';
import { fileManagerSelectors, useFileStore } from '@/store/file';
import { FileParsingTask } from '@/types/asyncTask';

interface ChunkTagProps extends FileParsingTask {
  id: string;
  isReadOnly?: boolean;
}

const ChunksBadge = memo<ChunkTagProps>(({ id, isReadOnly, ...res }) => {
  const [
    isCreatingChunkEmbeddingTask,
    embeddingChunks,
    reParseFile,
    openChunkDrawer,
    reEmbeddingChunks,
  ] = useFileStore((s) => [
    fileManagerSelectors.isCreatingChunkEmbeddingTask(id)(s),
    s.embeddingChunks,
    s.reParseFile,
    s.openChunkDrawer,
    s.reEmbeddingChunks,
  ]);

  return (
    <FileParsingStatusTag
      isReadOnly={isReadOnly}
      onClick={(status) => {
        if (status === 'success') openChunkDrawer(id);
      }}
      preparingEmbedding={isCreatingChunkEmbeddingTask}
      // 只读模式下，只能查看分块详情，不能触发其他操作
      {...(isReadOnly
        ? {}
        : {
            onEmbeddingClick: () => embeddingChunks([id]),
            onErrorClick: (task) => {
              if (task === 'chunking') reParseFile(id);
              if (task === 'embedding') reEmbeddingChunks(id);
            },
          })}
      {...res}
    />
  );
});

export default ChunksBadge;
