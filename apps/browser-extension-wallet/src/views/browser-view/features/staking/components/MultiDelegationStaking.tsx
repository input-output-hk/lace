import { Staking } from '@lace/staking';
import React from 'react';
import { useTheme } from '@providers';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  return <Staking theme={theme.name} />;
};
