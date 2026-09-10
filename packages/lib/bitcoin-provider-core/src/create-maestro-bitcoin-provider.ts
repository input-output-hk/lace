import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { Err, Ok } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import memoize from 'lodash/memoize';
import { defer, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MaestroBitcoinProvider } from './maestro';
import {
  computeMaestroConfigIdentifier,
  getMaestroClient,
} from './maestro-config';

import type { MaestroConfig } from './maestro-config';
import type {
  BitcoinBlockInfo,
  BitcoinFeeMarket,
  BitcoinNetwork,
  BitcoinPaginatedResponse,
  BitcoinProviderContext,
  BitcoinProviderDependencies,
  BitcoinTransactionHistoryEntry,
  BitcoinTransactionStatus,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { Logger } from 'ts-log';

const getMaestroApiProvider = memoize(
  (config: MaestroConfig, logger: Logger) => {
    const client = getMaestroClient(config);
    return new MaestroBitcoinProvider(client, logger);
  },
  computeMaestroConfigIdentifier,
);

const getMaestroConfig = (
  context: BitcoinProviderContext,
  configs: Partial<Record<BitcoinNetwork, MaestroConfig>>,
): MaestroConfig | undefined => configs[context.network];

// An unprovisioned network yields an immediate, non-retriable error rather than
// a synchronous throw that escapes the Observable<Result> channel every method
// declares. NotImplemented is non-retriable per isRetriableError, so
// retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG) surfaces it at once.
const unprovisionedNetworkError = (network: BitcoinNetwork) =>
  new ProviderError(
    ProviderFailure.NotImplemented,
    undefined,
    `maestro is unprovisioned for network ${network}: no config entry in this build`,
  );

export const createMaestroBitcoinProvider = (
  maestroConfig: Partial<Record<BitcoinNetwork, MaestroConfig>>,
  logger: Logger,
): BitcoinProviderDependencies['bitcoinProvider'] => ({
  getLastKnownBlock: context => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getLastKnownBlock()
        .then(Ok<BitcoinBlockInfo>)
        .catch(Err<ProviderError>),
    );
  },
  getTransaction: (context, txHash) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getTransaction(txHash)
        .then(Ok<BitcoinTransactionHistoryEntry>)
        .catch(Err<ProviderError>),
    );
  },
  getRawTransaction: (context, txHash) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return defer(async () => provider.getRawTransaction(txHash)).pipe(
      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
      map(Ok<string>),
      catchError((error: ProviderError) => of(Err<ProviderError>(error))),
    );
  },
  getTransactions: (
    context,
    address,
    { afterBlockHeight, limit, order, cursor },
  ) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getTransactions(address, {
          count: limit,
          order,
          cursor,
          from: afterBlockHeight,
        })
        .then(result =>
          Ok<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>>(result),
        )
        .catch(Err<ProviderError>),
    );
  },
  getTransactionsInMempool: (
    context,
    address,
    { afterBlockHeight, limit, order, cursor },
  ) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getTransactionsInMempool(address, {
          count: limit,
          order,
          cursor,
          from: afterBlockHeight,
        })
        .then(result =>
          Ok<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>>(result),
        )
        .catch(Err<ProviderError>),
    );
  },
  getUTxOs: (context, address, { afterBlockHeight, limit, order, cursor }) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getUTxOs(address, {
          count: limit,
          order,
          cursor,
          from: afterBlockHeight,
        })
        .then(result => Ok<BitcoinPaginatedResponse<BitcoinUTxO>>(result))
        .catch(Err<ProviderError>),
    );
  },
  submitTransaction: (context, rawTransaction) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .submitTransaction(rawTransaction)
        .then(Ok<string>)
        .catch(Err<ProviderError>),
    );
  },
  getTransactionStatus: (context, txHash) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .getTransactionStatus(txHash)
        .then(Ok<BitcoinTransactionStatus>)
        .catch(Err<ProviderError>),
    );
  },
  estimateFee: (context, blocks, mode) => {
    const config = getMaestroConfig(context, maestroConfig);
    if (!config)
      return of(Err<ProviderError>(unprovisionedNetworkError(context.network)));
    const provider = getMaestroApiProvider(config, logger);
    return from(
      provider
        .estimateFee(blocks, mode)
        .then(Ok<BitcoinFeeMarket>)
        .catch(Err<ProviderError>),
    );
  },
});
