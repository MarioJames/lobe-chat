import { Suspense } from 'react';

import StructuredData from '@/components/StructuredData';
import { serverFeatureFlags } from '@/config/featureFlags';
import { BRANDING_NAME } from '@/const/branding';
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

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('metadata', locale);

  // Get brand name from customization config using server service
  let brandName = BRANDING_NAME;
  try {
    const config = await customizationServerService.getConfig();
    brandName = config?.base?.brandName || BRANDING_NAME;
  } catch (error) {
    // Fallback to default brand name if config fetch fails
    console.warn('Failed to get customization config for metadata:', error);
  }

  return metadataModule.generate({
    description: t('chat.description', { appName: brandName }),
    title: t('chat.title', { appName: brandName }),
    url: '/chat',
  });
};

const Page = async (props: DynamicLayoutProps) => {
  const { hideDocs, showChangelog } = serverFeatureFlags();
  const { isMobile, locale } = await RouteVariants.getVariantsFromProps(props);
  const { t } = await translation('metadata', locale);

  // Get brand name from customization config for structured data using server service
  let brandName = BRANDING_NAME;
  try {
    const config = await customizationServerService.getConfig();
    brandName = config?.base?.brandName || BRANDING_NAME;
  } catch (error) {
    // Fallback to default brand name if config fetch fails
    console.warn('Failed to get customization config:', error);
  }

  const ld = ldModule.generate({
    description: t('chat.description', { appName: brandName }),
    title: t('chat.title', { appName: brandName }),
    url: '/chat',
  });

  return (
    <>
      <StructuredData ld={ld} />
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
