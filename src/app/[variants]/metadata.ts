import { BRANDING_LOGO_URL, BRANDING_NAME, ORG_NAME } from '@/const/branding';
import { DEFAULT_LANG } from '@/const/locale';
import { OFFICIAL_URL, OG_URL } from '@/const/url';
import { isCustomBranding, isCustomORG } from '@/const/version';
import { translation } from '@/server/translation';
import { customizationServerService } from '@/services/customization/server';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

const isDev = process.env.NODE_ENV === 'development';

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('metadata', locale);

  // Get theme from route variants
  const { theme } = await RouteVariants.getVariantsFromProps(props);
  const isDark = theme === 'dark';

  // Get customization config for favicon and brand name
  let baseConfig: {
    brandName?: string;
    favicon?: { dark?: string; light?: string };
  } | null = null;
  try {
    const config = await customizationServerService.getConfig();
    baseConfig = config?.base || null;
  } catch (error) {
    // Fallback to default values if config fetch fails
    console.warn('Failed to get customization config for metadata:', error);
  }

  const brandName = baseConfig?.brandName || BRANDING_NAME;

  // Get favicon from config based on current theme
  const faviconUrl = isDark
    ? baseConfig?.favicon?.dark || baseConfig?.favicon?.light
    : baseConfig?.favicon?.light || baseConfig?.favicon?.dark;

  // Build icons config
  let iconsConfig;
  if (faviconUrl) {
    // If custom favicon is configured, use it
    iconsConfig = faviconUrl;
  } else if (isCustomBranding) {
    // Fallback to branding logo if custom branding is enabled
    iconsConfig = BRANDING_LOGO_URL;
  } else {
    // Default favicon
    iconsConfig = {
      apple: '/apple-touch-icon.png?v=1',
      icon: isDev ? '/favicon-dev.ico' : '/favicon.ico?v=1',
      shortcut: isDev ? '/favicon-32x32-dev.ico' : '/favicon-32x32.ico?v=1',
    };
  }

  return {
    alternates: {
      canonical: OFFICIAL_URL,
    },
    appleWebApp: {
      statusBarStyle: 'black-translucent',
      title: brandName,
    },
    description: t('chat.description', { appName: brandName }),
    icons: iconsConfig,
    manifest: '/manifest.json',
    metadataBase: new URL(OFFICIAL_URL),
    openGraph: {
      description: t('chat.description', { appName: brandName }),
      images: [
        {
          alt: t('chat.title', { appName: brandName }),
          height: 640,
          url: OG_URL,
          width: 1200,
        },
      ],
      locale: DEFAULT_LANG,
      siteName: brandName,
      title: brandName,
      type: 'website',
      url: OFFICIAL_URL,
    },
    title: {
      default: t('chat.title', { appName: brandName }),
      template: `%s · ${brandName}`,
    },
    twitter: {
      card: 'summary_large_image',
      description: t('chat.description', { appName: brandName }),
      images: [OG_URL],
      site: isCustomORG ? `@${ORG_NAME}` : '@lobehub',
      title: t('chat.title', { appName: brandName }),
    },
  };
};
