import { consumeRemoteApi, exposeApi, getWalletId, keyAgentProperties } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

const makeCommonConfig = (baseChannel: string) =>
  ({
    baseChannel,
    properties: keyAgentProperties
  } as const);

const makeBaseChannel = (walletId: string) => `${walletId}-key-agent-channel`;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const exposeKeyAgent = async (asyncKeyAgent: Wallet.KeyManagement.AsyncKeyAgent) => {
  const walletId = await getWalletId(asyncKeyAgent);
  const channelName = makeBaseChannel(walletId);

  const { shutdown } = exposeApi(
    {
      ...makeCommonConfig(channelName),
      api$: of(asyncKeyAgent)
    },
    { logger: console, runtime }
  );

  return {
    shutdown,
    channelName
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const consumeKeyAgent = (channelName: string) =>
  consumeRemoteApi<Wallet.KeyManagement.AsyncKeyAgent>(makeCommonConfig(channelName), {
    logger: console,
    runtime
  });
