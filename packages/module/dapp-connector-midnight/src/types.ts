import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { ProverCommand, ProverReply } from '@lace-lib/midnight-prover';
import type { ProofCircuitRequest } from '@lace-lib/vendor/midnight-proof-servers';
import type {
  ConnectedAPI,
  KeyMaterialProvider,
  SignDataOptions,
  Signature,
} from '@midnightntwrk/dapp-connector-api';
import type { ProvingProvider } from '@midnightntwrk/ledger-v9';
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

/** Lace adds scheme selection while existing requests retain Schnorr. */
export type MidnightSignDataOptions = SignDataOptions & {
  scheme?: NonNullable<Signature['scheme']>;
};

export type MidnightConnectedAPI = Omit<
  ConnectedAPI,
  'getProvingProvider' | 'signData'
> & {
  signData(data: string, options: MidnightSignDataOptions): Promise<Signature>;
  getProvingProvider(
    keyMaterialProvider: KeyMaterialProvider,
  ): Promise<ProvingProvider>;
};

/** Key-material callbacks stay page-side; circuit bytes cross the transport. */
export type DAppConnectorWalletAPI = Omit<
  MidnightConnectedAPI,
  'getProvingProvider'
> &
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
