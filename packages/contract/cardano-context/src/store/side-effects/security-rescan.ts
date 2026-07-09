import { Cardano } from '@cardano-sdk/core';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  concatMap,
  EMPTY,
  from,
  map,
  merge,
  mergeMap,
  of,
  tap,
  toArray,
  withLatestFrom,
} from 'rxjs';

import { SECURITY_SCAN_WINDOW_START } from '../../const';
import {
  computeOwnKeyHashes,
  filterOwnWitnesses,
  deterministicNonce202606,
} from '../../security';
import { CardanoPaymentAddress } from '../../types';
import { isCardanoAddress } from '../../util';

import { buildSecurityScanEvent } from './security-scan-analytics';

import type { SideEffect } from '../../contract';
import type { ExtendedTxDetails } from '../../types';

const SCAN_CONCURRENCY = 6;

/**
 * Proactive opt-in security re-scan. The #2360 detector only flags exploits as
 * activities are first mapped, so accounts already in Lace before it shipped
 * are never checked. This re-scan inspects the account's on-chain tx history
 * (since {@link SECURITY_SCAN_WINDOW_START}) WITHOUT mutating wallet or activity
 * state, recording any findings under `securityScanByAccount` so the existing
 * compromise banner/name-suffix surface them via the slice's union selectors.
 *
 * Reacts to `cardanoContext.requestSecurityRescan`. Bails without recording a
 * result (leaving the prompt so it can retry) when the account is inactive,
 * missing its chain id or reward account, or has not completed a full sync --
 * scanning partial local history could otherwise mark an account clean before
 * every in-window transaction was fetched.
 */
export const securityRescan: SideEffect = (
  { cardanoContext: { requestSecurityRescan$ } },
  {
    cardanoContext: {
      selectActiveCardanoAccounts$,
      selectChainId$,
      selectTransactionHistoryGroupedByAccount$,
    },
    addresses: { selectAllAddresses$ },
    sync: { selectSyncStatusByAccount$ },
  },
  { actions, cardanoProvider: { getTransactionDetails } },
) =>
  requestSecurityRescan$.pipe(
    withLatestFrom(
      selectActiveCardanoAccounts$,
      selectChainId$,
      selectTransactionHistoryGroupedByAccount$,
      selectAllAddresses$,
      selectSyncStatusByAccount$,
    ),
    mergeMap(
      ([
        { payload },
        activeAccounts,
        chainId,
        txHistoryByAccount,
        addresses,
        syncStatusByAccount,
      ]) => {
        const { accountId } = payload;
        const reason = 'secondFi202606' as const;
        const startedAt = Date.now();
        const scannedAt = () => Date.now();
        let requestCount = 0;

        const isActive = activeAccounts.some(
          account => account.accountId === accountId,
        );

        const accountAddresses = addresses
          .filter(isCardanoAddress)
          .filter(address => address.accountId === accountId);
        const rewardAccount = accountAddresses[0]?.data?.rewardAccount;

        const isSynced =
          syncStatusByAccount[accountId]?.lastSuccessfulSync !== undefined;

        // `!isActive` means the accountId isn't on the currently active
        // network — a race with a network switch after the request was
        // queued. Silent bailout is honest: the user is no longer looking
        // at that account, and a "failed" toast would be noise.
        if (!isActive) return EMPTY;

        // The remaining guards represent unexpected local state for an
        // account the user is actively viewing — chain id / reward account
        // not populated, or sync not yet completed. Emit
        // `setSecurityScanFailed` so the failure-toast side-effect can
        // surface a "try again" cue instead of the tap silently no-op'ing.
        if (!chainId || !rewardAccount || !isSynced) {
          return from([
            actions.cardanoContext.setSecurityScanFailed({ accountId }),
            actions.analytics.trackEvent(
              buildSecurityScanEvent({
                reason,
                status: 'failed',
                durationMs: Date.now() - startedAt,
                requestCount,
              }),
            ),
          ]);
        }

        const paymentAddresses = accountAddresses.map(address =>
          CardanoPaymentAddress(address.address),
        );
        const ownKeyHashes = computeOwnKeyHashes(
          paymentAddresses,
          rewardAccount,
        );

        const txIds = (txHistoryByAccount[accountId] ?? [])
          .filter(item => item.blockTime >= SECURITY_SCAN_WINDOW_START)
          .map(item => item.txId);

        const checkTransaction = (details: ExtendedTxDetails) =>
          from(
            Promise.all(
              filterOwnWitnesses(details.witness.signatures, ownKeyHashes).map(
                async ([, signature]) =>
                  deterministicNonce202606
                    .txIsCompromised(details.id, signature)
                    .catch(() => false),
              ),
            ),
          ).pipe(
            map(checks =>
              checks.some(Boolean) ? 'deterministicNonce202606' : undefined,
            ),
          );

        const scan$ = from(txIds).pipe(
          mergeMap(
            txId =>
              getTransactionDetails(Cardano.TransactionId(txId), {
                chainId,
              }).pipe(
                // `subscribe` fires once per (re)subscription, so retryBackoff
                // retries are counted as the extra requests they are.
                tap({
                  subscribe: () => {
                    requestCount += 1;
                  },
                }),
                map(result => (result.isOk() ? result.value : undefined)),
                retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                catchError(() => of(undefined)),
              ),
            SCAN_CONCURRENCY,
          ),
          concatMap(details =>
            details ? checkTransaction(details) : of(undefined),
          ),
          toArray(),
          map(found => [...new Set(found.filter(Boolean))] as string[]),
          mergeMap(exploits =>
            from([
              actions.cardanoContext.setSecurityScanResult({
                accountId,
                scannedAt: scannedAt(),
                exploits,
              }),
              actions.analytics.trackEvent(
                buildSecurityScanEvent({
                  reason,
                  status: 'completed',
                  result:
                    exploits.length > 0 ? 'issues found' : 'no issues found',
                  durationMs: Date.now() - startedAt,
                  requestCount,
                }),
              ),
            ]),
          ),
          catchError(() =>
            from([
              actions.cardanoContext.setSecurityScanFailed({ accountId }),
              actions.analytics.trackEvent(
                buildSecurityScanEvent({
                  reason,
                  status: 'failed',
                  durationMs: Date.now() - startedAt,
                  requestCount,
                }),
              ),
            ]),
          ),
        );

        return merge(
          of(actions.cardanoContext.setSecurityScanInProgress({ accountId })),
          scan$,
        );
      },
    ),
  );
