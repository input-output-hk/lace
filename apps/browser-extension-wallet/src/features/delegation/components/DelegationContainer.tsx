/* eslint-disable @typescript-eslint/no-var-requires */
import { useIsMultiDelegationEnabled } from '@hooks/useIsMultiDelegationEnabled';

import React from 'react';
import { MultiDelegationStakingPopup } from './MultiDelegationStakingPopup';
import { DelegationContent } from './DelegationContent';

export const DelegationContainer = (): React.ReactElement => {
  // TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.
  const multiDelegationEnabled = useIsMultiDelegationEnabled();

  return <>{multiDelegationEnabled ? <MultiDelegationStakingPopup /> : <DelegationContent />}</>;
};
