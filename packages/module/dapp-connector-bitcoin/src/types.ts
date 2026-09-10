import type { Runtime } from 'webextension-polyfill';

/**
 * Confirmed, unconfirmed and total balances of the connected account, in
 * satoshi. Numbers, matching the Unisat/OKX de facto API: dApps written against
 * it do arithmetic on these directly, and strings would concatenate. Safe
 * because the whole supply is ~2.1e15 satoshi, well inside MAX_SAFE_INTEGER.
 */
export type BitcoinBalance = {
  confirmed: number;
  unconfirmed: number;
  total: number;
};

/**
 * A single unspent transaction output owned by the connected account.
 */
export type BitcoinUtxo = {
  txid: string;
  vout: number;
  satoshis: number;
  scriptPk: string;
  address: string;
};

/**
 * Identifies one PSBT input the wallet should sign, restricting the sign
 * request to a specific address, public key and/or set of sighash types.
 */
export type SignPsbtToSignInput = {
  index: number;
  address?: string;
  publicKey?: string;
  sighashTypes?: number[];
};

/**
 * Options accepted by signPsbt. Lace always finalizes the inputs it signs, so
 * there is no option to return a partially signed PSBT.
 */
export type SignPsbtOptions = {
  toSignInputs?: SignPsbtToSignInput[];
};

/**
 * dApp-facing Bitcoin wallet API exposed as window.bitcoin.lace, following the
 * de facto API shape popularized by Unisat and OKX.
 */
export interface BitcoinWalletApi {
  /**
   * Returns the addresses of the connected account.
   */
  getAccounts(): Promise<string[]>;

  /**
   * Returns the network the connected account operates on.
   */
  getNetwork(): Promise<'mainnet' | 'testnet'>;

  /**
   * Returns the connected account's balance.
   */
  getBalance(): Promise<BitcoinBalance>;

  /**
   * Returns the unspent transaction outputs owned by the connected account.
   */
  getUtxos(): Promise<BitcoinUtxo[]>;

  /**
   * Signs a plain text message with the connected account's key.
   * @param message - Message to sign
   * @param type - Signature scheme; defaults to 'ecdsa'
   * @returns Base64-encoded signature
   */
  signMessage(
    message: string,
    type?: 'bip322-simple' | 'ecdsa',
  ): Promise<string>;

  /**
   * Signs a single PSBT. The signed inputs are always finalized; a request to
   * skip finalization is rejected.
   * @param psbtHex - Hex-encoded PSBT, as the Unisat/OKX API defines it
   * @param options - Which inputs to sign
   * @returns Hex-encoded, finalized PSBT
   */
  signPsbt(psbtHex: string, options?: SignPsbtOptions): Promise<string>;

  /**
   * Builds, signs and broadcasts a transaction paying satoshis to toAddress.
   * @param toAddress - Recipient address
   * @param satoshis - Amount to send, in satoshi
   * @param options - Fee rate override
   * @returns Transaction id
   */
  sendBitcoin(
    toAddress: string,
    satoshis: number,
    options?: { feeRate?: number },
  ): Promise<string>;

  /**
   * Broadcasts a raw signed transaction.
   * @param rawTxHex - Hex-encoded raw transaction
   * @returns Transaction id
   */
  pushTx(rawTxHex: string): Promise<string>;
}

/**
 * Extension messaging sender appended to every wallet API call by the
 * service-worker channel, letting methods resolve the calling dApp origin.
 */
export type SenderContext = { sender: Runtime.MessageSender };

type FunctionWithSender<T> = T extends (...args: infer Args) => infer R
  ? (...args: [...Args, SenderContext]) => R
  : T;

/**
 * Maps an API surface so every method receives a trailing SenderContext.
 */
export type WithSenderContext<T> = {
  [K in keyof T]: FunctionWithSender<T[K]>;
};
