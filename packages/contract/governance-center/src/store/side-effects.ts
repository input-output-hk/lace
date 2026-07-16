import { deepEquals } from '@cardano-sdk/util';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { firstStateOfStatus, serializeError } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  merge,
  mergeMap,
  of,
  skip,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import {
  FEATURE_FLAG_GOVERNANCE_CENTER,
  parseGovernanceFeatureFlagPayload,
  promotedNetworkKeyForChainId,
} from '../const';

import type { VoteDelegationStateCalculatingFees } from './types';
import type { SideEffect } from '../contract';
import type { BuildVoteDelegationTx } from '@lace-contract/cardano-context';
import type { LaceInit } from '@lace-contract/module';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

type MakeFeeCalculationParams = {
  buildVoteDelegationTx: BuildVoteDelegationTx;
};

export const makeFeeCalculation =
  ({ buildVoteDelegationTx }: MakeFeeCalculationParams): SideEffect =>
  (
    _,
    {
      voteDelegationFlow: { selectVoteDelegationFlowState$ },
      wallets: { selectAll$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectVoteDelegationFlowState$, 'CalculatingFees').pipe(
      withLatestFrom(selectAll$),

      switchMap(
        ([state, wallets]: [
          VoteDelegationStateCalculatingFees,
          readonly AnyWallet[],
        ]) => {
          const { accountId, dRep } = state;

          const walletWithAccount = wallets.find(w =>
            w.accounts.some(a => a.accountId === accountId),
          );
          const wallet = walletWithAccount ?? wallets[0];
          const account = wallet?.accounts.find(a => a.accountId === accountId);

          if (!wallet || !account) {
            logger.error('No wallet or account found for vote delegation');
            return of(
              actions.voteDelegationFlow.feeCalculationFailed({
                errorMessage: 'No wallet or account found for vote delegation',
                errorTranslationKeys: {
                  title: 'v2.governance.delegation.error.title',
                  subtitle: 'v2.governance.delegation.error.subtitle',
                },
              }),
            );
          }

          if (account.blockchainName !== 'Cardano') {
            logger.error(
              'Vote delegation is only supported for Cardano accounts',
            );
            return of(
              actions.voteDelegationFlow.feeCalculationFailed({
                errorMessage:
                  'Vote delegation is only supported for Cardano accounts',
                errorTranslationKeys: {
                  title: 'v2.governance.delegation.error.title',
                  subtitle: 'v2.governance.delegation.error.subtitle',
                },
              }),
            );
          }

          return buildVoteDelegationTx({ accountId, dRep }).pipe(
            switchMap(result => {
              if (!result.success) {
                logger.error(
                  'Failed to build vote delegation transaction',
                  result.error,
                );
                return of(
                  actions.voteDelegationFlow.feeCalculationFailed({
                    errorMessage: result.error.message,
                    errorTranslationKeys: {
                      title: 'v2.governance.delegation.error.title',
                      subtitle: 'v2.governance.delegation.error.subtitle',
                    },
                  }),
                );
              }

              return of(
                actions.voteDelegationFlow.feeCalculationCompleted({
                  deposit: result.deposit,
                  fees: result.fees,
                  serializedTx: result.serializedTx,
                  wallet,
                }),
              );
            }),
            catchError(error => {
              logger.error(
                'Fee calculation: error building vote delegation tx',
                error,
              );
              return of(
                actions.voteDelegationFlow.feeCalculationFailed({
                  errorMessage: String(error),
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                }),
              );
            }),
          );
        },
      ),
    );

export const makeVoteDelegationAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (
    _,
    { voteDelegationFlow: { selectVoteDelegationFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(
      selectVoteDelegationFlowState$,
      'AwaitingConfirmation',
    ).pipe(
      switchMap(({ serializedTx, wallet, accountId }) =>
        confirmTx(
          {
            accountId,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
            serializedTx,
            wallet,
          },
          result =>
            actions.voteDelegationFlow.confirmationCompleted({
              result,
            }),
        ).pipe(
          catchError(error => {
            logger.error(
              'Vote delegation confirmation failed unexpectedly',
              error,
            );
            return of(
              actions.voteDelegationFlow.confirmationCompleted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              }),
            );
          }),
        ),
      ),
    );

export const makeVoteDelegationProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (
    _,
    { voteDelegationFlow: { selectVoteDelegationFlowState$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectVoteDelegationFlowState$, 'Processing').pipe(
      switchMap(state =>
        submitTx(
          {
            accountId: state.accountId,
            serializedTx: state.serializedTx,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
          },
          result => result,
        ).pipe(
          mergeMap(value => {
            if (!('success' in value)) {
              return of(value);
            }

            return of(
              actions.voteDelegationFlow.processingResulted({ result: value }),
            );
          }),
          catchError(error => {
            logger.error(
              'Vote delegation processing failed unexpectedly',
              error,
            );
            return of(
              actions.voteDelegationFlow.processingResulted({
                result: {
                  success: false,
                  error: serializeError(error),
                  errorTranslationKeys: {
                    title: 'v2.governance.delegation.error.title',
                    subtitle: 'v2.governance.delegation.error.subtitle',
                  },
                },
              }),
            );
          }),
        ),
      ),
    );

// Stale-while-revalidate: the persisted list renders immediately while every
// request refetches, so registrations/retirements are picked up per visit.
export const fetchDRepsSideEffect: SideEffect = (
  { dRepsList: { fetchDRepsRequested$ } },
  { cardanoContext: { selectChainId$ } },
  { actions, cardanoProvider, logger },
) =>
  fetchDRepsRequested$.pipe(
    withLatestFrom(selectChainId$),
    switchMap(([_, chainId]) => {
      if (!chainId) {
        logger.error('fetchDReps: chainId not available');
        return of(actions.dRepsList.fetchDRepsFailed());
      }
      return cardanoProvider.getDReps({ chainId }).pipe(
        // Unwrap before retryBackoff: getDReps folds failures into Err, so a
        // non-throwing stream would make the transparent-retry tier a no-op.
        map(result => {
          if (result.isErr()) throw result.unwrapErr();
          return result.unwrap();
        }),
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        map(dReps => actions.dRepsList.fetchDRepsSucceeded({ dReps })),
        catchError(error => {
          logger.error('fetchDReps: error fetching DReps', error);
          return of(actions.dRepsList.fetchDRepsFailed());
        }),
      );
    }),
  );

export const resetDRepsOnNetworkChange: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  { actions },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    distinctUntilChanged((a, b) => a.networkMagic === b.networkMagic),
    // The first defined chain id is app start-up, not a switch.
    skip(1),
    map(() => actions.dRepsList.resetDReps()),
  );

export const trackGovernanceDelegationConfirmed: SideEffect = (
  { voteDelegationFlow: { processingResulted$ } },
  _,
  { actions },
) =>
  processingResulted$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: payload.result.success
          ? 'governance | drep | delegation | confirmed'
          : 'governance | drep | delegation | failed',
      }),
    ),
  );

export const syncGovernanceFeatureFlagPayload: SideEffect = (
  _,
  { features: { selectLoadedFeatures$, selectNextFeatureFlags$ } },
  { actions },
) => {
  const getConfig = (featureFlags: { key: string; payload?: unknown }[]) => {
    const flag = featureFlags.find(
      f => f.key === FEATURE_FLAG_GOVERNANCE_CENTER,
    );
    return parseGovernanceFeatureFlagPayload(flag).promotedDreps ?? {};
  };

  return merge(
    selectLoadedFeatures$.pipe(
      map(({ featureFlags }) => getConfig(featureFlags)),
    ),
    selectNextFeatureFlags$.pipe(
      filter(Boolean),
      map(({ features }) => getConfig(features)),
    ),
  ).pipe(
    distinctUntilChanged(deepEquals),
    map(config => actions.promotedDReps.setConfig(config)),
  );
};

export const resolvePromotedDRepsSideEffect: SideEffect = (
  _,
  {
    cardanoContext: { selectChainId$ },
    promotedDReps: { selectPromotedConfig$ },
  },
  { actions },
) =>
  combineLatest([selectPromotedConfig$, selectChainId$]).pipe(
    map(([config, chainId]) => {
      const networkKey = chainId
        ? promotedNetworkKeyForChainId(chainId)
        : undefined;
      const promoted = (networkKey && config[networkKey]) || [];
      return actions.promotedDReps.setActivePromoted({ promoted });
    }),
  );

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const [makeBuildVoteDelegationTx] = await loadModules(
    'addons.loadVoteDelegationTxBuilder',
  );

  return [
    (actionObservables, stateObservables, dependencies) => {
      const buildVoteDelegationTx = makeBuildVoteDelegationTx(dependencies);
      return merge(
        ...[
          fetchDRepsSideEffect,
          resetDRepsOnNetworkChange,
          syncGovernanceFeatureFlagPayload,
          resolvePromotedDRepsSideEffect,
          makeFeeCalculation({ buildVoteDelegationTx }),
          makeVoteDelegationAwaitingConfirmation({
            confirmTx: makeConfirmTx(actionObservables.txExecutor),
          }),
          makeVoteDelegationProcessing({
            submitTx: makeSubmitTx(actionObservables.txExecutor),
          }),
          trackGovernanceDelegationConfirmed,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
