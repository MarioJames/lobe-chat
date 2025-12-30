import { BRANDING_NAME, ORG_NAME } from '@/const/branding';
import { DEFAULT_LANG } from '@/const/locale';
import { OFFICIAL_URL, OG_URL } from '@/const/url';
import { isCustomORG } from '@/const/version';
import { translation } from '@/server/translation';
import { customizationServerService } from '@/services/customization/server';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('metadata', locale);

  // Get theme from route variants
  const { theme } = await RouteVariants.getVariantsFromProps(props);
  const isDark = theme === 'dark';

  // Get customization config for favicon and brand name
  let baseConfig: {
    brandDescription?: string;
    brandName?: string;
    logo?: { dark?: string; light?: string };
  } | null = null;
  try {
    const config = await customizationServerService.getConfig();
    baseConfig = config?.base || null;
  } catch (error) {
    console.warn('Failed to get customization config for metadata:', error);
  }

  // 如果baseConfig为null，不显示默认的logo和lobehub文案
  if (!baseConfig) {
    return {
      alternates: {
        canonical: OFFICIAL_URL,
      },
      icons: [],
      manifest: '/manifest.json',
      metadataBase: new URL(OFFICIAL_URL),
      title: '',
    };
  }

  const brandName = baseConfig.brandName || BRANDING_NAME;
  const description = baseConfig.brandDescription
    ? `${brandName} ${baseConfig.brandDescription}`
    : t('chat.description', { appName: brandName });

  // Get favicon from enterprise logo in config based on current theme
  const faviconUrl = isDark
    ? baseConfig?.logo?.dark || baseConfig?.logo?.light
    : baseConfig?.logo?.light || baseConfig?.logo?.dark;

  return {
    alternates: {
      canonical: OFFICIAL_URL,
    },
    appleWebApp: {
      statusBarStyle: 'black-translucent',
      title: brandName,
    },
    description: description,
    ...(faviconUrl && { icons: faviconUrl }),
    manifest: '/manifest.json',
    metadataBase: new URL(OFFICIAL_URL),
    openGraph: {
      description: description,
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
      description: description,
      images: [OG_URL],
      site: isCustomORG ? `@${ORG_NAME}` : '@lobehub',
      title: t('chat.title', { appName: brandName }),
    },
  };
};
