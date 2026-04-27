import { BlockchainNetworkId } from '@lace-contract/network';

import type { MidnightSDKNetworkId } from '../const';
import type { Tagged } from 'type-fest';

export type MidnightNetworkId = BlockchainNetworkId &
  Tagged<string, 'MidnightNetworkId'>;

const MIDNIGHT_NETWORK_PREFIX = 'midnight-';

interface MidnightNetworkIdConstructor {
  (networkId: MidnightSDKNetworkId): MidnightNetworkId;

  getNetworkNameId(networkId: MidnightNetworkId): MidnightSDKNetworkId;
  getNetworkNameId(
    networkId: BlockchainNetworkId,
  ): MidnightSDKNetworkId | undefined;
}

export const MidnightNetworkId = Object.assign(
  (networkId: MidnightSDKNetworkId) =>
    BlockchainNetworkId(`${MIDNIGHT_NETWORK_PREFIX}${networkId}`),
  {
    getNetworkNameId: (networkId: BlockchainNetworkId) =>
      networkId?.startsWith(MIDNIGHT_NETWORK_PREFIX)
        ? networkId.slice(MIDNIGHT_NETWORK_PREFIX.length)
        : undefined,
  },
) as MidnightNetworkIdConstructor;
