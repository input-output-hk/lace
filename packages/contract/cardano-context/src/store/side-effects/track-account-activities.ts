import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  combineLatest,
  concatMap,
  debounceTime,
  EMPTY,
  filter,
  firstValueFrom,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';
import { resultMergeMap } from 'ts-results-es/rxjs-operators';

import { ActivityKind } from '../../types';

import type { Action, SideEffect } from '../../contract';
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
import type { Result } from '@lace-sdk/util';
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
};

const processTransaction = (
  data: Extract<MissingActivityData, { kind: ActivityKind.Transaction }>,
  deps: ProcessTransactionDeps,
): Observable<Action> => {
  const { txId, accountId, rewardAccount, accountAddresses } = data;
  const {
    getTransactionDetails,
    chainId,
    resolveInput,
    mapTransactionToActivity,
    protocolParameters,
    logger,
    actions,
  } = deps;

  return getTransactionDetails(txId, {
    chainId,
  }).pipe(
    resultMergeMap(txDetails =>
      mapTransactionToActivity({
        accountId,
        txDetails,
        accountAddresses,
        rewardAccount,
        protocolParameters,
        logger,
        resolveInput: async txIn =>
          firstValueFrom(
            resolveInput(txIn, { chainId }).pipe(
              // TODO: handle input resolver errors?
              map(result => result.unwrapOr(null)),
            ),
          ),
      }),
    ),
    map(accountActivityResult =>
      accountActivityResult.mapOrElse<Action>(
        error =>
          actions.activities.getActivitiesFailed({
            accountId: AccountId(accountId),
            failure:
              error instanceof ProviderError
                ? error.reason
                : ProviderFailure.Unknown,
          }),
        activity =>
          actions.activities.upsertActivities({
            accountId: AccountId(accountId),
            activities: [activity],
          }),
      ),
    ),
  );
};

const processReward = (
  data: Extract<MissingActivityData, { kind: ActivityKind.Reward }>,
  actions: SideEffectDeps['actions'],
): Observable<Action> => {
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
    { activities, addresses, cardanoContext },
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
        ]) => {
          // only proceed if we have protocol parameters
          if (protocolParameters === undefined || eraSummaries === undefined)
            return EMPTY;

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
