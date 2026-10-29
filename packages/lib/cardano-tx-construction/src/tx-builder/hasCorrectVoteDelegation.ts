import { Cardano } from '@lace-lib/cardano-core';

import type { RewardAccountWithPoolId } from '../types';

export const hasCorrectVoteDelegation = ({
  dRepDelegatee,
}: Pick<RewardAccountWithPoolId, 'dRepDelegatee'>): boolean => {
  const drep = dRepDelegatee?.delegateRepresentative;
  return !!drep && (!Cardano.isDrepInfo(drep) || drep.active);
};
