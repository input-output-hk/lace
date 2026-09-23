import { ActivityType } from '@lace-contract/activities';
import {
  CardanoRewardAccount,
  isCardanoAddressOfSupportedNetwork,
  type CardanoPaymentAddress,
  type NightDesignationSnapshot,
} from '@lace-contract/cardano-context';
import {
  CardanoDustNetwork,
  MidnightCoinPubkey,
  getDustGeneratorPaymentAddress,
  getDustGeneratorRewardAccount,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { firstStateOfStatus } from '@lace-lib/util-store';
import {
  catchError,
  combineLatest,
  concat,
  exhaustMap,
  filter,
  forkJoin,
  from,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import { resolveAccountKeyHashes } from './account-key-hashes';
import { findRegistrationUtxo } from './registration-utxo';
import { unwrapProviderResult } from './unwrap-provider-result';

import type { SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

// =====================================================================
// cNIGHT designation index — refresh orchestrator.
// =====================================================================
// Fills the `nightDesignationIndex` read model: scans the dust-generator
// script address for the account's registration and asks whether the
// validator's reward account is registered on this network.
//
// Two triggers, both discrete — this never polls. The script address
// holds thousands of UTxOs on mainnet, so a background poll would be a
// standing cost for an answer that only changes when this wallet changes
// it; a designation transaction CONFIRMING is exactly when it does.
//
// `groupBy(accountId) → exhaustMap` makes a repeated request for the same
// account a no-op while its scan is in flight, without blocking a
// different account's scan behind it.
// =====================================================================

/**
 * How long a refresh waits for the chain id and addresses it scans with.
 *
 * Only a bound, not a deadline: inputs that never arrive must resolve the entry
 * rather than leave it refreshing forever, with no way back to a retry.
 */
const INPUTS_TIMEOUT_MS = 20_000;

// Both subjects seed empty, so a refresh requested before the app has published
// them — a cold boot, or the window after a network switch — would read as "this
// account has no Cardano address" and flag the entry: a not-ready-yet surfacing
// as a failure. Wait for a chain id and an address for this account instead.
//
// The address must also be OF that chain id. These are two independent
// BehaviorSubjects fed by separate side-effects, and the chain-id one publishes
// through `filter(Boolean)`, so mid-switch a stale chain id stays live and can
// pair with already-refreshed addresses. The chain id picks which script address
// is scanned, so an incoherent pair reads the wrong chain and would report a
// designated account as free.
const scanInputs$ = (
  accountId: AccountId,
  cardano: SideEffectDependencies['txExecutorCardano'],
  inputsTimeoutMs: number,
) =>
  combineLatest([cardano.cardanoChainId$, cardano.cardanoAddresses$]).pipe(
    filter((inputs): inputs is [Cardano.ChainId, AnyAddress[]] => {
      const [chainId, cardanoAddresses] = inputs;
      return (
        chainId !== undefined &&
        cardanoAddresses.some(
          address =>
            address.accountId === accountId &&
            isCardanoAddressOfSupportedNetwork(address, chainId),
        )
      );
    }),
    take(1),
    timeout({
      first: inputsTimeoutMs,
      with: () =>
        throwError(
          () => new Error('Cardano chain id / addresses never published'),
        ),
    }),
  );

const readSnapshot$ = ({
  accountId,
  chainId,
  cardanoAddresses,
  dependencies,
}: {
  accountId: AccountId;
  chainId: Cardano.ChainId;
  cardanoAddresses: AnyAddress[];
  dependencies: SideEffectDependencies;
}): Observable<NightDesignationSnapshot> => {
  const { stakeKeyHash } = resolveAccountKeyHashes(cardanoAddresses, accountId);
  const network = CardanoDustNetwork.fromNetworkMagic(chainId.networkMagic);

  return forkJoin([
    unwrapProviderResult(() =>
      dependencies.cardanoProvider.getUtxosAtAddress(
        {
          address: getDustGeneratorPaymentAddress(
            network,
          ) as unknown as CardanoPaymentAddress,
        },
        { chainId },
      ),
    ),
    // A probe that fails resolves to UNKNOWN rather than failing the read: it
    // gates only CHANGING a designation, so losing it must not also cost the
    // answer to whether the account is designated at all. Not `false` — the
    // provider already answers a never-seen reward account with a registered-
    // `false` result, so a throw here is transport, and a retry clears it.
    unwrapProviderResult(() =>
      dependencies.cardanoProvider.getRewardAccountInfo(
        {
          rewardAccount: CardanoRewardAccount(
            getDustGeneratorRewardAccount(network) as unknown as string,
          ),
        },
        { chainId },
      ),
    ).pipe(
      map(info => info.isRegistered),
      catchError(() => of(undefined)),
    ),
  ]).pipe(
    map(([scriptUtxos, isScriptStakeCredentialRegistered]) => {
      const registration = findRegistrationUtxo(
        scriptUtxos,
        getDustMappingNftAssetId(network),
        stakeKeyHash,
      );

      return {
        scriptStakeCredentialRegistered: isScriptStakeCredentialRegistered,
        ...(registration === undefined
          ? {}
          : {
              registration: {
                txId: String(registration.utxo[0].txId),
                outputIndex: registration.utxo[0].index,
                dustPubkeyHex: MidnightCoinPubkey.toHex(
                  registration.datum.dustAddress,
                ),
              },
            }),
      };
    }),
  );
};

export const makeNightDesignationIndexRefresh =
  ({
    inputsTimeoutMs = INPUTS_TIMEOUT_MS,
  }: { inputsTimeoutMs?: number } = {}): SideEffect =>
  (
    { nightDesignationIndex: { refreshRequested$ } },
    _stateObservables,
    dependencies,
  ) =>
    refreshRequested$.pipe(
      groupBy(({ payload }) => payload.accountId),
      mergeMap(perAccount$ =>
        perAccount$.pipe(
          exhaustMap(({ payload: { accountId } }) =>
            scanInputs$(
              accountId,
              dependencies.txExecutorCardano,
              inputsTimeoutMs,
            ).pipe(
              switchMap(([chainId, cardanoAddresses]) =>
                readSnapshot$({
                  accountId,
                  chainId,
                  cardanoAddresses,
                  dependencies,
                }),
              ),
              map(snapshot =>
                dependencies.actions.nightDesignationIndex.refreshCompleted({
                  accountId,
                  snapshot,
                }),
              ),
              // A failed read leaves the previous snapshot in place and
              // flags the entry; the surface that asked re-requests. No
              // `failures` entry: a global toast for "couldn't check the
              // designation status" outlives the screen that cares.
              catchError(() =>
                of(
                  dependencies.actions.nightDesignationIndex.refreshFailed({
                    accountId,
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    );

/**
 * How long an entry may stay provisional before the index re-reads anyway.
 *
 * The wait is on the submitted transaction's activity, which a dropped
 * transaction or a stalled account sync can leave pending forever; without a
 * bound the entry would offer no designation control for the rest of the
 * session.
 */
const SETTLING_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Hold the index provisional from submission until the designation
 * transaction is on chain, then re-read it.
 *
 * `Success` is a SUBMIT result — the txId comes back from submission — so the
 * script address still answers for the state before the designation. Scanning
 * here would write "not designated" over an account that has just designated,
 * and every later read would repeat it. The entry is marked settling instead,
 * and the scan waits for that transaction's activity to stop being pending.
 */
export const makeNightDesignationIndexSettling =
  ({
    settlingTimeoutMs = SETTLING_TIMEOUT_MS,
  }: { settlingTimeoutMs?: number } = {}): SideEffect =>
  (_, stateObservables, { actions }) =>
    firstStateOfStatus(
      stateObservables.nightDesignationFlow.selectState$,
      'Success',
    ).pipe(
      mergeMap(({ accountId, txId }) =>
        concat(
          of(
            actions.nightDesignationIndex.settlingStarted({ accountId, txId }),
          ),
          // merge rather than race: an activities stream that completes
          // without ever showing the transaction must not cancel the timeout.
          merge(
            stateObservables.activities.selectAllMap$.pipe(
              filter(byAccount =>
                (byAccount[accountId] ?? []).some(
                  activity =>
                    activity.activityId === txId &&
                    activity.type !== ActivityType.Pending,
                ),
              ),
            ),
            timer(settlingTimeoutMs),
          ).pipe(
            take(1),
            // The re-read is requested BEFORE the entry stops settling, so no
            // frame renders the pre-transaction snapshot as a settled answer.
            mergeMap(() =>
              from([
                actions.nightDesignationIndex.refreshRequested({ accountId }),
                actions.nightDesignationIndex.settlingEnded({ accountId }),
              ]),
            ),
          ),
        ),
      ),
    );
