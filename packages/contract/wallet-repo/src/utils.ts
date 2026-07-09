import { isNotNil } from '@cardano-sdk/util';
import { Timestamp } from '@lace-sdk/util';

import { WalletType } from './types';

import type {
  AnyAccount,
  AnyWallet,
  HardwareWallet,
  HardwareWalletTrezor,
  WalletIdentity,
} from './types';
import type { AccountIdentityKey } from './value-objects';
import type { ByBlockchainName } from '@lace-lib/util-store';

export const isHardwareWallet = (wallet: AnyWallet): wallet is HardwareWallet =>
  wallet.type === WalletType.HardwareLedger ||
  wallet.type === WalletType.HardwareTrezor;

export const isTrezorWallet = (
  wallet: AnyWallet,
): wallet is HardwareWalletTrezor => wallet.type === WalletType.HardwareTrezor;

const accountIdentityKeys = (
  wallet: AnyWallet,
  identityByBlockchain: ByBlockchainName<WalletIdentity>,
): Set<AccountIdentityKey> =>
  new Set(
    wallet.accounts
      .map(account =>
        identityByBlockchain[account.blockchainName]?.getAccountIdentityKey(
          account,
        ),
      )
      .filter(isNotNil),
  );

/**
 * Find an existing wallet that shares key-derived identity with `candidate`,
 * i.e. represents the same underlying keys. Used to reject re-adding a wallet
 * that is already present, regardless of how its `walletId` was derived
 * (hardware device descriptor in v2 vs. public-key hash from a v1 migration,
 * or the same seed loaded on two physical devices).
 *
 * Fails open: if no blockchain provides an identity extractor for the
 * candidate's accounts, returns `undefined` (the add is allowed).
 */
export const findWalletSharingIdentity = (
  candidate: AnyWallet,
  existingWallets: AnyWallet[],
  identityByBlockchain: ByBlockchainName<WalletIdentity>,
): AnyWallet | undefined => {
  const candidateKeys = accountIdentityKeys(candidate, identityByBlockchain);
  if (candidateKeys.size === 0) return undefined;
  return existingWallets.find(wallet =>
    [...accountIdentityKeys(wallet, identityByBlockchain)].some(key =>
      candidateKeys.has(key),
    ),
  );
};

const withOnboardedAt = <T extends AnyAccount>(
  account: T,
  onboardedAt: Timestamp,
): T =>
  account.metadata?.onboardedAt === undefined
    ? { ...account, metadata: { ...account.metadata, onboardedAt } }
    : account;

/**
 * Stamps `metadata.onboardedAt` on freshly-created accounts so consumers can
 * tell when an account first entered Lace. Call at account-creation sites
 * (side-effects/builders) just before dispatching `addWallet`/`updateWallet`,
 * passing only the new accounts. Existing accounts must keep their original
 * `onboardedAt` (including undefined for pre-feature accounts), so this only
 * sets it where currently unset.
 *
 * `onboardedAt` defaults to `Date.now()`; pass an explicit value to keep all
 * accounts in one batch consistent.
 */
export const stampAccountsOnboardedAt = <T extends AnyAccount>(
  accounts: readonly T[],
  onboardedAt: Timestamp = Timestamp(Date.now()),
): T[] => accounts.map(account => withOnboardedAt(account, onboardedAt));

/**
 * Returns a copy of `wallet` with `metadata.onboardedAt` stamped on every
 * account that lacks it. Convenience wrapper around
 * {@link stampAccountsOnboardedAt} for the `addWallet` path, where the whole
 * wallet is new.
 */
export const stampWalletOnboardedAt = <T extends AnyWallet>(
  wallet: T,
  onboardedAt: Timestamp = Timestamp(Date.now()),
): T => ({
  ...wallet,
  accounts: wallet.accounts.map(account =>
    withOnboardedAt(account, onboardedAt),
  ),
});
