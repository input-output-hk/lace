import { NIGHT_TOKEN_ID } from '@lace-contract/midnight-context';
import { midnightDustBalances } from '@lace-module/midnight-sync/sdk';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  scan,
  switchMap,
} from 'rxjs';

import { observeMidnightWallet } from './midnight-wallet';

import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type {
  MidnightAccountId,
  MidnightWallet,
  MidnightWalletAddress,
} from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';

/** The balances and sync state of one Midnight account, as `observeMidnightBalances` emits them. */
export type MidnightBalances = {
  accountId: MidnightAccountId;
  address: MidnightWalletAddress;
  /** Unshielded NIGHT, in its smallest unit. */
  night: { available: bigint; pending: bigint };
  /** Generated DUST; `available` excludes the coin a pending transaction pays with. */
  dust: { balance: bigint; available: bigint };
  /** Whether each sub-wallet has strictly caught up with the chain. */
  synced: { unshielded: boolean; shielded: boolean; dust: boolean };
};

// NIGHT stays on state().unshielded rather than the store's coinsByTokenType$:
// that is a second stream of the same state, and combining the two can emit inconsistent snapshots.
const sumNight = (
  coins: readonly { utxo: { type: string; value: bigint } }[],
) =>
  coins
    .filter(({ utxo }) => utxo.type === NIGHT_TOKEN_ID)
    .reduce((sum, { utxo }) => sum + utxo.value, 0n);

const sameBalances = (a: MidnightBalances, b: MidnightBalances) =>
  a.address.unshielded === b.address.unshielded &&
  a.night.available === b.night.available &&
  a.night.pending === b.night.pending &&
  a.dust.balance === b.dust.balance &&
  a.dust.available === b.dust.available &&
  a.synced.unshielded === b.synced.unshielded &&
  a.synced.shielded === b.synced.shielded &&
  a.synced.dust === b.synced.dust;

const NOT_SYNCED = { unshielded: false, shielded: false, dust: false };

const balancesOf = (midnightWallet: MidnightWallet) =>
  combineLatest([
    midnightWallet.state(),
    midnightWallet.syncProgress$,
    midnightWallet.address$,
  ]).pipe(
    map(
      ([state, progress, address]): MidnightBalances => ({
        accountId: midnightWallet.accountId,
        address,
        night: {
          available: sumNight(state.unshielded.availableCoins),
          pending: sumNight(state.unshielded.pendingCoins),
        },
        dust: midnightDustBalances(state),
        synced: progress.isStrictlyComplete,
      }),
    ),
  );

/**
 * The account's NIGHT and DUST, straight from the engine, from the moment
 * it starts the account's wallets. Balances are complete once `synced`
 * reports the sub-wallet caught up; a transfer needs unshielded and dust.
 * NIGHT is summed from the engine's state, not from the store's token
 * balances; DUST is summed as the store sums it.
 *
 * Follows the engine across a sync reset or restart. While the engine has
 * stopped the account's wallets and not yet replaced them, it repeats the
 * last balances with every `synced` flag false; once the new wallets start,
 * it emits theirs.
 *
 * Cold: the account is resolved on subscription. Errors the subscriber with
 * `MidnightAccountNotFoundError`, or with `MidnightWalletNotReadyError` when
 * no wallets run for `startTimeout`, at first or after a stop.
 */
export const observeMidnightBalances = (
  wallet: WalletWithMidnight,
  props: MidnightAccountProps = {},
): Observable<MidnightBalances> =>
  observeMidnightWallet(wallet, props).pipe(
    switchMap(midnightWallet =>
      midnightWallet ? balancesOf(midnightWallet) : of(undefined),
    ),
    scan<MidnightBalances | undefined, MidnightBalances | undefined>(
      (last, next) => next ?? (last && { ...last, synced: NOT_SYNCED }),
      undefined,
    ),
    filter((balances): balances is MidnightBalances => !!balances),
    distinctUntilChanged(sameBalances),
  );
