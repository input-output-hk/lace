/* eslint-disable @typescript-eslint/no-var-requires */
import { Layout } from '@src/views/browser-view/components';
import React from 'react';
import { StakingSkeleton } from './StakingSkeleton';
import { useIsMultiDelegationEnabled } from '@hooks/useIsMultiDelegationEnabled';
import { MultiDelegationStaking } from './MultiDelegationStaking';
import { Staking } from './Staking';

export const StakingContainer = (): React.ReactElement => {
  // TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.
  const multiDelegationEnabled = useIsMultiDelegationEnabled();

  return (
    <Layout>
      <StakingSkeleton>{multiDelegationEnabled ? <MultiDelegationStaking /> : <Staking />}</StakingSkeleton>
    </Layout>
  );
};
