/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Wallet } from '@lace/cardano';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { Subject, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

export type AddressesDiscovererDependencies = {
  chainName: Wallet.ChainName;
};

export type AddressesDiscoverer = {
  addresses$: Subject<Wallet.KeyManagement.GroupedAddress[] | null>;
  discover: (dependencies: AddressesDiscovererDependencies) => Promise<Wallet.KeyManagement.GroupedAddress[]>;
  setup: (keyAgentChannelName: string) => void;
};

export type AddressesDiscovererExposed = Omit<AddressesDiscoverer, 'setup'> & {
  setup: (keyAgentChannelName: string) => Promise<void>;
};

const commonConfig = {
  baseChannel: 'addresses-discoverer',
  properties: {
    addresses$: RemoteApiPropertyType.HotObservable,
    discover: RemoteApiPropertyType.MethodReturningPromise,
    setup: RemoteApiPropertyType.MethodReturningPromise
  }
} as const;

export const exposeAddressesDiscoverer = (addressesDiscoverer: AddressesDiscoverer) =>
  exposeApi(
    {
      ...commonConfig,
      api$: of(addressesDiscoverer)
    },
    { logger: console, runtime }
  );

export const consumeAddressesDiscoverer = () =>
  consumeRemoteApi<AddressesDiscovererExposed>(commonConfig, { logger: console, runtime });
