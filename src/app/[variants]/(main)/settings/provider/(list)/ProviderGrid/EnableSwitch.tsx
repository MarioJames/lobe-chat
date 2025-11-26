import { FC } from 'react';

import InstantSwitch from '@/components/InstantSwitch';
import { useAIProviderPermissions } from '@/hooks/useRbacPermissions';
import { useAiInfraStore } from '@/store/aiInfra';

interface SwitchProps {
  Component?: FC<{ enabled: boolean; id: string }>;
  enabled: boolean;
  id: string;
}

const Switch = ({ id, Component, enabled }: SwitchProps) => {
  const [toggleProviderEnabled] = useAiInfraStore((s) => [s.toggleProviderEnabled]);
  const { canUpdate } = useAIProviderPermissions();

  // slot for cloud
  if (Component) return <Component enabled={enabled} id={id} />;

  return (
    <InstantSwitch
      disabled={!canUpdate}
      enabled={enabled}
      onChange={async (checked) => {
        await toggleProviderEnabled(id, checked);
      }}
      size={'small'}
    />
  );
};

export default Switch;
