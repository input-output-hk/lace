import { Staking } from '@lace/staking';
import React from 'react';
import { useTheme } from '@providers';
import '../../../../../../../../node_modules/@lace/staking/dist/index.css';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  return <Staking theme={theme.name} />;
};
