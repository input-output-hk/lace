import { Staking } from '@lace/staking';
import React from 'react';
import { useTheme } from '@providers';

export const MultiDelegationStaking = () => {
  const { theme } = useTheme();
  return <Staking theme={theme.name} />;
};
