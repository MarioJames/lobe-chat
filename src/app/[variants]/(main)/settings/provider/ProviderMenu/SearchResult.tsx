'use client';

import isEqual from 'fast-deep-equal';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useAiInfraStore } from '@/store/aiInfra';

import ProviderItem from './Item';

const SearchResult = memo((props: { onProviderSelect?: (key: string) => void }) => {
  const { onProviderSelect = () => {} } = props;
  const { t } = useTranslation('modelProvider');

  const searchKeyword = useAiInfraStore((s) => s.providerSearchKeyword);
  const aiProviderList = useAiInfraStore((s) => s.aiProviderList, isEqual);
  const runtimeConfig = useAiInfraStore((s) => s.aiProviderRuntimeConfig, isEqual);

  // 使用 useMemo 优化过滤性能
  const filteredProviders = useMemo(() => {
    const keyword = searchKeyword.toLowerCase().trim();

    return aiProviderList.filter((provider) => {
      const hidden = !!runtimeConfig?.[provider.id]?.settings?.hiddenInProviderList;
      if (hidden) return false;

      return (
        provider.id.toLowerCase().includes(keyword) ||
        provider.name?.toLowerCase().includes(keyword) ||
        provider.description?.toLowerCase().includes(keyword)
      );
    });
  }, [searchKeyword, aiProviderList, runtimeConfig]);

  return (
    <Flexbox gap={4} padding={'0 12px'}>
      {searchKeyword && filteredProviders.length === 0 ? (
        <Flexbox align="center" justify="center" padding={16}>
          {t('menu.notFound')}
        </Flexbox>
      ) : (
        filteredProviders.map((item) => (
          <ProviderItem {...item} key={item.id} onClick={onProviderSelect} />
        ))
      )}
    </Flexbox>
  );
});

export default SearchResult;
