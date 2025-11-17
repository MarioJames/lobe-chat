import type { CustomizationConfig } from '@lobechat/types';
import { SWRResponse } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { useOnlyFetchOnceSWR } from '@/libs/swr';
import { customizationService } from '@/services/customization';
import { globalService } from '@/services/global';
import { GlobalRuntimeConfig } from '@/types/serverConfig';

import type { ServerConfigStore } from './store';

const FETCH_SERVER_CONFIG_KEY = 'FETCH_SERVER_CONFIG';
const FETCH_CUSTOMIZATION_CONFIG_KEY = 'FETCH_CUSTOMIZATION_CONFIG';
export interface ServerConfigAction {
  useInitCustomizationConfig: () => SWRResponse<CustomizationConfig>;
  useInitServerConfig: () => SWRResponse<GlobalRuntimeConfig>;
}

export const createServerConfigSlice: StateCreator<
  ServerConfigStore,
  [['zustand/devtools', never]],
  [],
  ServerConfigAction
> = (set) => ({
  useInitCustomizationConfig: () => {
    return useOnlyFetchOnceSWR<CustomizationConfig>(
      FETCH_CUSTOMIZATION_CONFIG_KEY,
      async () => {
        const config = await customizationService.getConfig();
        // Convert null fields to undefined to match CustomizationConfig type
        return {
          base: config.base ?? undefined,
          defaultAgent: config.defaultAgent ?? undefined,
          welcome: config.welcome ?? undefined,
        };
      },
      {
        onSuccess: (data) => {
          set({ customizationConfig: data }, false, 'initCustomizationConfig');
        },
      },
    );
  },
  useInitServerConfig: () => {
    return useOnlyFetchOnceSWR<GlobalRuntimeConfig>(
      FETCH_SERVER_CONFIG_KEY,
      () => globalService.getGlobalConfig(),
      {
        onSuccess: (data) => {
          set(
            { featureFlags: data.serverFeatureFlags, serverConfig: data.serverConfig },
            false,
            'initServerConfig',
          );
        },
      },
    );
  },
});
