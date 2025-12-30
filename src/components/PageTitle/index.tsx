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
    // 根据当前主题从企业logo中选择 favicon
    const faviconUrl =
      theme.appearance === 'dark'
        ? baseConfig?.logo?.dark || baseConfig?.logo?.light
        : baseConfig?.logo?.light || baseConfig?.logo?.dark;

    // 查找现有的 favicon link 标签
    const linkElements = document.querySelectorAll("link[rel*='icon']");

    if (!faviconUrl) {
      // 如果配置中不存在 favicon，移除所有 favicon link 标签
      linkElements.forEach((link) => link.remove());
      return;
    }

    // 查找或创建 favicon link 标签
    let linkElement = Array.from(linkElements).find(
      (link) =>
        (link as HTMLLinkElement).rel === 'icon' ||
        (link as HTMLLinkElement).rel === 'shortcut icon',
    ) as HTMLLinkElement;

    // 如果不存在，创建一个新的 link 标签
    if (!linkElement) {
      linkElement = document.createElement('link');
      linkElement.rel = 'icon';
      document.head.append(linkElement);
    }

    // 更新 favicon URL
    linkElement.href = faviconUrl;
  }, [baseConfig?.logo, theme.appearance]);

  return null;
});

export default PageTitle;
