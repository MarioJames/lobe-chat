import { useTheme } from 'antd-style';
import { memo, useEffect } from 'react';

import { BRANDING_NAME } from '@/const/branding';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';

const CUSTOM_FAVICON_ATTR = 'data-lobe-custom-favicon';
const CUSTOM_FAVICON_SELECTOR = `link[${CUSTOM_FAVICON_ATTR}="true"]`;

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
    const removeCustomFavicon = () => {
      const customFavicon = document.head.querySelector(
        CUSTOM_FAVICON_SELECTOR,
      ) as HTMLLinkElement | null;
      customFavicon?.remove();
    };

    const upsertCustomFavicon = (href: string) => {
      let customFavicon = document.head.querySelector(
        CUSTOM_FAVICON_SELECTOR,
      ) as HTMLLinkElement | null;

      if (!customFavicon) {
        customFavicon = document.createElement('link');
        customFavicon.rel = 'icon';
        customFavicon.setAttribute(CUSTOM_FAVICON_ATTR, 'true');
        document.head.append(customFavicon);
      }

      customFavicon.href = href;
    };

    // 根据当前主题从企业logo中选择 favicon
    const faviconUrl =
      theme.appearance === 'dark'
        ? baseConfig?.logo?.dark || baseConfig?.logo?.light
        : baseConfig?.logo?.light || baseConfig?.logo?.dark;

    if (!baseConfig) {
      removeCustomFavicon();
      return;
    }

    if (!faviconUrl) {
      removeCustomFavicon();
      return;
    }

    upsertCustomFavicon(faviconUrl);
  }, [baseConfig, theme.appearance]);

  return null;
});

export default PageTitle;
