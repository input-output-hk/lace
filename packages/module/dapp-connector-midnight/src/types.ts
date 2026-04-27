import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { Runtime } from 'webextension-polyfill';

export type NetworkInfo = {
  getNetworkId: () => Promise<MidnightSDKNetworkId>;
  checkNetworkSupport: (networkId: string) => Promise<void>;
};

export type LockInfo = {
  isLocked: () => Promise<boolean>;
};

export type ExtendedDAppConnectorWalletAPI = ConnectedAPI &
  LockInfo &
  NetworkInfo;

export type SenderContext = { sender: Runtime.MessageSender };
type FunctionWithSender<T> = T extends (...args: infer Args) => infer R
  ? (...args: [...Args, SenderContext]) => R
  : T;

export type WithSenderContext<T> = {
  [K in keyof T]: FunctionWithSender<T[K]>;
};
