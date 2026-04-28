import type { Cardano } from '@cardano-sdk/core';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

export type CardanoAccountId = AccountId & Tagged<string, 'CardanoAccountId'>;
export const CardanoAccountId = (
  walletId: WalletId,
  accountIndex: number,
  networkMagic: Cardano.NetworkMagic,
): CardanoAccountId =>
  `${walletId}-${accountIndex}-${networkMagic}` as CardanoAccountId;
