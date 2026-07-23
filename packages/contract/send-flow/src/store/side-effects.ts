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
import { BigNumber, Timestamp } from '@lace-lib/util';
import {
  createByBlockchainNameSelector,
  dropStaleResult,
  firstStateOfStatus,
  isStatus,
} from '@lace-lib/util-store';
import {
  filter,
  from,
  map,
  merge,
  mergeMap,
  startWith,
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
import {
  bucketUsdValue,
  classifyAssetMix,
  classifyTransferType,
  computeTransferValueUsd,
  countNfts,
} from './transfer-classification';

import type { SideEffect } from '../contract';
import type {
  SendFlowAddressValidator,
  BaseTokenSelector,
  ChainMinimumAmountTokenValidator,
  SendFlowAnalyticsEnhancer,
  RecipientSource,
  SendFlowSliceState,
} from '../types';
import type { AddressAliasResolver } from '@lace-contract/addresses';
import type { LaceInit } from '@lace-contract/module';
import type { NetworkType } from '@lace-contract/network';
import type { TokenIdMapper } from '@lace-contract/token-pricing';
import type {
  BuildTx,
  ConfirmTx,
  DiscardTx,
  PreviewTx,
  SubmitTx,
  TokenTransfer,
  TxParams,
} from '@lace-contract/tx-executor';
import type { ByBlockchainNameSelector, JsonType } from '@lace-lib/util-store';

type SendFlowStatus = SendFlowSliceState['status'];

// For each side-effect, the states in which its async RESULT event is handled by the
// machine — i.e. the handler keys in `state-machine.ts`. A result that arrives while
// the machine is outside these states is stale (see `dropStaleResult`). Keep these in
// sync with the state machine's handlers.
const PREPARING_STATES = new Set<SendFlowStatus>(['Preparing']);
const FORM_PENDING_VALIDATION_STATES = new Set<SendFlowStatus>([
  'FormPendingValidation',
]);
const EDITING_STATES = new Set<SendFlowStatus>([
  'Form',
  'FormPendingValidation',
  'FormTxBuilding',
]);
const AWAITING_CONFIRMATION_STATES = new Set<SendFlowStatus>([
  'SummaryAwaitingConfirmation',
]);
const PROCESSING_STATES = new Set<SendFlowStatus>(['Processing']);
const DISCARDING_STATES = new Set<SendFlowStatus>(['DiscardingTx']);

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
          dropStaleResult(
            selectSendFlowState$,
            actions.sendFlow.preparingCompleted.match,
            PREPARING_STATES,
          ),
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
        }).pipe(
          dropStaleResult(
            selectSendFlowState$,
            actions.sendFlow.discardingTxCompleted.match,
            DISCARDING_STATES,
          ),
        ),
      ),
    );

type MakeSendFlowFormDataValidationParams = {
  selectAddressValidator: ByBlockchainNameSelector<SendFlowAddressValidator>;
  selectChainMinimumAmountTokenValidator: ByBlockchainNameSelector<ChainMinimumAmountTokenValidator>;
  validateForm: typeof performFormValidation;
  addressAliasResolvers: AddressAliasResolver[];
};

export const makeSendFlowFormDataValidation =
  ({
    selectAddressValidator,
    selectChainMinimumAmountTokenValidator,
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
    selectSendFlowState$.pipe(
      filter(state => isStatus(state, 'FormPendingValidation')),
      // The form can change while validation is in flight (formDataChanged is
      // handled in FormPendingValidation); every transition produces a fresh
      // state object, so a reference check re-triggers validation for the
      // latest form while switchMap cancels the stale one
      distinctUntilChanged(),
      switchMap(params => {
        const { blockchainName, blockchainSpecificData, form, minimumAmount } =
          params;
        const addressValidator = selectAddressValidator(blockchainName);
        const chainMinimumAmountTokenValidator =
          selectChainMinimumAmountTokenValidator(blockchainName);
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
              chainMinimumAmountTokenValidator,
              minimumAmount,
              network,
              form,
              logger,
            }),
          ),
        );
      }),
      map(result => actions.sendFlow.formValidationCompleted({ result })),
      dropStaleResult(
        selectSendFlowState$,
        actions.sendFlow.formValidationCompleted.match,
        FORM_PENDING_VALIDATION_STATES,
      ),
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
              ).pipe(
                dropStaleResult(
                  selectSendFlowState$,
                  actions.sendFlow.txPreviewResulted.match,
                  EDITING_STATES,
                ),
              )
            : buildTx(txBuilderParams, result =>
                actions.sendFlow.txBuildResulted({ result }),
              ).pipe(
                dropStaleResult(
                  selectSendFlowState$,
                  actions.sendFlow.txBuildResulted.match,
                  EDITING_STATES,
                ),
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
          ).pipe(
            dropStaleResult(
              selectSendFlowState$,
              actions.sendFlow.confirmationCompleted.match,
              AWAITING_CONFIRMATION_STATES,
            ),
          ),
      ),
    );

export const makeSendFlowProcessing =
  ({
    submitTx,
    selectTokenIdMapper,
  }: {
    submitTx: SubmitTx;
    selectTokenIdMapper: ByBlockchainNameSelector<TokenIdMapper>;
  }): SideEffect =>
  (
    _,
    {
      sendFlow: { selectSendFlowState$ },
      sendFlowAnalytics: { selectRecipientSource$ },
      tokenPricing: { selectPrices$ },
      addresses: { selectAllAddresses$ },
      wallets: { selectAll$: selectAllWallets$ },
      network: { selectNetworkType$ },
    },
    { actions },
  ) =>
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
          withLatestFrom(
            // startWith ensures withLatestFrom never silently drops the
            // submitTx result when a Redux selector hasn't emitted yet.
            // The defaults match each slice's initialState, so analytics
            // degrades gracefully (e.g. transferValue='UNKNOWN') rather
            // than blocking the tx-critical processingResulted dispatch.
            selectPrices$.pipe(startWith({})),
            selectAllAddresses$.pipe(startWith([])),
            selectAllWallets$.pipe(startWith([])),
            selectNetworkType$,
            selectRecipientSource$,
          ),
          mergeMap(
            ([
              value,
              prices,
              addresses,
              wallets,
              networkType,
              recipientSource,
            ]) => {
              // Pass through txPhaseRequested action
              if (!('success' in value)) {
                return of(value);
              }

              const transfers = state.form.tokenTransfers.map(tt => ({
                amount: tt.amount.value,
                token: tt.token.value,
              }));

              const failureNftCount = countNfts(transfers);
              const failureAssetMix = classifyAssetMix(transfers);
              const analyticsAction = value.success
                ? actions.analytics.trackEvent({
                    eventName: 'send | transaction | success',
                    payload: buildSuccessAnalyticsPayload({
                      blockchainName: state.blockchainName,
                      networkType,
                      transfers,
                      recipientAddress: state.form.address.value,
                      recipientSource,
                      sourceAccountId: state.accountId,
                      mapper:
                        selectTokenIdMapper(state.blockchainName) ?? undefined,
                      prices,
                      addresses,
                      wallets,
                    }),
                  })
                : actions.analytics.trackEvent({
                    eventName: 'send | transaction | failure',
                    payload: {
                      blockchain: state.blockchainName,
                      networkType,
                      transferCount: transfers.length,
                      nftCount: failureNftCount,
                      fungibleCount: transfers.length - failureNftCount,
                      ...(failureAssetMix && { assetMix: failureAssetMix }),
                      errorCode: value.errorTranslationKeys.title,
                      ...(recipientSource && { recipientSource }),
                    },
                  });

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
                  ...(value.blockchainSpecificActivityMetadata !== undefined
                    ? {
                        blockchainSpecific:
                          value.blockchainSpecificActivityMetadata,
                      }
                    : {}),
                };

                return from([
                  analyticsAction,
                  actions.activities.upsertActivities({
                    accountId: state.accountId,
                    activities: [pendingActivity],
                  }),
                  actions.sendFlow.processingResulted({ result: value }),
                ]);
              }

              return from([
                analyticsAction,
                actions.sendFlow.processingResulted({ result: value }),
              ]);
            },
          ),
        ),
      ),
      // The analytics/activity actions are valid regardless of flow state; only the
      // state-machine `processingResulted` transition is dropped if the flow has been
      // abandoned (e.g. closed) before submit resolves.
      dropStaleResult(
        selectSendFlowState$,
        actions.sendFlow.processingResulted.match,
        PROCESSING_STATES,
      ),
    );

const buildSuccessAnalyticsPayload = ({
  blockchainName,
  networkType,
  transfers,
  recipientAddress,
  recipientSource,
  sourceAccountId,
  mapper,
  prices,
  addresses,
  wallets,
}: {
  blockchainName: string;
  networkType: NetworkType;
  transfers: Parameters<typeof computeTransferValueUsd>[0]['transfers'];
  recipientAddress: string;
  recipientSource: RecipientSource | undefined;
  sourceAccountId: Parameters<
    typeof classifyTransferType
  >[0]['sourceAccountId'];
  mapper: TokenIdMapper | undefined;
  prices: Parameters<typeof computeTransferValueUsd>[0]['prices'];
  addresses: Parameters<typeof classifyTransferType>[0]['addresses'];
  wallets: Parameters<typeof classifyTransferType>[0]['wallets'];
}) => {
  const transferType = classifyTransferType({
    recipientAddress,
    sourceAccountId,
    addresses,
    wallets,
  });

  // Asset-mix counts are tracked unconditionally — they tell us *what* the
  // user sent (NFT, fungible, mixed) and answer questions independent of
  // network or transferType (e.g. "how often do users send NFTs?").
  //
  // transferValue is only meaningful when
  //   (1) the user is on mainnet — testnet tokens have no real-world USD value, and
  //   (2) value is actually leaving the user's control (transferType === 'foreign').
  // The dashboard can filter on transferType + networkType to scope value-based
  // questions accordingly.
  //
  // Midnight: no loadTokenIdMapper is registered yet → mapper is undefined →
  // computeTransferValueUsd returns undefined → transferValue: 'UNKNOWN'.
  const nftCount = countNfts(transfers);
  const assetMix = classifyAssetMix(transfers);
  const base: Record<string, JsonType> = {
    blockchain: blockchainName,
    networkType,
    transferCount: transfers.length,
    transferType,
    nftCount,
    fungibleCount: transfers.length - nftCount,
    ...(assetMix && { assetMix }),
    ...(recipientSource && { recipientSource }),
  };
  if (networkType !== 'mainnet' || transferType !== 'foreign') return base;

  const usd = computeTransferValueUsd({
    transfers,
    prices,
    mapper,
  });
  base.transferValue = usd === undefined ? 'UNKNOWN' : bucketUsdValue(usd);
  return base;
};

/**
 * Clears any leftover recipient source from a previous send session whenever
 * a new send flow is opened. Without this, a user who opened send via the
 * dapp connector (`'navigation'`), abandoned, then reopened from the home tab
 * would still carry the stale source on the next success/failure event.
 */
export const clearRecipientSourceOnOpen: SideEffect = (
  { sendFlow: { openRequested$ } },
  _,
  { actions },
) =>
  openRequested$.pipe(
    map(() => actions.sendFlowAnalytics.recipientSourceCleared()),
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
  const selectChainMinimumAmountTokenValidator =
    await createByBlockchainNameSelector(
      loadModules('addons.loadChainMinimumAmountTokenValidator'),
    );
  const selectTokenIdMapper = await createByBlockchainNameSelector(
    loadModules('addons.loadTokenIdMapper'),
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
            selectChainMinimumAmountTokenValidator,
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
            selectTokenIdMapper,
          }),
          clearRecipientSourceOnOpen,
          makeTrackSendFlowAuthenticationConfirmation({
            selectAnalyticsEnhancer,
          }),
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      ),
  ];
};
