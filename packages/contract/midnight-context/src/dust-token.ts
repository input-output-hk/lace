import { createRawToken, createToken } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';

import { DUST_TOKEN_DECIMALS } from './const';
import {
  getDustTokenIdByNetwork,
  getDustTokenTickerByNetwork,
  midnightNetworkIdToNetworkType,
} from './utils';
import { MidnightShieldedAddress } from './value-objects';

import type { MidnightSDKNetworkId } from './const';

export const createDustToken = (
  networkId: MidnightSDKNetworkId,
  balance: BigNumber,
) =>
  createToken(
    createRawToken({
      accountId: AccountId(''),
      address: MidnightShieldedAddress(''),
      blockchainName: 'Midnight',
      tokenWithoutContext: {
        available: balance,
        tokenId: getDustTokenIdByNetwork(networkId),
        pending: BigNumber(0n),
      },
    }),
    {
      decimals: DUST_TOKEN_DECIMALS,
      displayDecimalPlaces: 2,
      name: 'DUST',
      ticker: getDustTokenTickerByNetwork(
        midnightNetworkIdToNetworkType(networkId),
      ),
      blockchainSpecific: {},
    },
  );
