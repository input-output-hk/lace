import { Cardano } from '@cardano-sdk/core';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { Err, Milliseconds, Ok } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  bufferTime,
  catchError,
  distinct,
  distinctUntilChanged,
  EMPTY,
  filter,
  from,
  groupBy,
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
import { CARDANO_TOKEN_METADATA_SCHEMA_VERSION } from '../const';
import { isCardanoAddress } from '../util';
import {
  CardanoEraSummariesFailureId,
  CardanoNetworkId,
  CardanoProtocolParametersFailureId,
  TokenMetadataFailureId,
} from '../value-objects';

import {
  findMissingActivities,
  mapRewardToActivity,
  mapTransactionToActivity,
} from './helpers';
import { fetchAddressTransactionHistories } from './helpers/fetch-address-transaction-histories';
import { clearStaleCardanoSyncsOnResume } from './side-effects/clear-stale-cardano-syncs-on-resume';
import { findMissingTokensMetadataForActivities } from './side-effects/find-missing-tokens-metadata-for-activities';
import { loadTokensMetadata } from './side-effects/load-tokens-metadata';
import { securityRescan } from './side-effects/security-rescan';
import { securityRescanToast } from './side-effects/security-rescan-toast';
import { syncLovelaceTokenTickerWithChain } from './side-effects/sync-lovelace-token-ticker-with-chain';
import { syncUnspendableUtxosWithAccountUtxos } from './side-effects/sync-unspendable-utxos-with-account-utxos';
import { createTrackAccountActivities } from './side-effects/track-account-activities';
import { trackAccountDelegationActivities } from './side-effects/track-account-delegation-activities';
import { createTrackAccountRewardsHistory } from './side-effects/track-account-reward-history';
import { trackAccountTokens } from './side-effects/track-account-tokens';
import { createTrackOlderAccountTransactionHistory } from './side-effects/track-account-transaction-history';
import { trackRewardAccountDetails } from './side-effects/track-reward-account-details';
import { trackSyncRoundFailures } from './side-effects/track-sync-round-failures';
import { createTrackTransactionDetails } from './side-effects/track-transaction-details';
import { transactionPollingSync } from './side-effects/transaction-polling-sync';

import type { SideEffect } from '../contract';
import type { CardanoTokenMetadata } from '../types';
import type { AppConfig } from '@lace-contract/module';
import type {
  RawToken,
  StoredTokenMetadata,
  TokenId,
  TokenMetadata,
} from '@lace-contract/tokens';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

const UPDATE_METADATA_BUFFER_TIME = Milliseconds(200);
const TRACK_ACCOUNT_ACTIVITIES_DEBOUNCE_TIME = Milliseconds(2000);

const unwrapOrThrowError = <T, E extends Error>(result: Result<T, E>): T => {
  if (result.isErr()) throw result.unwrapErr();
  return result.unwrap();
};

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
      filter(([token, existingMetadata]) => {
        const metadata = existingMetadata[token.tokenId] as
          | StoredTokenMetadata<CardanoTokenMetadata>
          | undefined;

        return (
          !metadata ||
          metadata.blockchainSpecific?.metadataSchemaVersion !==
            CARDANO_TOKEN_METADATA_SCHEMA_VERSION
        );
      }),
      map(([{ tokenId }]) => tokenId),
      distinct(),
    );

type TokenMetadataOk = {
  tokenId: TokenId;
  metadata: TokenMetadata<CardanoTokenMetadata>;
};

type TokenMetadataError = { tokenId: TokenId };

const toUpsertTokenMetadataPayload = (
  result: Result<TokenMetadataOk, TokenMetadataError>,
) => {
  const { metadata, tokenId } = result.unwrap();
  return { tokenId, ...metadata };
};

const toTokenMetadataFailureId = ({ tokenId }: { tokenId: TokenId }) =>
  TokenMetadataFailureId(tokenId);

export const trackTokenMetadata =
  (batchInterval: Milliseconds): SideEffect =>
  (
    _,
    {
      tokens: { selectAllRaw$, selectTokensMetadata$ },
      cardanoContext: { selectChainId$ },
      failures: { selectFailureById$ },
    },
    { actions, cardanoProvider: { getTokenMetadata } },
  ) =>
    selectAllRaw$.pipe(
      distinctWithoutMetadata(selectTokensMetadata$),
      withLatestFrom(selectChainId$.pipe(filter(Boolean))),
      mergeMap(
        ([tokenId, chainId]): Observable<
          Result<TokenMetadataOk, TokenMetadataError>
        > =>
          getTokenMetadata({ tokenId }, { chainId }).pipe(
            map(result =>
              Ok({ tokenId, metadata: unwrapOrThrowError(result) }),
            ),
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            catchError(() => of(Err({ tokenId }))),
          ),
      ),
      groupBy(result => result.isOk()),
      mergeMap(group$ =>
        group$.key
          ? group$.pipe(
              bufferTime(batchInterval),
              mergeMap(okResults => {
                if (okResults.length === 0) return EMPTY;
                const metadatas = okResults.map(toUpsertTokenMetadataPayload);
                return merge(
                  of(actions.tokens.upsertTokensMetadata({ metadatas })),
                  from(metadatas.map(toTokenMetadataFailureId)).pipe(
                    autoDismissFailureOnSuccess(selectFailureById$),
                  ),
                );
              }),
            )
          : group$.pipe(
              map(errorResult => {
                const { tokenId } = errorResult.unwrapErr();
                return actions.failures.addFailure({
                  failureId: TokenMetadataFailureId(tokenId),
                  message: 'sync.error.token-metadata-fetch-failed',
                  retryAction: actions.cardanoContext.loadTokenMetadata({
                    tokenId,
                  }),
                });
              }),
            ),
      ),
    );

/**
 * Side effect that tracks the protocol parameters based on the chainId.
 *
 * Transient provider errors are retried with exponential backoff. After
 * exhaustion a failure keyed by `CardanoProtocolParametersFailureId(network)`
 * is surfaced only when no cached parameters exist for the active network;
 * otherwise the failure is silent and the next chainId change to this network
 * naturally re-triggers the fetch.
 */
export const trackProtocolParameters: SideEffect = (
  _,
  {
    cardanoContext: { selectChainId$, selectProtocolParameters$ },
    failures: { selectFailureById$ },
  },
  { actions, cardanoProvider: { getProtocolParameters } },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    switchMap(chainId => {
      const network = CardanoNetworkId(chainId.networkMagic);
      const failureId = CardanoProtocolParametersFailureId(network);
      return getProtocolParameters({ chainId }).pipe(
        map(unwrapOrThrowError),
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        mergeMap(protocolParameters =>
          merge(
            of(
              actions.cardanoContext.setProtocolParameters({
                network,
                protocolParameters,
              }),
            ),
            of(failureId).pipe(autoDismissFailureOnSuccess(selectFailureById$)),
          ),
        ),
        catchError(() =>
          selectProtocolParameters$.pipe(
            take(1),
            mergeMap(existing =>
              existing
                ? EMPTY
                : of(
                    actions.failures.addFailure({
                      failureId,
                      message: 'sync.error.cardano-protocol-parameters-failed',
                    }),
                  ),
            ),
          ),
        ),
      );
    }),
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
 * Side effect that tracks era summaries based on the chainId.
 *
 * Transient provider errors are retried with exponential backoff. After
 * exhaustion a failure keyed by `CardanoEraSummariesFailureId(network)` is
 * surfaced only when no cached era summaries exist for the active network;
 * otherwise the failure is silent and the next chainId change to this network
 * naturally re-triggers the fetch.
 */
export const trackEraSummaries: SideEffect = (
  _,
  {
    cardanoContext: { selectChainId$, selectEraSummaries$ },
    failures: { selectFailureById$ },
  },
  { actions, cardanoProvider: { getEraSummaries } },
) =>
  selectChainId$.pipe(
    filter(Boolean),
    switchMap(chainId => {
      const network = CardanoNetworkId(chainId.networkMagic);
      const failureId = CardanoEraSummariesFailureId(network);
      return getEraSummaries({ chainId }).pipe(
        map(unwrapOrThrowError),
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        mergeMap(eraSummaries =>
          merge(
            of(
              actions.cardanoContext.setEraSummaries({
                network,
                eraSummaries,
              }),
            ),
            of(failureId).pipe(autoDismissFailureOnSuccess(selectFailureById$)),
          ),
        ),
        catchError(() =>
          selectEraSummaries$.pipe(
            take(1),
            mergeMap(existing =>
              existing
                ? EMPTY
                : of(
                    actions.failures.addFailure({
                      failureId,
                      message: 'sync.error.cardano-era-summaries-failed',
                    }),
                  ),
            ),
          ),
        ),
      );
    }),
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

export const createCardanoProviderSideEffects = (config: AppConfig) => [
  createRegisterCardanoBlockchainNetworks(config.defaultTestnetChainId),
  clearStaleCardanoSyncsOnResume,
  securityRescan,
  securityRescanToast,
  trackAccountTokens,
  trackSyncRoundFailures,
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
  transactionPollingSync,
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
  syncUnspendableUtxosWithAccountUtxos,
  trackRewardAccountDetails,
];
