import { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
} from 'rxjs';

import { pullTargets, sameTargets } from './pull-targets';

import type { SideEffect } from '../..';
import type { PullTarget } from './pull-targets';
import type { AccountId } from '@lace-contract/wallet-repo';

/** The targets whose discovered address set has already landed guest-side. */
const discoveredTargets = (
  targets: readonly PullTarget[],
  addresses: readonly { accountId: AccountId }[],
): PullTarget[] => {
  const discovered = new Set(addresses.map(address => address.accountId));
  return targets.filter(target => discovered.has(target.accountId));
};

/**
 * Project the host's one UNUSED receive address per account into the addresses
 * slice, so a receive surface can offer a fresh address instead of re-offering
 * the primary. Which index is unused is knowledge of the walk that resolved it,
 * and address discovery is host authority here (ADR 46/48) — the guest derives
 * no address of its own for this.
 *
 * Triggers on the guest's discovered address set for the account rather than on
 * boot or attention: the host recomputes this address from the same walk that
 * produces that set, so the two move together — a widened set is exactly when
 * the value can have changed, and a set that stops growing costs no reads at
 * all. Holding off until the account HAS a discovered set also keeps this off
 * an account's first-ever sync, where it would race the sync's own
 * `discoverAddresses` over a host cache neither has filled yet (the host
 * coalesces nothing, so both callers would walk).
 *
 * The dispatch cannot re-arm the trigger: it writes a different field of the
 * slice, leaving `selectAllAddresses$` (distinct-until-changed) unmoved.
 *
 * Feature-detected on the value, not on a capability: `nextUnusedExternal` is
 * an additive field of a method the guest already calls, and a host predating
 * it — or holding no Cardano account at that (index, magic) — omits it, which
 * leaves the field unset rather than throwing. A refused read is likewise
 * skipped until the next trigger (`lace.request` answers a typed
 * `{ ok: false }`, it never rejects).
 */
export const pullNextUnusedAddress: SideEffect = (
  _,
  {
    wallets: { selectActiveNetworkAccounts$ },
    addresses: { selectAllAddresses$ },
  },
  { actions, getCardanoAddresses, logger },
) =>
  combineLatest([
    selectActiveNetworkAccounts$.pipe(map(pullTargets)),
    selectAllAddresses$,
  ]).pipe(
    distinctUntilChanged(
      ([targetsLeft, addressesLeft], [targetsRight, addressesRight]) =>
        sameTargets(targetsLeft, targetsRight) &&
        addressesLeft === addressesRight,
    ),
    map(([targets, addresses]) => discoveredTargets(targets, addresses)),
    filter(targets => targets.length > 0),
    // One read per account, merged: an account whose read failed contributes
    // nothing rather than holding up (or aborting) its siblings.
    switchMap(targets =>
      merge(
        ...targets.map(target =>
          getCardanoAddresses({
            walletId: target.walletId,
            accountIndex: target.accountIndex,
            networkMagic: target.networkMagic,
          }).pipe(
            mergeMap(result => {
              if (!result.ok) {
                logger.warn(
                  `cardano-host-pull: cardano.getAddresses failed for ${target.accountId} — ${result.error.message}`,
                );
                return EMPTY;
              }
              const { nextUnusedExternal } = result.value;
              return nextUnusedExternal === undefined
                ? EMPTY
                : of(
                    actions.addresses.setNextUnusedAddress({
                      accountId: target.accountId,
                      address: CardanoPaymentAddress(nextUnusedExternal),
                    }),
                  );
            }),
          ),
        ),
      ),
    ),
  );
