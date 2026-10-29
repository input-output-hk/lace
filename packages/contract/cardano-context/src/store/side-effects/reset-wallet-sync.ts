import { Percent } from '@cardano-sdk/util';
import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { TokenId } from '@lace-contract/tokens';
import { Timestamp } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { Serializable } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  combineLatest,
  filter,
  forkJoin,
  from,
  map,
  merge,
  mergeMap,
  of,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  timer,
  withLatestFrom,
  catchError,
  finalize,
  scan,
} from 'rxjs';

import { isCardanoAccount } from '../../util';
import {
  CardanoActivitiesProcessingFailureId,
  CardanoUtxoFetchFailureId,
  CardanoRewardsHistoryFailureId,
  CardanoRewardAccountDetailsFailureId,
  TokenMetadataFailureId,
} from '../../value-objects';
import { findMissingActivities, mapRewardToActivity } from '../helpers';

import {
  CardanoSyncOperationType,
  createSyncOperationId,
} from './sync-operation-utils';

import type { SideEffect } from '../../contract';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';

/** Rebuild derived Cardano data without changing discovery-only SDK callers. */
export const resetWalletSync: SideEffect = (
  { cardanoContext, sync, failures },
  state,
  { actions, walletResumed$, cardanoProvider: { getTokenMetadata } },
) => {
  const activeResets = new Set<AccountId>();
  return cardanoContext.requestWalletSyncReset$.pipe(
    map((action, sequence) => ({ action, sequence })),
    withLatestFrom(
      state.wallets.selectActiveNetworkAccounts$,
      state.cardanoContext.selectWalletSyncResetBlockedReason$,
      state.tokens.selectAllRaw$,
      state.cardanoContext.selectTip$,
    ),
    mergeMap(
      ([
        {
          action: {
            payload: { accountId },
          },
          sequence,
        },
        accounts,
        blockedReason,
        tokens,
        tip,
      ]) => {
        const account = accounts.find(a => a.accountId === accountId);
        if (
          !account ||
          !isCardanoAccount(account) ||
          blockedReason(accountId) ||
          activeResets.has(accountId)
        )
          return of(
            actions.ui.showToast({
              text: 'v2.account-settings.hd-wallet-sync.toast.error',
              color: 'negative',
              leftIcon: { name: 'Warning' },
            }),
          );

        activeResets.add(accountId);
        const roundId = `${tip?.hash ?? 'no-tip'}-${sequence}`;
        const operationId = createSyncOperationId(
          accountId,
          roundId,
          CardanoSyncOperationType.WALLET_RESET,
        );
        const discoveryId = createSyncOperationId(
          accountId,
          roundId,
          CardanoSyncOperationType.ADDRESS_DISCOVERY_THOROUGH,
        );
        const pollingId = createSyncOperationId(
          accountId,
          roundId,
          CardanoSyncOperationType.TRANSACTION_POLLING,
        );
        const completed$ = sync.completeSyncOperation$.pipe(
          filter(a => a.payload.accountId === accountId),
        );
        const tokenIds = [
          ...new Set(
            tokens
              .filter(
                t =>
                  t.blockchainName === 'Cardano' && t.accountId === accountId,
              )
              .map(t => t.tokenId),
          ),
        ];
        const discovered$ = completed$.pipe(
          filter(a => a.payload.operationId === discoveryId),
          take(1),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const freshUtxos$ = discovered$.pipe(
          switchMap(() =>
            cardanoContext.setAccountUtxos$.pipe(
              filter(a => a.payload.accountId === accountId),
              take(1),
            ),
          ),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const metadata$ = freshUtxos$.pipe(
          switchMap(({ payload: { utxos } }) => {
            const ids = [
              ...new Set([
                ...tokenIds,
                ...Serializable.from(utxos).flatMap(([, output]) =>
                  [...(output.value.assets?.keys() ?? [])].map(id =>
                    TokenId(id),
                  ),
                ),
              ]),
            ];
            return (
              ids.length === 0
                ? of([])
                : forkJoin(
                    ids.map(tokenId =>
                      getTokenMetadata(
                        { tokenId },
                        { chainId: account.blockchainSpecific.chainId },
                      ).pipe(
                        map(result => {
                          if (result.isErr()) throw result.unwrapErr();
                          return { tokenId, ...result.unwrap() };
                        }),
                        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                      ),
                    ),
                  )
            ).pipe(
              map(metadatas => ({ metadatas, failed: false })),
              catchError(() => of({ metadatas: [], failed: true })),
            );
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const rewards$ = cardanoContext.setAccountRewardsHistory$.pipe(
          filter(a => a.payload.accountId === accountId),
          take(1),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const polled$ = completed$.pipe(
          filter(a => a.payload.operationId === pollingId),
          take(1),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const metadataReady$ = metadata$.pipe(filter(result => !result.failed));
        const rewardDetails$ = discovered$.pipe(
          switchMap(() =>
            cardanoContext.setRewardAccountDetails$.pipe(
              filter(a => a.payload.accountId === accountId),
              take(1),
            ),
          ),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const rebuilt$ = forkJoin([
          rewardDetails$,
          metadataReady$,
          rewards$,
          polled$,
          freshUtxos$,
        ]).pipe(
          switchMap(() =>
            combineLatest([
              state.addresses.selectAllAddresses$,
              state.activities.selectAllMap$,
              state.cardanoContext.selectTransactionHistoryGroupedByAccount$,
              state.cardanoContext.selectRewardsHistoryGroupedByAccount$,
              state.cardanoContext.selectEraSummaries$,
              state.cardanoContext.selectProtocolParameters$,
              state.activities.selectDesiredLoadedActivitiesCountPerAccount$,
              state.cardanoContext.selectChainId$,
            ]),
          ),
          filter(
            ([
              addresses,
              loadedActivities,
              history,
              rewards,
              eraSummaries,
              protocolParameters,
              desiredLoadedActivitiesCountPerAccount,
              chainId,
            ]) =>
              !history[accountId]?.length ||
              (!!eraSummaries &&
                !!protocolParameters &&
                !!chainId &&
                findMissingActivities({
                  addresses,
                  loadedActivities,
                  transactionHistoryByAccount: {
                    [accountId]: history[accountId],
                  },
                  accountRewardsHistoryByAccount: rewards,
                  chainId,
                  eraSummaries,
                  mapRewardToActivity,
                  desiredLoadedActivitiesCountPerAccount,
                }).length === 0),
          ),
          take(1),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        const failed$ = merge(
          timer(300_000).pipe(
            map(
              () =>
                'v2.account-settings.hd-wallet-sync.timeout' as TranslationKey,
            ),
          ),
          metadata$.pipe(
            filter(result => result.failed),
            map(
              () => 'sync.error.token-metadata-fetch-failed' as TranslationKey,
            ),
          ),
          sync.failSyncOperation$.pipe(
            filter(
              a =>
                a.payload.accountId === accountId &&
                (a.payload.operationId === discoveryId ||
                  a.payload.operationId === pollingId),
            ),
            map(a => a.payload.error),
          ),
          failures.addFailure$.pipe(
            filter(
              a =>
                a.payload.failureId ===
                  CardanoRewardsHistoryFailureId(accountId) ||
                a.payload.failureId === CardanoUtxoFetchFailureId(accountId) ||
                a.payload.failureId ===
                  CardanoRewardAccountDetailsFailureId(accountId) ||
                a.payload.failureId ===
                  CardanoActivitiesProcessingFailureId(accountId),
            ),
            map(a => a.payload.message),
          ),
        );
        return merge(
          metadata$.pipe(
            filter(result => !result.failed && result.metadatas.length > 0),
            mergeMap(({ metadatas }) =>
              merge(
                of(actions.tokens.upsertTokensMetadata({ metadatas })),
                from(
                  metadatas.map(({ tokenId }) =>
                    TokenMetadataFailureId(tokenId),
                  ),
                ).pipe(
                  autoDismissFailureOnSuccess(
                    state.failures.selectFailureById$,
                  ),
                ),
              ),
            ),
          ),
          merge(
            discovered$,
            rewards$,
            polled$,
            freshUtxos$,
            metadataReady$,
            rewardDetails$,
            rebuilt$,
          ).pipe(
            scan(count => count + 1, 0),
            map(count =>
              actions.sync.updateSyncOperation({
                accountId,
                operationId,
                update: {
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(count / 7),
                },
              }),
            ),
          ),
          merge(rebuilt$.pipe(map(() => undefined)), failed$).pipe(
            take(1),
            withLatestFrom(state.sync.selectSyncStatusByAccount$),
            mergeMap(([error, statuses]) =>
              error
                ? [
                    ...Object.values(
                      statuses[accountId]?.pendingSync?.operations ?? {},
                    )
                      .filter(
                        op =>
                          (op.operationId === discoveryId ||
                            op.operationId === pollingId) &&
                          (op.status === 'Pending' ||
                            op.status === 'InProgress'),
                      )
                      .map(op =>
                        actions.sync.failSyncOperation({
                          accountId,
                          operationId: op.operationId,
                          error,
                        }),
                      ),
                    actions.sync.failSyncOperation({
                      accountId,
                      operationId,
                      error,
                    }),
                    actions.cardanoContext.setWalletSyncResetResult({
                      accountId,
                      status: 'Failed',
                      error,
                    }),
                  ]
                : [
                    actions.sync.completeSyncOperation({
                      accountId,
                      operationId,
                    }),
                    actions.cardanoContext.setWalletSyncResetResult({
                      accountId,
                      status: 'Completed',
                    }),
                  ],
            ),
          ),
          discovered$.pipe(
            mergeMap(() => [
              actions.cardanoContext.refetchAccountUtxos({ accountId }),
              actions.cardanoContext.refetchRewardAccountDetails({ accountId }),
            ]),
          ),
          of(
            actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId,
                status: 'InProgress',
                type: 'Determinate',
                progress: Percent(0),
                startedAt: Timestamp.now(),
                description:
                  'sync.operation.address-discovery' as TranslationKey,
              },
            }),
            actions.cardanoContext.resetWalletSyncState({ accountId }),
            actions.activities.resetActivities({ accountId }),
            actions.activities.setHasLoadedOldestEntry({
              accountId,
              hasLoadedOldestEntry: false,
            }),
            actions.activities.setDesiredLoadedActivitiesCount({
              accountId,
              desiredLoadedActivitiesCount: ACTIVITIES_PER_PAGE,
            }),
            actions.sync.addSyncOperation({
              accountId,
              operation: {
                operationId: discoveryId,
                status: 'Pending',
                description: 'sync.operation.address-discovery',
                startedAt: Timestamp.now(),
              },
            }),
          ),
        ).pipe(
          finalize(() => activeResets.delete(accountId)),
          takeUntil(
            merge(
              walletResumed$,
              sync.clearPendingSyncsForAccounts$.pipe(
                filter(a => a.payload.accountIds.includes(accountId)),
              ),
              state.wallets.selectActiveNetworkAccounts$.pipe(
                filter(
                  current => !current.some(a => a.accountId === accountId),
                ),
              ),
              cardanoContext.setWalletSyncResetResult$.pipe(
                filter(a => a.payload.accountId === accountId),
              ),
            ),
          ),
        );
      },
    ),
  );
};
