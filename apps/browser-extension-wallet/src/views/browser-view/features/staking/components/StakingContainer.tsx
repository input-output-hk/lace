/* eslint-disable @typescript-eslint/no-var-requires */
import { Layout } from '@src/views/browser-view/components';
import React from 'react';
import { StakingSkeleton } from './StakingSkeleton';

// TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.
const Staking =
  process.env.USE_MULTI_DELEGATION_STAKING === 'true'
    ? require('./MultiDelegationStaking').MultiDelegationStaking
    : require('./Staking').Staking;

export const StakingContainer = (): React.ReactElement => (
  <Layout>
    <StakingSkeleton>
      <Staking />
    </StakingSkeleton>
  </Layout>
);
