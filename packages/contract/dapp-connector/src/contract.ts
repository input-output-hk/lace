import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';
import { ChannelName } from '@lace-sdk/extension-messaging';

import store from './store';

import type { Dapp } from '.';
import type { DappConnection } from './types';
import type { ConnectionContextId } from './value-objects';
import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';
import type {
  BaseChannel,
  ConsumeRemoteApiOptions,
} from '@lace-sdk/extension-messaging';
import type { MinimalRuntime } from '@lace-sdk/extension-messaging';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * Implementer module
 * - provides LaceModule.dappConnectorApi that use used to inject api into the dapp
 *   and set up isolated content script proxy for communication with service worker
 * - is responsible for implementing and exposing it's API(s)
 */
export const dappConnectorApiAddonContract = inferContractContext({
  name: ContractName('dapp-connector-api-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['dappConnectorApi'],
  },
});

export const dappConnectorPlatformDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('dapp-connector-platform-dependency'),
  instance: 'zero-or-more',
});

/**
 * Implementer module:
 * - provides `connectAuthenticator` in sideEffectDependencies
 * - is resposible for promting user to authorize by listening for authorizeDapp.start
 *   and dispatches authorizeDapp.completed or authorizeDapp.failed action
 */
export const dappConnectorStoreContract = inferContractContext({
  name: ContractName('dapp-connector-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    walletRepoStoreContract,
    dappConnectorApiAddonContract,
    dappConnectorPlatformDependencyContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof dappConnectorStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof dappConnectorStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

export type InjectDependencies = { logger: Logger; runtime: MinimalRuntime };

/**
 * Query feature flags from the SW via the isolated script proxy.
 * Used by content-script wallet APIs to check if a dapp connector module
 * is loaded before calling SW-side channels (which would hang if not).
 */
export interface FeatureFlagProbe {
  getFeatureFlags: () => Promise<{ key: string }[]>;
}

export const FEATURE_FLAGS_CHANNEL = ChannelName('feature-flags');

export type DappConnectorApiAuthenticator = BlockchainAssigned<{
  baseChannelName: ChannelName;
}>;

export type DappConnectorApi<T> = {
  /**
   * - added in isolated content script proxy
   * - exposed in service worker
   */
  authenticator?: DappConnectorApiAuthenticator;
  /**
   * Runs in the 'injected' content script (dapp context)
   */
  inject: (dependencies: InjectDependencies) => void;
  /**
   * 'injected' content script doesn't have access to extension messaging.
   * Instead, it has to use postMessage API to communicate with the
   * 'isolated' content script, which acts as a proxy between
   * the service worker and the injected script
   */
  proxy: Array<BaseChannel & ConsumeRemoteApiOptions<T>>;
};

export interface AccessRequest {
  dapp: Dapp;
  done: (accessGranted: boolean) => void;
  /** Browser window ID where the requesting dApp tab lives (extension only). */
  windowId?: number;
}

export interface ConnectAuthenticatorOptions {
  baseChannelName: ChannelName;
  blockchainName: BlockchainName;
  authorizedDapps$: Observable<Dapp[]>;
  hasAccounts: () => Promise<boolean>;
}

export interface DappConnectorPlatformDependencies {
  connectAuthenticator: (
    options: ConnectAuthenticatorOptions,
  ) => Observable<AccessRequest>;
  /** Observable that emits when a dApp connection is established */
  dappConnected$: Observable<DappConnection>;
  /** Observable that emits when a dApp connection is terminated */
  dappDisconnected$: Observable<ConnectionContextId>;
}
