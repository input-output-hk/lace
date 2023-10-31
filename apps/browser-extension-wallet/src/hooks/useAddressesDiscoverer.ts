import { Shutdown } from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';
import { consumeAddressesDiscoverer, exposeKeyAgent } from '@lib/communication';
import { useCallback } from 'react';

const addressesDiscoverer = consumeAddressesDiscoverer();
let shutdownExposedKeyAgent: Shutdown['shutdown'];

type useAddressesDiscovererSetupParams = {
  asyncKeyAgent: Wallet.KeyManagement.AsyncKeyAgent;
  chainName: Wallet.ChainName;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useAddressesDiscoverer = () => ({
  addressesDiscoverer,
  prepare: useCallback(async ({ asyncKeyAgent, chainName }: useAddressesDiscovererSetupParams) => {
    shutdownExposedKeyAgent?.();
    const { channelName, shutdown } = await exposeKeyAgent(asyncKeyAgent);
    shutdownExposedKeyAgent = shutdown;
    await addressesDiscoverer.setup({ chainName, keyAgentChannelName: channelName });
  }, [])
});
