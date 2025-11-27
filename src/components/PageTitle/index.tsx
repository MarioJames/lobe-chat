import { useTheme } from 'antd-style';
import { memo, useEffect } from 'react';

import { BRANDING_NAME } from '@/const/branding';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';

const PageTitle = memo<{ title: string }>(({ title }) => {
  const baseConfig = useServerConfigStore(customizationSelectors.base);
  const brandName = baseConfig?.brandName || BRANDING_NAME;
  const theme = useTheme();

  useEffect(() => {
    document.title = title ? `${title} · ${brandName}` : brandName;
  }, [title, brandName]);

  // 动态设置浏览器标签 icon (favicon)
  useEffect(() => {
    // 根据当前主题选择 favicon
    const faviconUrl =
      theme.appearance === 'dark'
        ? baseConfig?.favicon?.dark || baseConfig?.favicon?.light
        : baseConfig?.favicon?.light || baseConfig?.favicon?.dark;

    // 如果配置中不存在 favicon，保持原有的 favicon 不变
    if (!faviconUrl) return;

    // 查找现有的 favicon link 标签
    let linkElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;

    // 如果不存在，创建一个新的 link 标签
    if (!linkElement) {
      linkElement = document.createElement('link');
      linkElement.rel = 'icon';
      document.head.append(linkElement);
    }

    // 更新 favicon URL
    linkElement.href = faviconUrl;
  }, [baseConfig?.favicon, theme.appearance]);

  return null;
});

export default PageTitle;
