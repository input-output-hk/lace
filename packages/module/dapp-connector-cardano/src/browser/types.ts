import type { Runtime } from 'webextension-polyfill';

/**
 * CIP-30 type aliases using CBOR hex-encoded strings
 */
export type Cbor = string;
export type Address = Cbor;
export type TransactionUnspentOutput = Cbor;

export type Paginate = {
  page: number;
  limit: number;
};

/**
 * CIP-30 Wallet API Extension identifier
 * @see https://cips.cardano.org/cip/CIP-30#extensions
 */
export interface WalletApiExtension {
  /** CIP number identifying the extension */
  cip: number;
}

/**
 * CIP-8 Data Signature
 * @see https://cips.cardano.org/cip/CIP-8
 */
export interface DataSignature {
  /** COSE_Sign1 signature */
  signature: Cbor;
  /** COSE_Key with the public key */
  key: Cbor;
}

/**
 * Context containing the message sender information
 * Used for identifying which dApp is making the request
 */
export interface SenderContext {
  sender: Runtime.MessageSender;
}

/**
 * Utility type to add SenderContext to methods that need it.
 * Recursively applies to nested objects.
 */
export type WithSenderContext<T> = {
  [K in keyof T]: T[K] extends (...arguments_: infer A) => infer R
    ? (...arguments_: [...A, SenderContext]) => R
    : T[K] extends object
    ? WithSenderContext<T[K]>
    : T[K];
};

/**
 * CIP-30 Enabled Wallet API (read-only methods)
 * @see https://cips.cardano.org/cip/CIP-30#full-api
 */
export interface Cip30WalletApi {
  /**
   * Returns the network id of the currently connected account
   */
  getNetworkId(): Promise<number>;

  /**
   * Returns a list of UTXOs controlled by the wallet
   * @param amount - Optional amount filter (CBOR-encoded Value)
   * @param paginate - Optional pagination
   */
  getUtxos(
    amount?: Cbor,
    paginate?: Paginate,
  ): Promise<TransactionUnspentOutput[] | null>;

  /**
   * Returns UTXOs suitable for use as collateral
   * @param params - Optional parameters including amount filter
   * @returns Collateral UTXOs or null if unavailable
   */
  getCollateral(params?: {
    amount?: Cbor;
  }): Promise<TransactionUnspentOutput[] | null>;

  /**
   * Returns the total balance available of the wallet
   */
  getBalance(): Promise<Cbor>;

  /**
   * Returns a list of all used addresses controlled by the wallet
   * @param paginate - Optional pagination
   */
  getUsedAddresses(paginate?: Paginate): Promise<Address[]>;

  /**
   * Returns a list of unused addresses controlled by the wallet
   */
  getUnusedAddresses(): Promise<Address[]>;

  /**
   * Returns an address to use for transaction change
   */
  getChangeAddress(): Promise<Address>;

  /**
   * Returns the reward addresses owned by the wallet
   */
  getRewardAddresses(): Promise<Address[]>;

  /**
   * Returns the list of enabled wallet extensions
   * @see https://cips.cardano.org/cip/CIP-30#extensions
   */
  getExtensions(): Promise<WalletApiExtension[]>;
}

/**
 * CIP-95 Wallet API Extension (Governance)
 * @see https://cips.cardano.org/cip/CIP-95
 */
export interface Cip95WalletApi {
  /**
   * Returns the public DRep key for governance voting
   * @returns Ed25519 public key hex
   */
  getPubDRepKey(): Promise<string>;

  /**
   * Returns public stake keys that are registered on-chain
   * @returns Array of Ed25519 public key hex strings
   */
  getRegisteredPubStakeKeys(): Promise<string[]>;

  /**
   * Returns public stake keys that are NOT registered on-chain
   * @returns Array of Ed25519 public key hex strings
   */
  getUnregisteredPubStakeKeys(): Promise<string[]>;
}

/**
 * CIP-142 Wallet API Extension (Network Magic)
 * @see https://cips.cardano.org/cip/CIP-142
 */
export interface Cip142WalletApi {
  /**
   * Returns the network magic number
   * @returns Network magic (e.g., 764824073 for mainnet)
   */
  getNetworkMagic(): Promise<number>;
}

/**
 * CIP-30 Experimental API namespace
 * Contains experimental methods that may be standardized in future CIPs
 */
export interface Cip30ExperimentalApi {
  /**
   * Returns UTXOs suitable for use as collateral (experimental)
   * @param params - Optional parameters including amount filter
   * @returns Collateral UTXOs or null if unavailable
   */
  getCollateral(params?: {
    amount?: Cbor;
  }): Promise<TransactionUnspentOutput[] | null>;
}

/**
 * CIP-30 Full Wallet API (includes signing methods)
 * Extensions are namespaced under cip95, cip142, etc.
 * @see https://cips.cardano.org/cip/CIP-30#full-api
 * @see https://cips.cardano.org/cip/CIP-95
 * @see https://cips.cardano.org/cip/CIP-142
 */
export interface Cip30FullWalletApi extends Cip30WalletApi {
  /**
   * CIP-95 Governance extension methods
   */
  cip95: Cip95WalletApi;

  /**
   * CIP-142 Network Magic extension methods
   */
  cip142: Cip142WalletApi;

  /**
   * Experimental methods namespace
   */
  experimental: Cip30ExperimentalApi;

  /**
   * Signs a transaction
   * @param tx - CBOR-encoded transaction hex string
   * @param partialSign - If true, only sign what we can (for multi-sig)
   * @returns CBOR-encoded transaction witness set
   */
  signTx(tx: Cbor, partialSign?: boolean): Promise<Cbor>;

  /**
   * Signs arbitrary data per CIP-8
   * @param addr - Address (bech32 or hex) that will sign the data
   * @param payload - Hex-encoded payload to sign
   * @returns Data signature with COSE_Sign1 signature and COSE_Key
   */
  signData(addr: string, payload: string): Promise<DataSignature>;

  /**
   * Submits a signed transaction to the network
   * @param tx - CBOR-encoded signed transaction
   * @returns Transaction hash
   */
  submitTx(tx: Cbor): Promise<string>;
}
