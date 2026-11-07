import React from 'react';

import { formatStakingApy } from '../format-staking-apy';
import { useLaceSelector } from '../hooks';
import { useActiveRealFiConfig } from '../use-realfi-config';

export const StakingApy = () => {
  const config = useActiveRealFiConfig();
  const yieldInfo = useLaceSelector(
    'realfiPosition.selectYieldInfo',
    config?.realfiNetwork ?? 'preview',
  );
  return <>{formatStakingApy(config ? yieldInfo?.apy : undefined) ?? '—'}</>;
};
