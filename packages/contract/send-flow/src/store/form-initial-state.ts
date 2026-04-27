import { BigNumber } from '@lace-sdk/util';

import type { StateOpen } from '../types';
import type { Token } from '@lace-contract/tokens';

export const createFormInitialState = ({
  token,
  amount = BigNumber(0n),
  address = '',
  initialBlockchainSpecific,
}: {
  token?: Token;
  amount?: BigNumber;
  address?: string;
  initialBlockchainSpecific?: unknown;
}): StateOpen['form'] => {
  const resolvedAmount =
    token?.metadata?.isNft === true && BigNumber.valueOf(amount) === 0n
      ? BigNumber(1n)
      : amount;

  return {
    address: {
      dirty: address !== '',
      error: null,
      value: address,
    },
    tokenTransfers: token
      ? [
          {
            amount: {
              dirty: BigNumber.valueOf(resolvedAmount) !== 0n,
              error: null,
              value: resolvedAmount,
            },
            token: {
              value: token,
            },
          },
        ]
      : [],
    ...(initialBlockchainSpecific
      ? {
          blockchainSpecific: {
            dirty: false,
            error: null,
            value: initialBlockchainSpecific,
          },
        }
      : undefined),
  };
};
