import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { AccountId } from '@lace-contract/wallet-repo';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
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
} from 'rxjs';

import { FEATURE_FLAG_CNIGHT_DESIGNATION } from '../../const';
import { ActivityKind } from '../../types';
import { CardanoActivitiesProcessingFailureId } from '../../value-objects';
import { createInputResolver } from '../helpers/transaction-processors';

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
  isNightDesignationEnabled: boolean;
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
    isNightDesignationEnabled,
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
        isNightDesignationEnabled,
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
 * @param {TrackAccountActivitiesParams} options - The required options for tracking account activities.
 * @param {Function} options.findMissingActivities - A function to determine the activities that need to be processed.
 * @param {Function} options.mapTransactionToActivity - A function to map transaction details into activity objects.
 * @param {number} options.debounceTimeout - The debounce time (in milliseconds) before processing the activity updates.
 *
 * @returns {SideEffect} A side effect that listens for state changes, processes account activities, and dispatches updates.
 */
export const createTrackAccountActivities =
  ({
    findMissingActivities,
    mapTransactionToActivity,
    mapRewardToActivity,
    debounceTimeout,
  }: TrackAccountActivitiesParams): SideEffect =>
  (
    _,
    {
      activities,
      addresses,
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
    ]).pipe(
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
          if (protocolParameters === undefined || eraSummaries === undefined)
            return EMPTY;

          const isNightDesignationEnabled = loadedFeatures.featureFlags.some(
            f => f.key === FEATURE_FLAG_CNIGHT_DESIGNATION,
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
            isNightDesignationEnabled,
          };

          return from(activitiesToLoad).pipe(
            concatMap(data => {
              if (data.kind === ActivityKind.Transaction) {
                return processTransaction(data, processTransactionDeps);
              }
              return processReward(data, actions);
            }),
          );
        },
      ),
    );
