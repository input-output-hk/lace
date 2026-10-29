import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { ProverCommand, ProverReply } from '@lace-lib/midnight-prover';
import type { ProofCircuitRequest } from '@lace-lib/vendor/midnight-proof-servers';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { Runtime } from 'webextension-polyfill';

export type NetworkInfo = {
  getNetworkId: () => Promise<MidnightSDKNetworkId>;
  checkNetworkSupport: (networkId: string) => Promise<void>;
};

export type LockInfo = {
  isLocked: () => Promise<boolean>;
};

/** Page-owned circuit material crosses as data; the wallet selects the backend. */
export type ProofServerApi = {
  // AbortSignal is process-local; remote cancellation uses proofCommand.
  checkCircuit(request: ProofCircuitRequest): Promise<(bigint | undefined)[]>;
  proveCircuit(request: ProofCircuitRequest): Promise<Uint8Array>;
  proofCommand(command: ProverCommand): Promise<ProverReply>;
};

/**
 * The connector surface the service worker implements: `getProvingProvider`
 * is page-side only (it needs the dApp's key-material callbacks, which cannot
 * cross the messaging boundary) and is composed over {@link ProofServerApi}.
 */
export type DAppConnectorWalletAPI = Omit<ConnectedAPI, 'getProvingProvider'> &
  ProofServerApi;

export type ExtendedDAppConnectorWalletAPI = DAppConnectorWalletAPI &
  LockInfo &
  NetworkInfo;

export type SenderContext = { sender: Runtime.MessageSender };
type FunctionWithSender<T> = T extends (...args: infer Args) => infer R
  ? (...args: [...Args, SenderContext]) => R
  : T;

export type WithSenderContext<T> = {
  [K in keyof T]: FunctionWithSender<T[K]>;
};
