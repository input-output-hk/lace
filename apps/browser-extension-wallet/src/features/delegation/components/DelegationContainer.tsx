/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';

// TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.
const Delegation =
  process.env.USE_MULTI_DELEGATION_STAKING === 'true'
    ? require('./MultiDelegationStakingPopup').MultiDelegationStakingPopup
    : require('./DelegationContent').DelegationContent;

export const DelegationContainer = () => <Delegation />;
