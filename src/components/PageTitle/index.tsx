import { useTheme } from 'antd-style';
import { memo, useEffect } from 'react';

import { BRANDING_NAME } from '@/const/branding';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';

const PageTitle = memo<{ title: string }>(({ title }) => {
  const baseConfig = useServerConfigStore(customizationSelectors.base);
  const theme = useTheme();

  useEffect(() => {
    // 如果baseConfig为null或undefined，不显示默认的logo和lobehub文案
    if (!baseConfig) {
      // 设置空的 title，避免显示默认的 title
      document.title = '';
      return;
    }

    const brandName = baseConfig.brandName || BRANDING_NAME;
    document.title = title ? `${title} · ${brandName}` : brandName;
  }, [title, baseConfig]);

  // 动态设置浏览器标签 icon (favicon)
  useEffect(() => {
    const removeFavicons = () => {
      // 移除所有 favicon link 标签（包括 Next.js 自动添加的）
      const linkElements = document.querySelectorAll("link[rel*='icon']");
      linkElements.forEach((link) => link.remove());
    };

    // 如果baseConfig为null或undefined，不设置favicon
    if (!baseConfig) {
      // 移除所有 favicon link 标签
      removeFavicons();
      return;
    }

    // 根据当前主题从企业logo中选择 favicon
    const faviconUrl =
      theme.appearance === 'dark'
        ? baseConfig?.logo?.dark || baseConfig?.logo?.light
        : baseConfig?.logo?.light || baseConfig?.logo?.dark;

    if (!faviconUrl) {
      // 如果配置中不存在 favicon，移除所有 favicon link 标签
      removeFavicons();
      return;
    }

    // 先移除所有现有的 favicon link 标签
    removeFavicons();

    // 创建新的 favicon link 标签
    const linkElement = document.createElement('link');
    linkElement.rel = 'icon';
    linkElement.href = faviconUrl;
    document.head.append(linkElement);
  }, [baseConfig, theme.appearance]);

  return null;
});

export default PageTitle;
