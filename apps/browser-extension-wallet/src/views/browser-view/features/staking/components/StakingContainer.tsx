/* eslint-disable @typescript-eslint/no-var-requires */
import { Layout } from '@src/views/browser-view/components';
import React from 'react';

const Staking =
  process.env.USE_MULTI_DELEGATION_STAKING === 'true' ? require('@lace/staking').Staking : require('./Staking').Staking;

export const StakingContainer = (): React.ReactElement => (
  <Layout>
    <Staking />
  </Layout>
);
