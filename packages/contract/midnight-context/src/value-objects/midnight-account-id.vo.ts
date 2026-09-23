import type { MidnightSDKNetworkId } from '../const';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Identifies a single Midnight account — unique per wallet, account index and
 * network.
 *
 * The string form is a persistence contract, not an implementation detail: it
 * is the storage key for the account's wallet state, and it is re-derived
 * without importing this module by the wallet-repo account-id migration and by
 * the extension e2e upgrade fixtures. Changing the shape orphans every stored
 * document.
 */
export type MidnightAccountId = AccountId & Tagged<string, 'MidnightAccountId'>;
export const MidnightAccountId = (
  walletId: WalletId,
  accountIndex: number,
  networkId: MidnightSDKNetworkId,
): MidnightAccountId =>
  `${walletId}-mn-${accountIndex}-${networkId}` as MidnightAccountId;
