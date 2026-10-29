import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { AccountId } from '@lace-contract/wallet-repo';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import isEqual from 'lodash/isEqual';
import {
  catchError,
  combineLatest,
  concatMap,
  debounceTime,
  EMPTY,
  filter,
  from,
  map,
  merge as rxMerge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
  ignoreElements,
  distinctUntilChanged,
  scan,
  startWith,
} from 'rxjs';

import { isExtensionActivityFeatureEnabled } from '../../extensions';
import { ActivityKind } from '../../types';
import { isCardanoAccount } from '../../util';
import { CardanoActivitiesProcessingFailureId } from '../../value-objects';
import { createInputResolver } from '../helpers/transaction-processors';

import { retryAfterWalletResetFailure } from './retry-after-wallet-reset-failure';

import type { CardanoContextAction, SideEffect } from '../../contract';
import type {
  CardanoRewardActivity,
  RequiredProtocolParameters,
} from '../../types';
import type {
  FindMissingActivitiesParams,
  MapTransactionToActivityParams,
  MissingActivityData,
} from '../helpers';
import type { MapRewardToActivityParams } from '../helpers/map-reward-to-activity';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

type TrackAccountActivitiesParams = {
  findMissingActivities: (
    params: FindMissingActivitiesParams,
  ) => MissingActivityData[];
  mapTransactionToActivity: (
    params: MapTransactionToActivityParams,
  ) => Observable<Result<Activity, Error>>;
  mapRewardToActivity: (
    params: MapRewardToActivityParams,
  ) => CardanoRewardActivity;
  debounceTimeout: number;
};

type SideEffectDeps = Parameters<SideEffect>[2];

type ProcessTransactionDeps = {
  actions: SideEffectDeps['actions'];
  logger: SideEffectDeps['logger'];
  getTransactionDetails: SideEffectDeps['cardanoProvider']['getTransactionDetails'];
  resolveInput: SideEffectDeps['cardanoProvider']['resolveInput'];
  mapTransactionToActivity: (
    params: MapTransactionToActivityParams,
  ) => Observable<Result<Activity, Error>>;
  protocolParameters: RequiredProtocolParameters;
  chainId: Cardano.ChainId;
  selectFailureById$: Observable<(id: FailureId) => Failure | undefined>;
  isExtensionActivityEnabled: boolean;
};

const processTransaction = (
  data: Extract<MissingActivityData, { kind: ActivityKind.Transaction }>,
  deps: ProcessTransactionDeps,
): Observable<CardanoContextAction> => {
  const { txId, accountId, rewardAccount, accountAddresses } = data;
  const {
    getTransactionDetails,
    chainId,
    resolveInput,
    mapTransactionToActivity,
    protocolParameters,
    logger,
    actions,
    selectFailureById$,
    isExtensionActivityEnabled,
  } = deps;

  const failureId = CardanoActivitiesProcessingFailureId(AccountId(accountId));

  return getTransactionDetails(txId, { chainId }).pipe(
    map(result => {
      if (result.isErr()) throw result.unwrapErr();
      return result.unwrap();
    }),
    retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    mergeMap(txDetails =>
      mapTransactionToActivity({
        accountId,
        txDetails,
        accountAddresses,
        rewardAccount,
        protocolParameters,
        logger,
        resolveInput: createInputResolver(resolveInput, chainId).resolveInput,
        isExtensionActivityEnabled,
      }).pipe(
        map(result => {
          if (result.isErr()) throw result.unwrapErr();
          return result.unwrap();
        }),
      ),
    ),
    mergeMap(activity =>
      rxMerge(
        of(
          actions.activities.upsertActivities({
            accountId: AccountId(accountId),
            activities: [activity],
          }),
        ),
        of(failureId).pipe(autoDismissFailureOnSuccess(selectFailureById$)),
      ),
    ),
    catchError(() =>
      of(
        actions.failures.addFailure({
          failureId,
          message:
            'sync.error.cardano-activities-processing-failed' as TranslationKey,
        }),
      ),
    ),
  );
};

const processReward = (
  data: Extract<MissingActivityData, { kind: ActivityKind.Reward }>,
  actions: SideEffectDeps['actions'],
): Observable<CardanoContextAction> => {
  const { accountId, rewardActivity } = data;
  return of(
    actions.activities.upsertActivities({
      accountId: AccountId(accountId),
      activities: [rewardActivity],
    }),
  );
};

/**
 * Creates a side effect for tracking account activities and updating the activity state
 * based on transactions and rewards fetched from a Cardano blockchain provider.
 *
 * @param options - The required options for tracking account activities.
 *   - `findMissingActivities`: A function to determine the activities that need to be processed.
 *   - `mapTransactionToActivity`: A function to map transaction details into activity objects.
 *   - `debounceTimeout`: The debounce time (in milliseconds) before processing the activity updates.
 *
 * @returns A side effect that listens for state changes, processes account activities, and dispatches updates.
 */
export const createTrackAccountActivities =
  ({
    findMissingActivities,
    mapTransactionToActivity,
    mapRewardToActivity,
    debounceTimeout,
  }: TrackAccountActivitiesParams): SideEffect =>
  (
    actionObservables,
    {
      activities,
      addresses,
      wallets,
      cardanoContext,
      failures: { selectFailureById$ },
      features: { selectLoadedFeatures$ },
    },
    {
      cardanoProvider: { getTransactionDetails, resolveInput },
      logger,
      actions,
    },
  ) =>
    wallets.selectActiveNetworkAccounts$.pipe(
      switchMap(accounts =>
        rxMerge(
          ...accounts.filter(isCardanoAccount).map(({ accountId }) =>
            combineLatest([
              addresses.selectAllAddresses$,
              activities.selectAllMap$,
              cardanoContext.selectChainId$.pipe(filter(Boolean)),
              activities.selectDesiredLoadedActivitiesCountPerAccount$,
              cardanoContext.selectProtocolParameters$,
              cardanoContext.selectEraSummaries$,
              cardanoContext.selectTransactionHistoryGroupedByAccount$,
              cardanoContext.selectRewardsHistoryGroupedByAccount$,
              selectLoadedFeatures$,
              rxMerge(
                retryAfterWalletResetFailure(accountId, actionObservables),
                actionObservables.sync.clearPendingSyncsForAccounts$.pipe(
                  filter(a => a.payload.accountIds.includes(accountId)),
                ),
              ).pipe(
                scan(generation => generation + 1, 0),
                startWith(0),
              ),
            ]).pipe(
              map(
                ([
                  addresses,
                  loaded,
                  chainId,
                  desired,
                  protocol,
                  eras,
                  history,
                  rewards,
                  features,
                  generation,
                ]) =>
                  [
                    addresses.filter(
                      address => address.accountId === accountId,
                    ),
                    { [accountId]: loaded[accountId] ?? [] },
                    chainId,
                    { [accountId]: desired[accountId] ?? ACTIVITIES_PER_PAGE },
                    protocol,
                    eras,
                    { [accountId]: history[accountId] ?? [] },
                    { [accountId]: rewards[accountId] ?? [] },
                    features,
                    generation,
                  ] as const,
              ),
              distinctUntilChanged((previous, current) =>
                isEqual(previous, current),
              ),
              debounceTime(debounceTimeout),
              switchMap(
                ([
                  addresses,
                  loadedActivities,
                  chainId,
                  desiredLoadedActivitiesCountPerAccount,
                  protocolParameters,
                  eraSummaries,
                  transactionHistoryByAccount,
                  accountRewardsHistoryByAccount,
                  loadedFeatures,
                ]) => {
                  // only proceed if we have protocol parameters
                  if (
                    protocolParameters === undefined ||
                    eraSummaries === undefined
                  )
                    return EMPTY;

                  const isExtensionActivityEnabled =
                    isExtensionActivityFeatureEnabled(
                      loadedFeatures.featureFlags,
                    );

                  const activitiesToLoad = findMissingActivities({
                    addresses,
                    transactionHistoryByAccount,
                    accountRewardsHistoryByAccount,
                    loadedActivities,
                    chainId,
                    eraSummaries,
                    mapRewardToActivity,
                    desiredLoadedActivitiesCountPerAccount,
                  });

                  const processTransactionDeps: ProcessTransactionDeps = {
                    actions,
                    logger,
                    getTransactionDetails,
                    resolveInput,
                    mapTransactionToActivity,
                    protocolParameters,
                    chainId,
                    selectFailureById$,
                    isExtensionActivityEnabled,
                  };

                  const reset$ = rxMerge(
                    actionObservables.sync.clearPendingSyncsForAccounts$.pipe(
                      mergeMap(a =>
                        a.payload.accountIds.map(id => ({
                          payload: { accountId: id },
                        })),
                      ),
                    ),
                    actionObservables.cardanoContext.resetWalletSyncState$,
                    actionObservables.cardanoContext.setWalletSyncResetResult$.pipe(
                      filter(a => a.payload.status === 'Failed'),
                    ),
                  );
                  const cancelledAccounts = new Set<AccountId>();
                  return rxMerge(
                    reset$.pipe(
                      tap(({ payload: { accountId } }) =>
                        cancelledAccounts.add(accountId),
                      ),
                      ignoreElements(),
                    ),
                    from(
                      activitiesToLoad.filter(
                        data => data.accountId === accountId,
                      ),
                    ).pipe(
                      concatMap(data => {
                        if (cancelledAccounts.has(data.accountId)) return EMPTY;
                        return (
                          data.kind === ActivityKind.Transaction
                            ? processTransaction(data, processTransactionDeps)
                            : processReward(data, actions)
                        ).pipe(
                          takeUntil(
                            reset$.pipe(
                              filter(
                                action =>
                                  action.payload.accountId === data.accountId,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
