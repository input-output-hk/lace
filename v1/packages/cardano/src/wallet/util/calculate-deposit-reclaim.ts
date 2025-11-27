import { Cardano } from '@cardano-sdk/core';

// SDK's ImplicitCoin's "input" field contains summed up withdrawals and stake key reclaim deposits.
// This function calculates just the stake key reclaim deposit.
export const calculateDepositReclaim = ({
  input,
  withdrawals
}: Cardano.util.ImplicitCoin): Cardano.Lovelace | undefined => {
  if (!input) return undefined;

  // eslint-disable-next-line consistent-return
  return input - (withdrawals || BigInt(0));
};
