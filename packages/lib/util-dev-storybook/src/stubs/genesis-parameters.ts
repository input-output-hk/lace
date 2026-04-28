import { Seconds } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

export const genesisParameters: Cardano.CompactGenesis = {
  activeSlotsCoefficient: 0.05,
  epochLength: 432000,
  maxKesEvolutions: 62,
  maxLovelaceSupply: 45000000000000000n,
  networkId: 0,
  networkMagic: 1,
  securityParameter: 2160,
  slotLength: Seconds(1),
  slotsPerKesPeriod: 129600,
  systemStart: new Date('2017-09-23T21:44:51.000Z'),
  updateQuorum: 5,
};
