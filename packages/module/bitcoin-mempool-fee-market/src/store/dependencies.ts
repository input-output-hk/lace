import { HttpClient } from '@lace-lib/util-provider';
import { Err, Ok } from '@lace-sdk/util';
import memoize from 'lodash/memoize';
import { from } from 'rxjs';

import { MempoolFeeMarketProvider } from '../mempool';

import type { ProviderError } from '@cardano-sdk/core';
import type {
  BitcoinEstimatedFees,
  BitcoinFeeMarketProviderDependencies,
  BitcoinNetwork,
  BitcoinProviderContext,
} from '@lace-contract/bitcoin-context';
import type { LaceInit } from '@lace-contract/module';
import type { Logger } from 'ts-log';

export type MempoolSpaceConfig = {
  url: string;
};

const computeMaestroConfigIdentifier = ({ url }: MempoolSpaceConfig) =>
  `${url}`;

const getMempoolSpaceClient = memoize(({ url }: MempoolSpaceConfig) => {
  return new HttpClient({ baseUrl: url });
}, computeMaestroConfigIdentifier);

const getMempoolSpaceApiProvider = memoize(
  (config: MempoolSpaceConfig, logger: Logger) => {
    const client = getMempoolSpaceClient(config);
    return new MempoolFeeMarketProvider(client, logger);
  },
  computeMaestroConfigIdentifier,
);

const getMempoolSpaceConfig = (
  context: BitcoinProviderContext,
  configs: Partial<Record<BitcoinNetwork, MempoolSpaceConfig>>,
) => {
  const config = configs[context.network];
  if (!config)
    throw new Error(
      `Assertion failed: no blockfrost config found (${context.network}`,
    );
  return config;
};

export const initializeDependencies: LaceInit<
  BitcoinFeeMarketProviderDependencies
> = async (
  {
    runtime: {
      config: {
        bitcoinFeeMarketProvider: { mempoolSpaceConfig },
      },
    },
  },
  { logger },
) => {
  return {
    bitcoinFeeMarketProvider: {
      getFeeMarket: context => {
        const provider = getMempoolSpaceApiProvider(
          getMempoolSpaceConfig(context, mempoolSpaceConfig),
          logger,
        );
        return from(
          provider
            .getFeeMarket(context.network)
            .then(Ok<BitcoinEstimatedFees>)
            .catch(Err<ProviderError>),
        );
      },
    },
  };
};

declare module '@lace-contract/bitcoin-context' {
  interface BitcoinFeeMarketProviderConfig {
    mempoolSpaceConfig: Partial<Record<BitcoinNetwork, MempoolSpaceConfig>>;
  }
}
