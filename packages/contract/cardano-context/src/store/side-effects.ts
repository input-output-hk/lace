import { Cardano } from '@cardano-sdk/core';
import { Err, Milliseconds, Ok } from '@lace-sdk/util';
import {
  bufferTime,
  distinct,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  groupBy,
  interval,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

import {
  cardanoAccountUnspendableUtxos$,
  cardanoAccountUtxos$,
  cardanoAddresses$,
  cardanoChainId$,
  cardanoNetworkMagic$,
  cardanoProtocolParameters$,
  cardanoRewardAccountDetails$,
} from '../cardano-observables';
import { isCardanoAddress } from '../util';
import { CardanoNetworkId, CardanoTxId } from '../value-objects';

import {
  findMissingActivities,
  mapRewardToActivity,
  mapTransactionToActivity,
} from './helpers';
import {
  fetchAddressTransactionHistories,
  fetchNewAddressTransactionHistories,
} from './helpers/fetch-address-transaction-histories';
import { addressDiscoverySync } from './side-effects/address-discovery-sync';
import { coordinateCardanoSync } from './side-effects/coordinate-sync';
import { findMissingTokensMetadataForActivities } from './side-effects/find-missing-tokens-metadata-for-activities';
import { loadTokensMetadata } from './side-effects/load-tokens-metadata';
import { syncLovelaceTokenTickerWithChain } from './side-effects/sync-lovelace-token-ticker-with-chain';
import { syncUnspendableUtxosWithAccountUtxos } from './side-effects/sync-unspendable-utxos-with-account-utxos';
import { createTrackAccountActivities } from './side-effects/track-account-activities';
import { trackAccountDelegationActivities } from './side-effects/track-account-delegation-activities';
import { createTrackAccountRewardsHistory } from './side-effects/track-account-reward-history';
import { trackAccountTokens } from './side-effects/track-account-tokens';
import {
  createTrackNewerAccountTransactionHistory,
  createTrackOlderAccountTransactionHistory,
} from './side-effects/track-account-transaction-history';
import { trackAccountTransactionsTotal } from './side-effects/track-account-transactions-total';
import { trackAccountUtxos } from './side-effects/track-account-utxos';
import { trackRewardAccountDetails } from './side-effects/track-reward-account-details';
import { trackSyncRoundFailures } from './side-effects/track-sync-round-failures';
import { createTrackTransactionDetails } from './side-effects/track-transaction-details';

import type { Action, SideEffect } from '../contract';
import type { CardanoTokenMetadata } from '../types';
import type { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import type { AppConfig } from '@lace-contract/module';
import type {
  RawToken,
  StoredTokenMetadata,
  TokenId,
  TokenMetadata,
} from '@lace-contract/tokens';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

const UPDATE_METADATA_BUFFER_TIME = Milliseconds(200);
const TRACK_ACCOUNT_ACTIVITIES_DEBOUNCE_TIME = Milliseconds(2000);

const getTipResultKey = (
  getTipResult: Result<Cardano.PartialBlockHeader, ProviderError<unknown>>,
) =>
  getTipResult.mapOrElse<Cardano.BlockId | ProviderFailure>(
    error => error.reason,
    tip => tip.hash,
  );

export const trackTip: (tipPollFrequency: Milliseconds) => SideEffect =
  tipPollFrequency =>
  (
    _,
    { cardanoContext: { selectChainId$ } },
    { actions, cardanoProvider: { getTip } },
  ) =>
    selectChainId$.pipe(
      filter(Boolean),
      switchMap(chainId =>
        merge(of(void 0), interval(tipPollFrequency)).pipe(
          exhaustMap(() => getTip({ chainId })),
          distinctUntilChanged(
            (a, b) => getTipResultKey(a) === getTipResultKey(b),
          ),
          map(getTipResult =>
            getTipResult.mapOrElse<Action>(
              // TODO: LW-12636 wallet data is potentially stale when this action is dispatched
              error =>
                actions.cardanoContext.getTipFailed({
                  failure: error.reason,
                  chainId,
                }),
              tip =>
                actions.cardanoContext.setTip({
                  network: CardanoNetworkId(chainId.networkMagic),
                  tip,
                }),
            ),
          ),
        ),
      ),
    );

/**
 * @returns Observable that emits deduplicated ids of tokens which do not have metadata
 */
const distinctWithoutMetadata =
  (metadata$: Observable<Partial<Record<TokenId, StoredTokenMetadata>>>) =>
  (source$: Observable<RawToken[]>) =>
    source$.pipe(
      mergeMap(tokens => tokens),
      filter(token => token.blockchainName === 'Cardano'),
      withLatestFrom(metadata$),
      // TODO: LW-12633 update the metadata more than once
      filter(([token, existingMetadata]) => !existingMetadata[token.tokenId]),
      map(([{ tokenId }]) => tokenId),
      distinct(),
    );

export const trackTokenMetadata =
  (batchInterval: Milliseconds): SideEffect =>
  (
    _,
    {
      tokens: { selectAllRaw$, selectTokensMetadata$ },
      cardanoContext: { selectChainId$ },
    },
    { actions, cardanoProvider: { getTokenMetadata } },
  ) =>
    selectAllRaw$.pipe(
      distinctWithoutMetadata(selectTokensMetadata$),
      withLatestFrom(selectChainId$.pipe(filter(Boolean))),
      mergeMap(([tokenId, chainId]) =>
        getTokenMetadata({ tokenId }, { chainId }).pipe(
          map(getTokenMetadataResult =>
            getTokenMetadataResult.mapOrElse<
              Result<
                {
                  tokenId: TokenId;
                  metadata: TokenMetadata<CardanoTokenMetadata>;
                },
                { tokenId: TokenId; error: ProviderError }
              >
            >(
              error => Err({ tokenId, error }),
              metadata => Ok({ tokenId, metadata }),
            ),
          ),
        ),
      ),
      groupBy(getTokenMetadataResult => getTokenMetadataResult.isOk()),
      mergeMap(group$ =>
        group$.key
          ? group$.pipe(
              // update tokens metadata in batches every 200ms
              // PERF: this may be done more efficiently to open the buffer only upon emission -
              // like a debounce but collecting all values
              bufferTime(batchInterval),
              mergeMap(getTokenMetadataOkResults => {
                if (getTokenMetadataOkResults.length === 0) return EMPTY;
                return of(
                  actions.tokens.upsertTokensMetadata({
                    metadatas: getTokenMetadataOkResults.map(
                      getTokenMetadataResult => {
                        const { metadata, tokenId } =
                          getTokenMetadataResult.unwrap();
                        return {
                          tokenId,
                          ...metadata,
                        };
                      },
                    ),
                  }),
                );
              }),
            )
          : // dispatch errors right away
            group$.pipe(
              map(getTokenMetadataErrorResult => {
                const { error, tokenId } =
                  getTokenMetadataErrorResult.unwrapErr();
                // TODO: LW-12636 might want to display something to the user
                // and implement some logic to attempt to re-fetch token metadata again
                return actions.cardanoContext.getTokenMetadataFailed({
                  tokenId,
                  failure: error.reason,
                });
              }),
            ),
      ),
    );

/**
 * Side effect that tracks the protocol parameters based on the chainId
 */
export const trackProtocolParameters: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  { actions, cardanoProvider: { getProtocolParameters } },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    switchMap(chainId =>
      getProtocolParameters({ chainId }).pipe(
        map(getProtocolParametersResult =>
          getProtocolParametersResult.mapOrElse<Action>(
            error =>
              actions.cardanoContext.getProtocolParametersFailed({
                chainId,
                failure: error.reason,
              }),
            protocolParameters =>
              actions.cardanoContext.setProtocolParameters({
                network: CardanoNetworkId(chainId.networkMagic),
                protocolParameters,
              }),
          ),
        ),
      ),
    ),
  );

/**
 * Side effect that wires protocolParameters selector to the observable
 */
export const wireProtocolParametersObservable: SideEffect = (
  _,
  { cardanoContext: { selectProtocolParameters$ } },
  _dependencies,
) =>
  selectProtocolParameters$.pipe(
    distinctUntilChanged(),
    tap(protocolParameters => {
      cardanoProtocolParameters$.next(protocolParameters);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires chainId selector to the networkMagic observable
 */
export const wireNetworkMagicObservable: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  _dependencies,
) =>
  selectChainId$.pipe(
    filter(Boolean),
    distinctUntilChanged(),
    tap(chainId => {
      cardanoNetworkMagic$.next(chainId.networkMagic);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires accountUtxos selector to the observable
 */
export const wireAccountUtxosObservable: SideEffect = (
  _,
  { cardanoContext: { selectAccountUtxos$ } },
  _dependencies,
) =>
  selectAccountUtxos$.pipe(
    distinctUntilChanged(),
    tap(accountUtxos => {
      cardanoAccountUtxos$.next(accountUtxos);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires unspendable accountUtxos selector to the observable
 */
export const wireAccountUnspendableUtxosObservable: SideEffect = (
  _,
  { cardanoContext: { selectAccountUnspendableUtxos$ } },
  _dependencies,
) =>
  selectAccountUnspendableUtxos$.pipe(
    distinctUntilChanged(),
    tap(selectAccountUnspendableUtxos => {
      cardanoAccountUnspendableUtxos$.next(selectAccountUnspendableUtxos);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires addresses selector to the cardanoAddresses observable
 */
export const wireCardanoAddressesObservable: SideEffect = (
  _,
  { addresses: { selectAllAddresses$ } },
  _dependencies,
) =>
  selectAllAddresses$.pipe(
    map(addresses => addresses.filter(isCardanoAddress)),
    distinctUntilChanged(),
    tap(cardanoAddresses => {
      cardanoAddresses$.next(cardanoAddresses);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires chainId selector to the cardanoChainId observable
 */
export const wireCardanoChainIdObservable: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  _dependencies,
) =>
  selectChainId$.pipe(
    filter(Boolean),
    distinctUntilChanged(),
    tap(chainId => {
      cardanoChainId$.next(chainId);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that wires rewardAccountDetails selector to the observable
 */
export const wireRewardAccountDetailsObservable: SideEffect = (
  _,
  { cardanoContext: { selectRewardAccountDetails$ } },
  _dependencies,
) =>
  selectRewardAccountDetails$.pipe(
    distinctUntilChanged(),
    tap(rewardAccountDetails => {
      cardanoRewardAccountDetails$.next(rewardAccountDetails);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Side effect that tracks era summaries based on the chainId
 */
export const trackEraSummaries: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ } },
  { actions, cardanoProvider: { getEraSummaries } },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    switchMap(chainId =>
      getEraSummaries({ chainId }).pipe(
        map(eraSummariesResult =>
          eraSummariesResult.mapOrElse<Action>(
            error =>
              actions.cardanoContext.getEraSummariesFailed({
                chainId,
                failure: error.reason,
              }),
            eraSummaries =>
              actions.cardanoContext.setEraSummaries({
                eraSummaries,
                network: CardanoNetworkId(chainId.networkMagic),
              }),
          ),
        ),
      ),
    ),
  );

export const createRegisterCardanoBlockchainNetworks =
  (defaultTestnetChainId: Cardano.ChainId): SideEffect =>
  (_, { network: { selectBlockchainNetworks$ } }, { actions }) =>
    selectBlockchainNetworks$.pipe(
      take(1),
      filter(blockchainNetworks => !blockchainNetworks?.Cardano),
      map(() =>
        actions.network.setBlockchainNetworks({
          blockchain: 'Cardano',
          mainnet: CardanoNetworkId(Cardano.ChainIds.Mainnet.networkMagic),
          testnet: CardanoNetworkId(defaultTestnetChainId.networkMagic),
        }),
      ),
    );

export const submitTxSideEffect: SideEffect = (
  { cardanoContext: { submitTx$ } },
  { cardanoContext: { selectChainId$ } },
  { cardanoProvider, actions },
) =>
  submitTx$.pipe(
    withLatestFrom(selectChainId$),
    mergeMap(([{ payload }, chainId]) => {
      if (!chainId) {
        return of(
          actions.cardanoContext.submitTxFailed({
            txId: CardanoTxId.fromCbor(payload.serializedTx),
            error: 'Chain ID not found',
          }),
        );
      }
      return cardanoProvider
        .submitTx({ signedTransaction: payload.serializedTx }, { chainId })
        .pipe(
          map(result =>
            result.isOk()
              ? actions.cardanoContext.submitTxCompleted({
                  txId: result.value as CardanoTxId,
                })
              : actions.cardanoContext.submitTxFailed({
                  txId: CardanoTxId.fromCbor(payload.serializedTx),
                  error: result.error.message,
                }),
          ),
        );
    }),
  );

export const createCardanoProviderSideEffects = (config: AppConfig) => [
  createRegisterCardanoBlockchainNetworks(config.defaultTestnetChainId),
  coordinateCardanoSync,
  addressDiscoverySync,
  trackAccountTokens,
  trackSyncRoundFailures,
  trackTip(config.cardanoProvider.tipPollFrequency),
  trackTokenMetadata(UPDATE_METADATA_BUFFER_TIME),
  syncLovelaceTokenTickerWithChain,
  trackProtocolParameters,
  wireProtocolParametersObservable,
  wireNetworkMagicObservable,
  wireAccountUtxosObservable,
  wireAccountUnspendableUtxosObservable,
  wireCardanoAddressesObservable,
  wireCardanoChainIdObservable,
  wireRewardAccountDetailsObservable,
  trackEraSummaries,
  createTrackOlderAccountTransactionHistory(fetchAddressTransactionHistories),
  createTrackNewerAccountTransactionHistory(
    fetchNewAddressTransactionHistories,
    config.cardanoProvider.transactionHistoryPollingIntervalSeconds,
  ),
  createTrackAccountRewardsHistory(TRACK_ACCOUNT_ACTIVITIES_DEBOUNCE_TIME),
  trackAccountDelegationActivities,
  createTrackAccountActivities({
    findMissingActivities,
    mapTransactionToActivity,
    mapRewardToActivity,
    debounceTimeout: TRACK_ACCOUNT_ACTIVITIES_DEBOUNCE_TIME,
  }),
  createTrackTransactionDetails(),
  findMissingTokensMetadataForActivities(),
  loadTokensMetadata,
  trackAccountTransactionsTotal,
  trackAccountUtxos,
  syncUnspendableUtxosWithAccountUtxos,
  trackRewardAccountDetails,
  submitTxSideEffect,
];
