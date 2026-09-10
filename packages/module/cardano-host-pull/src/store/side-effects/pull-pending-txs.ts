import {
  derivePendingActivityFromCbor,
  isCardanoAccount,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge,
  mergeMap,
  of,
  scan,
  startWith,
  switchMap,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { PendingCardanoTxs } from '../../augmentations';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { CardanoUtxo } from '@lace-lib/extension-shell-api';

/** The (walletId, accountIndex, networkMagic) triple the host method is keyed
 * on, paired with the accountId the derived activity is filed under. */
type PullTarget = {
  accountId: AccountId;
  walletId: string;
  accountIndex: number;
  networkMagic: number;
};

/** The active-network Cardano accounts a pull covers. MultiSig is excluded: its
 * `blockchainSpecific` carries a key path rather than an accountIndex, so no
 * host account is addressable for it. */
const pullTargets = (accounts: readonly AnyAccount[]): PullTarget[] =>
  accounts.flatMap(account => {
    if (!isCardanoAccount(account) || account.accountType === 'MultiSig') {
      return [];
    }
    const { accountIndex, chainId } = account.blockchainSpecific;
    return [
      {
        accountId: account.accountId,
        walletId: account.walletId,
        accountIndex,
        networkMagic: Number(chainId.networkMagic),
      },
    ];
  });

const sameTargets = (
  left: readonly PullTarget[],
  right: readonly PullTarget[],
): boolean =>
  left.length === right.length &&
  left.every((target, index) => target.accountId === right[index]?.accountId);

/** Reify one served entry's own inputs as the `Cardano.Utxo` pairs the
 * derivation consumes. Lovelace and asset amounts cross the wire as decimal
 * strings (the transport convention), so they are widened back to BigInt here. */
const toCardanoUtxos = (ownInputs: readonly CardanoUtxo[]): Cardano.Utxo[] =>
  ownInputs.map(
    ({ txId, index, address, lovelace, assets }) =>
      [
        { txId, index },
        {
          address,
          value: {
            coins: BigInt(lovelace),
            ...(assets
              ? {
                  assets: new Map(
                    Object.entries(assets).map(([assetId, amount]) => [
                      assetId,
                      BigInt(amount),
                    ]),
                  ),
                }
              : {}),
          },
        },
      ] as Cardano.Utxo,
  );

/**
 * Derive the pending activities one served pull answers for, skipping any tx the
 * account already holds an activity for.
 *
 * Which inputs and outputs are the account's OWN comes entirely from the host,
 * never from the guest's projection of the account: the host resolved both when
 * it attributed the submit, and only its view is complete — the guest's utxo set
 * no longer holds the spent inputs, and change may pay to an address the account
 * has never transacted on, which its address set does not contain. What the guest
 * contributes is the derivation itself — the same one its own send flow runs, so
 * a dapp-submitted tx and a guest-submitted one produce the same activity.
 *
 * Skipping known tx ids is what makes a re-pull free: re-deriving would restamp
 * `timestamp` with the current clock, and the list is timestamp-sorted, so the
 * row would jump on every trigger. It also keeps a CONFIRMED tx from being
 * pushed back to Pending, should the host serve an entry it has not reconciled
 * away yet.
 */
const pendingActivitiesOf = ({
  target,
  txs,
  knownActivityIds,
}: {
  target: PullTarget;
  txs: PendingCardanoTxs['txs'];
  knownActivityIds: ReadonlySet<string>;
}): Activity[] =>
  txs.flatMap(tx => {
    // The host tx hash is the chain's; the ACTIVITY id must be the tx id the
    // confirmed history will carry, which the derivation takes from the cbor.
    const activity = derivePendingActivityFromCbor({
      serializedTx: HexBytes(tx.txCbor),
      accountId: target.accountId,
      accountAddresses: tx.ownOutputs.map(
        output => output.address as CardanoPaymentAddress,
      ),
      accountUtxos: toCardanoUtxos(tx.ownInputs),
    });
    return activity && !knownActivityIds.has(activity.activityId)
      ? [activity]
      : [];
  });

/**
 * Project the host's in-flight tx bookkeeping into pending ACTIVITIES (ADR 34
 * pull model — no completion push). A tx the guest submitted itself already
 * produced its pending activity on the way out; this covers the ones it never
 * saw, above all a dapp's `cip30.submitTx`, which the host brokers end to end —
 * without it a dapp send left the wallet showing no trace of the tx until
 * confirmed history landed minutes later.
 *
 * Pulls on the ACCOUNT SET becoming available or changing (boot, an added
 * account, a network switch) and on `windowRefocus$` — the dapp runs in its own
 * tab, so handing attention back to the guest is exactly when the pull model can
 * observe what happened while it was away (the wallet-repo hydrator's trigger
 * pair). The activity snapshot rides along rather than triggering: a dispatch
 * here changes the activity map, so triggering on it would re-arm the trigger
 * that dispatched.
 *
 * FEATURE-GATED (ADR 41 handshake) and wire-error tolerant: an older host
 * without `cardano.getPendingTxs` no-ops, and a failed read is skipped until the
 * next trigger (`lace.request` answers a typed `{ ok: false }`, it never rejects).
 */
export const pullPendingTxs: SideEffect = (
  _,
  { wallets: { selectActiveNetworkAccounts$ }, activities: { selectAllMap$ } },
  {
    actions,
    canGetPendingCardanoTxs,
    getPendingCardanoTxs,
    windowRefocus$,
    logger,
  },
) => {
  if (!canGetPendingCardanoTxs) return EMPTY;
  // A monotonic token per regained attention (0 = boot), so two consecutive
  // refocuses are distinguishable — `windowRefocus$` carries no value.
  const attention$ = windowRefocus$.pipe(
    scan(count => count + 1, 0),
    startWith(0),
  );
  return combineLatest([
    attention$,
    selectActiveNetworkAccounts$.pipe(map(pullTargets)),
    selectAllMap$,
  ]).pipe(
    distinctUntilChanged(
      ([attentionLeft, targetsLeft], [attentionRight, targetsRight]) =>
        attentionLeft === attentionRight &&
        sameTargets(targetsLeft, targetsRight),
    ),
    filter(([, targets]) => targets.length > 0),
    // One read per account, merged: an account whose read failed contributes
    // nothing rather than holding up (or aborting) its siblings.
    switchMap(([, targets, activitiesByAccount]) =>
      merge(
        ...targets.map(target =>
          getPendingCardanoTxs({
            walletId: target.walletId,
            accountIndex: target.accountIndex,
            networkMagic: target.networkMagic,
          }).pipe(
            mergeMap(result => {
              if (!result.ok) {
                logger.warn(
                  `cardano-host-pull: cardano.getPendingTxs failed for ${target.accountId} — ${result.error.message}`,
                );
                return EMPTY;
              }
              const activities = pendingActivitiesOf({
                target,
                txs: result.value.txs,
                knownActivityIds: new Set(
                  (activitiesByAccount[target.accountId] ?? []).map(
                    activity => activity.activityId,
                  ),
                ),
              });
              return activities.length > 0
                ? of(
                    actions.activities.upsertActivities({
                      accountId: target.accountId,
                      activities,
                    }),
                  )
                : EMPTY;
            }),
          ),
        ),
      ),
    ),
  );
};
