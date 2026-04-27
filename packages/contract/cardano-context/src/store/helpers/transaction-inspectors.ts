import {
  createTxInspector,
  metadataInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { Cardano } from '@cardano-sdk/core';
import { TokenId } from '@lace-contract/tokens';
import { filter, map, of, take, from, mergeMap, toArray } from 'rxjs';

import { assetProvider } from './get-fallback-asset';

import type {
  CardanoRewardAccount,
  CardanoTokenMetadata,
  RequiredProtocolParameters,
} from '../../types';
import type {
  Milliseconds,
  TransactionSummaryInspection,
} from '@cardano-sdk/core';
import type { TokenMetadata } from '@lace-contract/tokens';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const TX_SUMMARY_INSPECTOR_TIMEOUT = 10_000 as Milliseconds;

export type TransactionInspectorParams = {
  accountAddresses: Cardano.PaymentAddress[];
  rewardAccount: CardanoRewardAccount;
  protocolParameters: RequiredProtocolParameters;
  inputResolver: Cardano.InputResolver;
  logger: Logger;
};

export type AssetsInfoResult = {
  summary: TransactionSummaryInspection;
  metadata: Cardano.Metadatum;
  assetsInfo: Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>;
};

/**
 * Creates a transaction inspector with the given parameters
 */
export const createTransactionInspector = ({
  accountAddresses,
  rewardAccount,
  protocolParameters,
  inputResolver,
  logger,
}: TransactionInspectorParams) => {
  return createTxInspector({
    summary: transactionSummaryInspector({
      addresses: accountAddresses,
      rewardAccounts: [Cardano.RewardAccount(rewardAccount)],
      inputResolver,
      protocolParameters,
      // Using a dummy asset provider as we don't need to fetch assets for the summary
      // We don't want the transactionSummaryInspector to build a fallback asset on its own getAssets() failure,
      // because it logs an error, and we don't want that as having a fallback asset is intentional.
      assetProvider,
      timeout: TX_SUMMARY_INSPECTOR_TIMEOUT,
      logger,
    }),
    metadata: async txDetails => metadataInspector(txDetails),
  });
};

/**
 * Fetches metadata for all assets in the transaction summary
 */
export const fetchAssetsMetadata = (
  summary: Pick<TransactionSummaryInspection, 'assets'>,
  getTokenMetadata: (
    tokenId: TokenId,
  ) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, Error>>,
): Observable<Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>> => {
  if (summary.assets.size === 0) {
    return of(new Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>());
  }

  const observables = Array.from(summary.assets.keys()).map(assetId => {
    // TODO: LW-13522 cache results to avoid re-fetching metadata
    return getTokenMetadata(TokenId(assetId)).pipe(
      map(result => result.unwrapOr(null)),
      filter(tokenMetadata => tokenMetadata !== null),
      map<
        TokenMetadata<CardanoTokenMetadata>,
        [Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>]
      >(tokenMetadata => [assetId, tokenMetadata]),
    );
  });

  return from(observables).pipe(
    mergeMap(obs => obs.pipe(take(1))),
    toArray(),
    map(tokensMetadata => new Map(tokensMetadata)),
  );
};
