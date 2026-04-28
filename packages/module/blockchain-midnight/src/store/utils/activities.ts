import { ActivityType } from '@lace-contract/activities';
import { toUnshieldedTokenType } from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';

import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { TransactionHistoryEntry } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

type HistoryUtxo = {
  value: bigint | string;
  owner: string;
  tokenType: string;
};

const toBigInt = (v: bigint | string): bigint =>
  typeof v === 'bigint' ? v : BigInt(v);

export const buildTokenBalanceChangesFromUtxos = (
  createdUtxos: readonly HistoryUtxo[],
  spentUtxos: readonly HistoryUtxo[],
  networkId: MidnightSDKNetworkId,
): Array<{
  tokenId: ReturnType<typeof TokenId>;
  amount: ReturnType<typeof BigNumber>;
}> => {
  const changesByToken = new Map<
    string,
    { tokenId: ReturnType<typeof TokenId>; amount: bigint }
  >();
  for (const u of createdUtxos) {
    const tokenId = TokenId(toUnshieldedTokenType(u.tokenType, networkId));
    const existing = changesByToken.get(tokenId);
    const value = toBigInt(u.value);
    changesByToken.set(tokenId, {
      tokenId,
      amount: existing ? existing.amount + value : value,
    });
  }
  for (const u of spentUtxos) {
    const tokenId = TokenId(toUnshieldedTokenType(u.tokenType, networkId));
    const existing = changesByToken.get(tokenId);
    const value = toBigInt(u.value);
    changesByToken.set(tokenId, {
      tokenId,
      amount: existing ? existing.amount - value : -value,
    });
  }
  return [...changesByToken.values()]
    .filter(({ amount }) => amount !== 0n)
    .map(({ tokenId, amount }) => ({
      tokenId,
      amount: BigNumber(amount),
    }));
};

export const getAddressFromUtxos = (
  createdUtxos: readonly HistoryUtxo[],
  spentUtxos: readonly HistoryUtxo[],
): string => {
  const first = createdUtxos[0] ?? spentUtxos[0];
  return first?.owner ?? '';
};

export const mapStatusToActivityType = (
  status: TransactionHistoryEntry['status'],
  tokenBalanceChanges?: Array<{ amount: ReturnType<typeof BigNumber> }>,
): ActivityType => {
  switch (status) {
    case 'SUCCESS': {
      const isReceive =
        !tokenBalanceChanges?.length ||
        tokenBalanceChanges.some(({ amount }) => BigInt(amount) > 0n);
      return isReceive ? ActivityType.Receive : ActivityType.Send;
    }
    case 'FAILURE':
      return ActivityType.Failed;
    case 'PARTIAL_SUCCESS':
      return ActivityType.Pending;
  }
};

export const formatFee = (fees: TransactionHistoryEntry['fees']): string =>
  fees === null || fees === undefined ? '0' : String(fees);
