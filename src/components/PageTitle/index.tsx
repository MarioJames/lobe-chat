import { memo, useEffect } from 'react';

import { BRANDING_NAME } from '@/const/branding';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';

const PageTitle = memo<{ title: string }>(({ title }) => {
  const baseConfig = useServerConfigStore(customizationSelectors.base);
  const brandName = baseConfig?.brandName || BRANDING_NAME;

  useEffect(() => {
    document.title = title ? `${title} · ${brandName}` : brandName;
  }, [title, brandName]);

  return null;
});

export default PageTitle;
