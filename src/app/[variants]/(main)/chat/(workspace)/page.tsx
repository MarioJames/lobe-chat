import { Suspense } from 'react';

import StructuredData from '@/components/StructuredData';
import { serverFeatureFlags } from '@/config/featureFlags';
import { isDesktop } from '@/const/version';
import { ldModule } from '@/server/ld';
import { metadataModule } from '@/server/metadata';
import { translation } from '@/server/translation';
import { customizationServerService } from '@/services/customization/server';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

import PageTitle from '../features/PageTitle';
import Changelog from './features/ChangelogModal';
import TelemetryNotification from './features/TelemetryNotification';

const getBrandInfo = async (): Promise<{
  brandName: string | null;
  description: string;
} | null> => {
  try {
    const config = await customizationServerService.getConfig();
    const baseConfig = config?.base;

    // 如果baseConfig为null，返回null，不显示默认的logo和lobehub文案
    if (!baseConfig) {
      return null;
    }

    return {
      brandName: baseConfig.brandName || null,
      description: baseConfig.brandDescription || '',
    };
  } catch (error) {
    console.warn('Failed to get customization config:', error);
    return null;
  }
};

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('metadata', locale);
  const brandInfo = await getBrandInfo();

  // 如果brandInfo为null，不显示默认的logo和lobehub文案
  if (!brandInfo) {
    return {
      title: '',
    };
  }

  const { brandName, description } = brandInfo;

  // 如果brandName为null，使用空字符串作为title
  if (!brandName) {
    return {
      title: '',
    };
  }

  return metadataModule.generate({
    description: description || t('chat.description', { appName: brandName }),
    title: t('chat.title', { appName: brandName }),
    url: '/chat',
  });
};

const Page = async (props: DynamicLayoutProps) => {
  const { hideDocs, showChangelog } = serverFeatureFlags();
  const { isMobile, locale } = await RouteVariants.getVariantsFromProps(props);
  const { t } = await translation('metadata', locale);
  const brandInfo = await getBrandInfo();

  // 如果brandInfo为null，不生成结构化数据
  const ld =
    brandInfo && brandInfo.brandName
      ? ldModule.generate({
          description:
            brandInfo.description || t('chat.description', { appName: brandInfo.brandName }),
          title: t('chat.title', { appName: brandInfo.brandName }),
          url: '/chat',
        })
      : null;

  return (
    <>
      {ld && <StructuredData ld={ld} />}
      <PageTitle />
      <TelemetryNotification mobile={isMobile} />
      {!isDesktop && showChangelog && !hideDocs && !isMobile && (
        <Suspense>
          <Changelog />
        </Suspense>
      )}
    </>
  );
};

Page.displayName = 'Chat';

export default Page;
