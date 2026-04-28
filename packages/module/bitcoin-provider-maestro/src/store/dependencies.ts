import { HttpClient, buildUrl } from '@lace-lib/util-provider';
import { Err, Ok } from '@lace-sdk/util';
import Bottleneck from 'bottleneck';
import memoize from 'lodash/memoize';
import { from } from 'rxjs';

import { MaestroBitcoinProvider } from '../maestro';

import type { ProviderError } from '@cardano-sdk/core';
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
import type { LaceInit } from '@lace-contract/module';
import type { RateLimiterConfig } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

export type MaestroClientConfig = {
  projectId?: string;
  baseUrl: string;
  apiVersion?: string;
};

export type MaestroConfig = {
  clientConfig: MaestroClientConfig;
  rateLimiterConfig: RateLimiterConfig;
};

const computeMaestroConfigIdentifier = ({
  clientConfig: { baseUrl, projectId },
}: MaestroConfig) => `${baseUrl}-${projectId}`;

const getMaestroClient = memoize(
  ({ clientConfig, rateLimiterConfig }: MaestroConfig) => {
    const rateLimiter = new Bottleneck({
      reservoir: rateLimiterConfig.size,
      reservoirIncreaseAmount: rateLimiterConfig.increaseAmount,
      reservoirIncreaseInterval: rateLimiterConfig.increaseInterval,
      reservoirIncreaseMaximum: rateLimiterConfig.size,
    });
    return new HttpClient(
      {
        baseUrl: buildUrl([clientConfig.apiVersion], clientConfig.baseUrl),
        requestInit: { headers: { 'api-key': clientConfig.projectId ?? '' } },
      },
      { rateLimiter },
    );
  },
  computeMaestroConfigIdentifier,
);

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
) => {
  const config = configs[context.network];
  if (!config)
    throw new Error(
      `Assertion failed: no blockfrost config found (${context.network}`,
    );
  return config;
};

export const initializeDependencies: LaceInit<
  BitcoinProviderDependencies
> = async (
  {
    runtime: {
      config: {
        bitcoinProvider: { maestroConfig },
      },
    },
  },
  { logger },
) => {
  return {
    bitcoinProvider: {
      getLastKnownBlock: context => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .getLastKnownBlock()
            .then(Ok<BitcoinBlockInfo>)
            .catch(Err<ProviderError>),
        );
      },
      getTransaction: (context, txHash) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .getTransaction(txHash)
            .then(Ok<BitcoinTransactionHistoryEntry>)
            .catch(Err<ProviderError>),
        );
      },
      getTransactions: (
        context,
        address,
        { afterBlockHeight, limit, order, cursor },
      ) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .getTransactions(address, {
              count: limit,
              order,
              cursor,
              from: afterBlockHeight,
            })
            .then(result =>
              Ok<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>>(
                result,
              ),
            )
            .catch(Err<ProviderError>),
        );
      },
      getTransactionsInMempool: (
        context,
        address,
        { afterBlockHeight, limit, order, cursor },
      ) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .getTransactionsInMempool(address, {
              count: limit,
              order,
              cursor,
              from: afterBlockHeight,
            })
            .then(result =>
              Ok<BitcoinPaginatedResponse<BitcoinTransactionHistoryEntry>>(
                result,
              ),
            )
            .catch(Err<ProviderError>),
        );
      },
      getUTxOs: (
        context,
        address,
        { afterBlockHeight, limit, order, cursor },
      ) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
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
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .submitTransaction(rawTransaction)
            .then(Ok<string>)
            .catch(Err<ProviderError>),
        );
      },
      getTransactionStatus: (context, txHash) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .getTransactionStatus(txHash)
            .then(Ok<BitcoinTransactionStatus>)
            .catch(Err<ProviderError>),
        );
      },
      estimateFee: (context, blocks, mode) => {
        const provider = getMaestroApiProvider(
          getMaestroConfig(context, maestroConfig),
          logger,
        );
        return from(
          provider
            .estimateFee(blocks, mode)
            .then(Ok<BitcoinFeeMarket>)
            .catch(Err<ProviderError>),
        );
      },
    },
  };
};
