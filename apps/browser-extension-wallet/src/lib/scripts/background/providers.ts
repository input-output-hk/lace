import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { Wallet } from '@lace/cardano';
import { getBaseUrlForChain, getMagicForChain } from '@src/utils/chain';
import { MessageTypes } from '../types';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { ExperimentName } from '@providers/ExperimentsProvider/types';
import { logger } from '@lace/common';
import { config } from '@src/config';
import Bottleneck from 'bottleneck';
import { requestMessage$ } from './services';
import { ProviderError, ProviderFailure } from '@cardano-sdk/core';

const { BLOCKFROST_CONFIGS, BLOCKFROST_RATE_LIMIT_CONFIG } = config();
// Important to use the same rateLimiter object for all networks,
// because Blockfrost rate limit is per IP address, not per project id
const rateLimiter: Wallet.RateLimiter = new Bottleneck({
  reservoir: BLOCKFROST_RATE_LIMIT_CONFIG.size,
  reservoirIncreaseAmount: BLOCKFROST_RATE_LIMIT_CONFIG.increaseAmount,
  reservoirIncreaseInterval: BLOCKFROST_RATE_LIMIT_CONFIG.increaseInterval,
  reservoirIncreaseMaximum: BLOCKFROST_RATE_LIMIT_CONFIG.size
});

const monitorLedgerTipResponses = (ledgerTip: () => Promise<Wallet.Cardano.Tip>) => async () => {
  try {
    const tip = await ledgerTip();
    requestMessage$.next({ type: MessageTypes.NETWORK_INFO_PROVIDER_CONNECTION, data: { connected: true } });
    return tip;
  } catch (error) {
    if (error instanceof ProviderError && error.reason === ProviderFailure.ConnectionFailure) {
      requestMessage$.next({ type: MessageTypes.NETWORK_INFO_PROVIDER_CONNECTION, data: { connected: false } });
    }
    throw error;
  }
};

export const getProviders = async (chainName: Wallet.ChainName): Promise<Wallet.WalletProvidersDependencies> => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);
  const magic = getMagicForChain(chainName);
  const { customSubmitTxUrl, featureFlags } = await getBackgroundStorage();
  const useWebSocket = !!(featureFlags?.[magic]?.[ExperimentName.WEBSOCKET_API] ?? false);
  const useBlockfrostAssetProvider = !!(featureFlags?.[magic]?.[ExperimentName.BLOCKFROST_ASSET_PROVIDER] ?? false);

  const providers = Wallet.createProviders({
    axiosAdapter: axiosFetchAdapter,
    env: {
      baseCardanoServicesUrl,
      customSubmitTxUrl,
      blockfrostConfig: {
        ...BLOCKFROST_CONFIGS[chainName],
        rateLimiter
      }
    },
    logger,
    experiments: { useWebSocket, useBlockfrostAssetProvider }
  });

  return {
    ...providers,
    networkInfoProvider: {
      ...providers.networkInfoProvider,
      ledgerTip: monitorLedgerTipResponses(providers.networkInfoProvider.ledgerTip)
    }
  };
};
