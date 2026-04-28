import { FeatureFlagKey } from '@lace-contract/feature';

import type { BlockchainName } from '@lace-lib/util-store';

export const FEATURE_FLAG_SEND_FLOW = FeatureFlagKey('SEND_FLOW');

export type SendFlowFeatureFlagPayload = {
  [blockchain in BlockchainName]?: {
    mainnet?: boolean;
    testnet?: boolean;
  };
};
