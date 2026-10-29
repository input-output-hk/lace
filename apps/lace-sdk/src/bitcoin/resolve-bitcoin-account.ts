import { Err, Ok } from '@lace-lib/util';
import { bitcoinAccountWallets$ } from '@lace-module/blockchain-bitcoin/sdk';
import { firstValueFrom } from 'rxjs';

import type { StateObservables } from '@lace-contract/module';
import type {
  BlockchainNetworkId,
  networkSelectors,
} from '@lace-contract/network';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  walletsSelectors,
} from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';
import type { BitcoinWallet } from '@lace-module/blockchain-bitcoin/sdk';

/** A Bitcoin account and the wallet entity that holds it. */
export type ResolvedBitcoinAccount<Wallet extends AnyWallet> = {
  /** The Bitcoin account. */
  account: AnyAccount;
  /** The wallet entity the account belongs to. */
  walletEntity: Wallet;
};

/**
 * Picks the Bitcoin account a transaction is for, among the accounts of
 * `wallets` on the active networks: the requested one, or the only one when
 * none is requested.
 *
 * @param wallets - The wallet entities whose accounts may be picked.
 * @param activeNetworkIds - The networks the wallet is on.
 * @param requestedAccountId - The account asked for, if any.
 * @returns `Ok` with the account and its wallet entity, or `Err` when the
 *   requested account is not found, or no account or several accounts match.
 */
export const resolveBitcoinAccount = <Wallet extends AnyWallet>(
  wallets: readonly Wallet[],
  activeNetworkIds: readonly BlockchainNetworkId[],
  requestedAccountId?: AccountId,
): Result<ResolvedBitcoinAccount<Wallet>, Error> => {
  const bitcoinAccounts = wallets.flatMap(walletEntity =>
    walletEntity.accounts
      .filter(
        account =>
          account.blockchainName === 'Bitcoin' &&
          activeNetworkIds.includes(account.blockchainNetworkId),
      )
      .map(account => ({ account, walletEntity })),
  );

  if (requestedAccountId) {
    const found = bitcoinAccounts.find(
      ({ account }) => account.accountId === requestedAccountId,
    );
    return found
      ? Ok(found)
      : Err(
          new Error(
            `Bitcoin account "${requestedAccountId}" not found on the active network`,
          ),
        );
  }

  if (bitcoinAccounts.length === 0) {
    return Err(new Error('No Bitcoin accounts found on the active network'));
  }
  if (bitcoinAccounts.length > 1) {
    return Err(
      new Error(
        `Multiple Bitcoin accounts found (${bitcoinAccounts.length}): specify accountId to disambiguate`,
      ),
    );
  }
  return Ok(bitcoinAccounts[0]);
};

/** The wallet state a Bitcoin account is resolved from. */
export type BitcoinAccountObservables = Pick<
  StateObservables<typeof networkSelectors & typeof walletsSelectors>,
  'network' | 'wallets'
>;

/**
 * Picks the Bitcoin account a transaction is for from the wallet's current
 * state, by the rules of {@link resolveBitcoinAccount}.
 *
 * @param stateObservables - The wallet's wallets and networks.
 * @param requestedAccountId - The account asked for, if any.
 * @returns `Ok` with the account id, or `Err` when no single account matches.
 */
export const resolveBitcoinAccountId = async (
  stateObservables: BitcoinAccountObservables,
  requestedAccountId?: AccountId,
): Promise<Result<AccountId, Error>> => {
  const allWallets = await firstValueFrom(stateObservables.wallets.selectAll$);
  const activeNetworkIds = await firstValueFrom(
    stateObservables.network.selectAllActiveNetworkIds$,
  );
  const resolved = resolveBitcoinAccount(
    allWallets,
    activeNetworkIds,
    requestedAccountId,
  );
  return resolved.isErr()
    ? Err(resolved.error)
    : Ok(resolved.value.account.accountId);
};

/**
 * Finds the Bitcoin wallet that syncs an account. Every wallet in a
 * JavaScript realm registers its accounts in one shared registry, so an
 * account must be loaded by at most one wallet per realm.
 *
 * @param accountId - The account to find.
 * @returns `Ok` with the account's Bitcoin wallet, or `Err` when the account
 *   has not started syncing yet.
 */
export const findBitcoinAccountWallet = (
  accountId: AccountId,
): Result<BitcoinWallet, Error> => {
  const accountWallet = bitcoinAccountWallets$.value[accountId];
  return accountWallet
    ? Ok(accountWallet)
    : Err(
        new Error(`Bitcoin account "${accountId}" has not started syncing yet`),
      );
};
