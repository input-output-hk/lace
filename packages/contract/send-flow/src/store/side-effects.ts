import { deepEquals, isNotNil } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import {
  makeBuildTx,
  makeConfirmTx,
  makeDiscardTx,
  makePreviewTx,
  makeSubmitTx,
} from '@lace-contract/tx-executor';
import { isAccountVisibleOnNetwork } from '@lace-contract/wallet-repo';
import {
  createByBlockchainNameSelector,
  firstStateOfStatus,
} from '@lace-lib/util-store';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import {
  filter,
  from,
  map,
  merge,
  mergeMap,
  switchMap,
  take,
  of,
  withLatestFrom,
  EMPTY,
  combineLatest,
  distinctUntilChanged,
} from 'rxjs';

import {
  FEATURE_FLAG_SEND_FLOW,
  type SendFlowFeatureFlagPayload,
} from '../const';
import { validateForm as performFormValidation } from '../validate-form';

import { createFormInitialState } from './form-initial-state';

import type { SideEffect } from '../contract';
import type {
  SendFlowAddressValidator,
  BaseTokenSelector,
  SendFlowAnalyticsEnhancer,
} from '../types';
import type { AddressAliasResolver } from '@lace-contract/addresses';
import type { LaceInit } from '@lace-contract/module';
import type {
  BuildTx,
  ConfirmTx,
  DiscardTx,
  PreviewTx,
  SubmitTx,
  TokenTransfer,
  TxParams,
} from '@lace-contract/tx-executor';
import type { ByBlockchainNameSelector } from '@lace-lib/util-store';

export const syncSendFlowFeatureFlagPayload: SideEffect = (
  _,
  { features: { selectLoadedFeatures$, selectNextFeatureFlags$ } },
  { actions },
) => {
  const getPayload = (
    featureFlags: { key: string; payload?: unknown }[],
  ): SendFlowFeatureFlagPayload => {
    const sendFlowFlag = featureFlags.find(
      f => f.key === FEATURE_FLAG_SEND_FLOW,
    );

    if (!sendFlowFlag) {
      return {};
    }

    if (!sendFlowFlag.payload || typeof sendFlowFlag.payload !== 'object') {
      return {};
    }

    return sendFlowFlag.payload as SendFlowFeatureFlagPayload;
  };

  return merge(
    selectLoadedFeatures$.pipe(
      map(({ featureFlags }) => getPayload(featureFlags)),
    ),
    selectNextFeatureFlags$.pipe(
      filter(Boolean),
      map(({ features }) => getPayload(features)),
    ),
  ).pipe(
    distinctUntilChanged(deepEquals),
    map(payload => actions.sendFlowConfig.setFeatureFlagPayload(payload)),
  );
};

type MakeSendFlowPreparingParams = {
  selectBaseToken: ByBlockchainNameSelector<BaseTokenSelector>;
};

export const makeSendFlowPreparing =
  ({ selectBaseToken }: MakeSendFlowPreparingParams): SideEffect =>
  (
    _,
    {
      wallets: { selectAll$ },
      sendFlow: { selectSendFlowState$ },
      tokens: { selectTokensGroupedByAccount$ },
      network: { selectNetworkType$, selectBlockchainNetworks$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSendFlowState$, 'Preparing').pipe(
      withLatestFrom(selectAll$, selectNetworkType$, selectBlockchainNetworks$),
      switchMap(([state, wallets, networkType, blockchainNetworks]) => {
        // Get all accounts visible on the current network
        const allVisibleAccounts = wallets.flatMap(w =>
          w.accounts.filter(a =>
            isAccountVisibleOnNetwork(a, networkType, blockchainNetworks),
          ),
        );

        // Find the requested account or fall back to first visible account
        const requestedAccount = state.accountId
          ? allVisibleAccounts.find(a => a.accountId === state.accountId)
          : undefined;

        const account = requestedAccount ?? allVisibleAccounts[0];

        if (!account) {
          logger.error('No account found on the current network');
          return of(actions.sendFlow.closed());
        }

        // Find the wallet containing this account
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === account.accountId),
        );

        if (!wallet) {
          logger.error('No wallet found for account');
          return EMPTY;
        }

        if (
          state.initialSelectedToken &&
          state.initialSelectedToken.accountId !== account.accountId
        ) {
          logger.error('Initial selected token is not for the current account');
          return of(actions.sendFlow.closed());
        }

        const baseTokenSelector = selectBaseToken(account.blockchainName);

        const initialSelectedToken$ = state.initialSelectedToken
          ? of(state.initialSelectedToken)
          : selectTokensGroupedByAccount$.pipe(
              map(groupedTokens => {
                const accountData = groupedTokens[account.accountId];
                const accountTokens = accountData
                  ? [...accountData.fungible, ...accountData.nfts]
                  : [];
                const hasAnyTokens = Object.keys(groupedTokens).length > 0;
                return { accountTokens, hasAnyTokens };
              }),
              // Wait until we have tokens loaded OR account has tokens
              filter(
                ({ accountTokens, hasAnyTokens }) =>
                  accountTokens.length > 0 || hasAnyTokens,
              ),
              take(1),
              map(({ accountTokens }) => {
                if (!accountTokens.length) {
                  return null; // Account has no tokens (but tokens have loaded)
                }
                return (
                  baseTokenSelector?.selectBaseToken(accountTokens) ??
                  accountTokens[0]
                );
              }),
            );

        return initialSelectedToken$.pipe(
          map(initialSelectedToken => {
            const initialForm = createFormInitialState({
              address: state.initialAddress,
              amount: state.initialAmount,
              token: initialSelectedToken ?? undefined,
            });

            return actions.sendFlow.preparingCompleted({
              wallet,
              form: initialForm,
              blockchainName: account.blockchainName,
              accountId: account.accountId,
            });
          }),
        );
      }),
    );

export const makeSendFlowDiscard =
  ({ discardTx }: { discardTx: DiscardTx }): SideEffect =>
  (_, { sendFlow: { selectSendFlowState$ } }, { actions, logger }) =>
    firstStateOfStatus(selectSendFlowState$, 'DiscardingTx').pipe(
      switchMap(({ serializedTx, blockchainName }) =>
        discardTx({ serializedTx, blockchainName }, ({ success }) => {
          if (!success) {
            logger.error('Failed to discard send flow transaction');
          }
          return actions.sendFlow.discardingTxCompleted();
        }),
      ),
    );

type MakeSendFlowFormDataValidationParams = {
  selectAddressValidator: ByBlockchainNameSelector<SendFlowAddressValidator>;
  validateForm: typeof performFormValidation;
  addressAliasResolvers: AddressAliasResolver[];
};

export const makeSendFlowFormDataValidation =
  ({
    selectAddressValidator,
    addressAliasResolvers,
    validateForm,
  }: MakeSendFlowFormDataValidationParams): SideEffect =>
  (
    _,
    {
      sendFlow: { selectSendFlowState$ },
      network: { selectNetworkType$, selectBlockchainNetworks$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSendFlowState$, 'FormPendingValidation').pipe(
      switchMap(params => {
        const { blockchainName, blockchainSpecificData, form, minimumAmount } =
          params;
        const addressValidator = selectAddressValidator(blockchainName);
        return combineLatest([
          selectNetworkType$,
          selectBlockchainNetworks$,
        ]).pipe(
          map(
            ([networkType, blockchainNetworks]) =>
              blockchainNetworks[blockchainName]?.[networkType],
          ),
          filter(isNotNil),
          take(1),
          mergeMap(network =>
            validateForm({
              addressValidator,
              addressAliasResolvers,
              blockchainSpecificData,
              minimumAmount,
              network,
              form,
              logger,
            }),
          ),
        );
      }),
      map(result => actions.sendFlow.formValidationCompleted({ result })),
    );

export const makeSendFlowTxBuilding =
  ({
    buildTx,
    previewTx,
    preview,
  }: {
    buildTx: BuildTx;
    previewTx: PreviewTx;
    preview: boolean;
  }): SideEffect =>
  (_, { sendFlow: { selectSendFlowState$ } }, { actions }) =>
    firstStateOfStatus(
      selectSendFlowState$,
      preview ? 'Form' : 'FormTxBuilding',
    ).pipe(
      switchMap(
        ({
          accountId,
          form,
          serializedTx,
          blockchainName,
          blockchainSpecificData,
        }) => {
          const { error, resolvedAddress, value } = form.address;
          const address = error ? '' : resolvedAddress || value;
          const txBuilderParams = {
            accountId,
            blockchainName,
            serializedTx,
            txParams: [
              {
                address,
                tokenTransfers: form.tokenTransfers.map(tt => ({
                  normalizedAmount: tt.amount.value,
                  token: tt.token.value,
                })) as [TokenTransfer, ...TokenTransfer[]],
                blockchainSpecific: form.blockchainSpecific?.value,
              },
            ] as [TxParams, ...TxParams[]],
            blockchainSpecificSendFlowData: blockchainSpecificData,
          };

          return preview
            ? previewTx(txBuilderParams, result =>
                actions.sendFlow.txPreviewResulted({ result }),
              )
            : buildTx(txBuilderParams, result =>
                actions.sendFlow.txBuildResulted({ result }),
              );
        },
      ),
    );

export const makeSendFlowAwaitingConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (_, { sendFlow: { selectSendFlowState$ } }, { actions }) =>
    firstStateOfStatus(
      selectSendFlowState$,
      'SummaryAwaitingConfirmation',
    ).pipe(
      switchMap(
        ({
          serializedTx,
          wallet,
          accountId,
          blockchainName,
          blockchainSpecificData,
        }) =>
          confirmTx(
            {
              accountId,
              blockchainName,
              blockchainSpecificSendFlowData: blockchainSpecificData,
              serializedTx,
              wallet,
            },
            result =>
              actions.sendFlow.confirmationCompleted({
                result,
              }),
          ),
      ),
    );

export const makeSendFlowProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (_, { sendFlow: { selectSendFlowState$ } }, { actions }) =>
    firstStateOfStatus(selectSendFlowState$, 'Processing').pipe(
      switchMap(state =>
        submitTx(
          {
            accountId: state.accountId,
            serializedTx: state.serializedTx,
            blockchainName: state.blockchainName,
            blockchainSpecificSendFlowData: state.blockchainSpecificData,
          },
          result => result,
        ).pipe(
          mergeMap(value => {
            // Pass through txPhaseRequested action
            if (!('success' in value)) {
              return of(value);
            }

            // Handle submission result
            if (value.success) {
              const pendingActivity = {
                accountId: state.accountId,
                activityId: value.txId,
                timestamp: Timestamp(Date.now()),
                tokenBalanceChanges: state.form.tokenTransfers.map(tt => ({
                  tokenId: tt.token.value.tokenId,
                  amount: BigNumber(-BigNumber.valueOf(tt.amount.value)),
                })),
                type: ActivityType.Pending,
              };

              return from([
                actions.activities.upsertActivities({
                  accountId: state.accountId,
                  activities: [pendingActivity],
                }),
                actions.sendFlow.processingResulted({ result: value }),
              ]);
            }

            return of(actions.sendFlow.processingResulted({ result: value }));
          }),
        ),
      ),
    );

export const makeTrackSendFlowAuthenticationConfirmation =
  ({
    selectAnalyticsEnhancer,
  }: {
    selectAnalyticsEnhancer: ByBlockchainNameSelector<SendFlowAnalyticsEnhancer>;
  }): SideEffect =>
  (_, { sendFlow: { selectSendFlowState$ } }, { actions }) =>
    firstStateOfStatus(selectSendFlowState$, 'Processing').pipe(
      switchMap(state => {
        const analyticsEnhancer = selectAnalyticsEnhancer(state.blockchainName);
        if (!analyticsEnhancer) {
          return of(null);
        }
        return analyticsEnhancer.getTransactionAnalyticsPayload({
          address: state.form.address.value,
          blockchainSpecificSendFlowData: state.blockchainSpecificData,
          token: state.form.tokenTransfers[0].token.value,
        });
      }),
      map(analyticsPayload =>
        actions.analytics.trackEvent({
          eventName: 'send | transaction confirmation | confirm | press',
          ...(analyticsPayload ? { payload: analyticsPayload } : {}),
        }),
      ),
    );

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const addressAliasResolvers = await loadModules(
    'addons.loadAddressAliasResolver',
  );
  const selectAddressValidator = await createByBlockchainNameSelector(
    loadModules('addons.loadAddressValidator'),
  );
  const selectAnalyticsEnhancer = await createByBlockchainNameSelector(
    loadModules('addons.loadSendFlowAnalyticsEnhancers'),
  );
  const selectBaseToken = await createByBlockchainNameSelector(
    loadModules('addons.loadBaseToken'),
  );

  return [
    (actionObservables, stateObservables, dependencies) =>
      merge(
        ...[
          syncSendFlowFeatureFlagPayload,
          makeSendFlowPreparing({
            selectBaseToken,
          }),
          makeSendFlowDiscard({
            discardTx: makeDiscardTx(actionObservables.txExecutor),
          }),
          makeSendFlowFormDataValidation({
            addressAliasResolvers,
            selectAddressValidator,
            validateForm: performFormValidation,
          }),
          makeSendFlowTxBuilding({
            buildTx: makeBuildTx(actionObservables.txExecutor),
            previewTx: makePreviewTx(actionObservables.txExecutor),
            preview: true,
          }),
          makeSendFlowTxBuilding({
            buildTx: makeBuildTx(actionObservables.txExecutor),
            previewTx: makePreviewTx(actionObservables.txExecutor),
            preview: false,
          }),
          makeSendFlowAwaitingConfirmation({
            confirmTx: makeConfirmTx(actionObservables.txExecutor),
          }),
          makeSendFlowProcessing({
            submitTx: makeSubmitTx(actionObservables.txExecutor),
          }),
          makeTrackSendFlowAuthenticationConfirmation({
            selectAnalyticsEnhancer,
          }),
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      ),
  ];
};
