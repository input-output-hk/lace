import type { MidnightSDKNetworkId } from '../const';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Midnight supports only 1 account per wallet
 */
export type MidnightAccountId = AccountId & Tagged<string, 'MidnightAccountId'>;
export const MidnightAccountId = (
  walletId: WalletId,
  accountIndex: number,
  networkId: MidnightSDKNetworkId,
): MidnightAccountId =>
  `${walletId}-mn-${accountIndex}-${networkId}` as MidnightAccountId;
