/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Wallet } from '@lace/cardano';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { Subject, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

type AddressesDiscovererSetupDependencies = {
  chainName: Wallet.ChainName;
  keyAgentChannelName: string;
};

export enum AddressesDiscoveryStatus {
  Idle = 'Idle',
  InProgress = 'InProgress',
  Error = 'Error'
}

export type AddressesDiscoverer = {
  status$: Subject<AddressesDiscoveryStatus>;
  discover: () => Promise<Wallet.KeyManagement.GroupedAddress[]>;
  setup: (dependencies: AddressesDiscovererSetupDependencies) => void;
};

export type AddressesDiscovererExposed = Omit<AddressesDiscoverer, 'setup'> & {
  setup: (dependencies: AddressesDiscovererSetupDependencies) => Promise<void>;
};

const commonConfig = {
  baseChannel: 'addresses-discoverer',
  properties: {
    status$: RemoteApiPropertyType.HotObservable,
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
