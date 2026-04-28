import { Cardano } from '@cardano-sdk/core';
import { Bip32Account } from '@cardano-sdk/key-management';
import {
  type GetAccountRewardsProps,
  type CardanoProviderContext,
  type CardanoProviderDependencies,
  type CardanoTokenMetadata,
  type GetTokensProps,
  LOVELACE_TOKEN_ID,
  cardanoNetworkMagicToNetworkType,
  getAdaTokenTickerByNetwork,
  toContractAddress,
} from '@lace-contract/cardano-context';
import { buildUrl, HttpClient } from '@lace-lib/util-provider';
import { Err, Ok } from '@lace-sdk/util';
import Bottleneck from 'bottleneck';
import memoize from 'lodash/memoize';
import { from, map, of } from 'rxjs';

import {
  BlockfrostActivityProvider,
  BlockfrostAddressDiscovery,
  BlockfrostAssetProvider,
  BlockfrostInputResolverProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostRewardsProvider,
  BlockfrostDelegationsProvider,
  BlockfrostRegistrationsProvider,
  BlockfrostWithdrawalsProvider,
  BlockfrostStakePoolProvider,
  BlockfrostTokensProvider,
  BlockfrostUtxoProvider,
  BlockfrostTxSubmitProvider,
} from '../blockfrost';

import { LOVELACE_METADATA, toContractTokenMetadata } from './util';

import type {
  ProviderError,
  EraSummary,
  SubmitTxArgs,
} from '@cardano-sdk/core';
import type {
  BlockfrostPartialStakePool,
  BlockfrostStakePool,
  BlockfrostStakePoolMetadata,
  CardanoStakePoolsProviderDependencies,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';
import type { LaceInit } from '@lace-contract/module';
import type { TokenMetadata } from '@lace-contract/tokens';
import type { RateLimiterConfig } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

export type BlockfrostClientConfig = {
  projectId?: string;
  baseUrl: string;
  apiVersion?: string;
};

export type BlockfrostConfig = {
  clientConfig: BlockfrostClientConfig;
  rateLimiterConfig: RateLimiterConfig;
};

const computeBlockfrostConfigIdentifier = ({
  clientConfig: { baseUrl, projectId },
}: BlockfrostConfig) => `${baseUrl}-${projectId}`;

const getBlockfrostClient = memoize(
  ({ clientConfig, rateLimiterConfig }: BlockfrostConfig) => {
    const rateLimiter = new Bottleneck({
      reservoir: rateLimiterConfig.size,
      reservoirIncreaseAmount: rateLimiterConfig.increaseAmount,
      reservoirIncreaseInterval: rateLimiterConfig.increaseInterval,
      reservoirIncreaseMaximum: rateLimiterConfig.size,
    });
    return new HttpClient(
      {
        baseUrl: buildUrl(
          ['api', clientConfig.apiVersion],
          clientConfig.baseUrl,
        ),
        requestInit: { headers: { project_id: clientConfig.projectId ?? '' } },
      },
      { rateLimiter },
    );
  },
  computeBlockfrostConfigIdentifier,
);

const getNetworkInfoProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostNetworkInfoProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAssetProvider = memoize((config: BlockfrostConfig, logger: Logger) => {
  const client = getBlockfrostClient(config);
  return new BlockfrostAssetProvider(client, logger);
}, computeBlockfrostConfigIdentifier);

const getAddressDiscoveryProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostAddressDiscovery(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getInputResolverProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostInputResolverProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getTokensProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostTokensProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAccountActivityProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostActivityProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAccountRewardsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostRewardsProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAccountDelegationsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostDelegationsProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAccountRegistrationsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostRegistrationsProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getAccountWithdrawalsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostWithdrawalsProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getStakePoolProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostStakePoolProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getUtxoProvider = memoize((config: BlockfrostConfig, logger: Logger) => {
  const client = getBlockfrostClient(config);
  return new BlockfrostUtxoProvider(client, logger);
}, computeBlockfrostConfigIdentifier);

const getTxSubmitProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) => {
    const client = getBlockfrostClient(config);
    return new BlockfrostTxSubmitProvider(client, logger);
  },
  computeBlockfrostConfigIdentifier,
);

const getBlockfrostConfig = (
  context: CardanoProviderContext,
  configs: Partial<Record<Cardano.NetworkMagic, BlockfrostConfig>>,
) => {
  const config = configs[context.chainId.networkMagic];
  if (!config)
    throw new Error(
      `Assertion failed: no blockfrost config found (${context.chainId.networkMagic}`,
    );
  return config;
};

export const initializeDependencies: LaceInit<
  CardanoProviderDependencies & CardanoStakePoolsProviderDependencies
> = async (
  {
    runtime: {
      config: {
        cardanoProvider: { blockfrostConfigs },
      },
    },
    loadModules,
  },
  { logger },
) => {
  const bip32Ed25519 = (await loadModules('addons.bip32Ed25519'))[0];
  const blake2b = (await loadModules('addons.blake2b'))[0];
  const dependencies = { blake2b, bip32Ed25519 };

  return {
    cardanoProvider: {
      getTip: context => {
        const provider = getNetworkInfoProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .ledgerTip()
            .then(Ok<Cardano.Tip>)
            .catch(Err<ProviderError>),
        );
      },
      getProtocolParameters: context => {
        const provider = getNetworkInfoProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .protocolParameters()
            .then(Ok<Cardano.ProtocolParameters>)
            .catch(Err<ProviderError>),
        );
      },
      getEraSummaries: context => {
        const provider = getNetworkInfoProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .eraSummaries()
            .then(Ok<EraSummary[]>)
            .catch(Err<ProviderError>),
        );
      },
      discoverAddresses: ({ xpub, accountIndex }, context) => {
        const provider = getAddressDiscoveryProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );

        const account = new Bip32Account(
          {
            extendedAccountPublicKey: xpub,
            chainId: context.chainId,
            accountIndex,
          },
          dependencies,
        );

        return provider
          .discover(account)
          .pipe(
            map(result =>
              result.map(address =>
                toContractAddress(address, context.chainId.networkMagic),
              ),
            ),
          );
      },
      getTokenMetadata: ({ tokenId }, context) => {
        if (tokenId === LOVELACE_TOKEN_ID) {
          const networkType = cardanoNetworkMagicToNetworkType(
            context.chainId.networkMagic,
          );
          const ticker = getAdaTokenTickerByNetwork(networkType);
          return of(Ok({ ...LOVELACE_METADATA, ticker }));
        }
        const provider = getAssetProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .getAsset({
              assetId: Cardano.AssetId(tokenId),
              extraData: { nftMetadata: true, tokenMetadata: true },
            })
            .then(assetInfo =>
              Ok<TokenMetadata<CardanoTokenMetadata>>(
                toContractTokenMetadata(assetInfo),
              ),
            )
            .catch(Err<ProviderError>),
        );
      },
      getTokens: (props: GetTokensProps, context) => {
        const provider = getTokensProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return provider.getTokens(props);
      },
      getAccountRewards: (props: GetAccountRewardsProps, context) => {
        const rewardsProvider = getAccountRewardsProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return rewardsProvider.getAccountRewards(props);
      },
      getAccountDelegations: (props: GetAccountRewardsProps, context) => {
        const delegationsProvider = getAccountDelegationsProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return delegationsProvider.getAccountDelegations(props);
      },
      getAccountRegistrations: (
        props: GetAccountRewardsProps,
        context: CardanoProviderContext,
      ) => {
        const registrationsProvider = getAccountRegistrationsProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return registrationsProvider.getAccountRegistrations(props);
      },
      getAccountWithdrawals: (
        props: GetAccountRewardsProps,
        context: CardanoProviderContext,
      ) => {
        const withdrawalsProvider = getAccountWithdrawalsProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return withdrawalsProvider.getAccountWithdrawals(props);
      },
      getRewardAccountInfo: (props: GetAccountRewardsProps, context) => {
        const rewardsProvider = getAccountRewardsProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return rewardsProvider.getRewardAccountInfo(props);
      },
      getAccountUtxos: (props: GetAccountRewardsProps, context) => {
        const utxoProvider = getUtxoProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return utxoProvider.getAccountUtxos(props);
      },
      getTotalAccountTransactionCount: (
        props: GetAccountRewardsProps,
        context,
      ) => {
        const activityProvider = getAccountActivityProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return activityProvider.getTotalAccountTransactionCount(
          props.rewardAccount,
        );
      },
      getAddressTransactionHistory: (props, context) => {
        const activityProvider = getAccountActivityProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return activityProvider.getAddressTransactionHistory(props);
      },
      getTransactionDetails: (txId: Cardano.TransactionId, context) => {
        const activityProvider = getAccountActivityProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return activityProvider.getTransactionDetails(txId);
      },
      resolveInput: (txIn: Cardano.TxIn, context) => {
        const provider = getInputResolverProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .resolveInput(txIn)
            .then(Ok<Cardano.TxOut | null>)
            .catch(Err<ProviderError>),
        );
      },
      submitTx: (props: SubmitTxArgs, context) => {
        const txSubmitProvider = getTxSubmitProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          txSubmitProvider
            .submitTx(props)
            .then(id => Ok(Cardano.TransactionId(id)))
            .catch(Err<ProviderError>),
        );
      },
    },
    cardanoStakePoolsProvider: {
      getMetadata: (poolId: Cardano.PoolId, context) => {
        const provider = getStakePoolProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .getMetadata(poolId)
            .then(Ok<BlockfrostStakePoolMetadata | null>)
            .catch(Err<ProviderError>),
        );
      },
      getNetworkData: context => {
        const provider = getStakePoolProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .getNetworkData()
            .then(Ok<StakePoolsNetworkData>)
            .catch(Err<ProviderError>),
        );
      },
      getStakePool: (poolId: Cardano.PoolId, context) => {
        const provider = getStakePoolProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .getStakePool(poolId)
            .then(Ok<BlockfrostStakePool | null>)
            .catch(Err<ProviderError>),
        );
      },
      getStakePools: context => {
        const provider = getStakePoolProvider(
          getBlockfrostConfig(context, blockfrostConfigs),
          logger,
        );
        return from(
          provider
            .getStakePools()
            .then(Ok<BlockfrostPartialStakePool[]>)
            .catch(Err<ProviderError>),
        );
      },
    },
  };
};
