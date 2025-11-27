'use client';

import { LobeHub, LobeHubProps } from '@lobehub/ui/brand';
import { memo } from 'react';

import { isCustomBranding } from '@/const/version';
import { useServerConfigStore } from '@/store/serverConfig';
import { customizationSelectors } from '@/store/serverConfig/selectors';

import CustomLogo from './Custom';

interface ProductLogoProps extends LobeHubProps {
  height?: number;
  width?: number;
}

export const ProductLogo = memo<ProductLogoProps>((props) => {
  const baseConfig = useServerConfigStore(customizationSelectors.base);
  const hasCustomLogo = baseConfig?.logo?.light || baseConfig?.logo?.dark;

  if (isCustomBranding || hasCustomLogo) {
    return <CustomLogo {...props} />;
  }

  return <LobeHub {...props} />;
});
