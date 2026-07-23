/**
 * Minimal surface of a Trezor Connect instance used for Bitcoin onboarding
 * and transaction signing. Both the web ('@trezor/connect-web') and mobile
 * ('@trezor/connect-mobile') singletons satisfy it structurally, so the
 * shared Bitcoin account connector and signer stay free of platform
 * transport details.
 */
export interface TrezorBitcoinConnect {
  getPublicKey: (params: {
    bundle: TrezorGetPublicKeyBundleItem[];
  }) => Promise<TrezorGetPublicKeyBundleResponse>;
  signTransaction: (
    params: TrezorSignTransactionParams,
  ) => Promise<TrezorSignTransactionResponse>;
}

/** One BIP-32 node request within a getPublicKey bundle. */
export interface TrezorGetPublicKeyBundleItem {
  /** Serialized derivation path, e.g. "m/84'/0'/0'". */
  path: string;
  /** Trezor coin shortcut ('btc', 'test'); omitted for coin-less probes. */
  coin?: string;
  showOnTrezor: boolean;
}

/**
 * The HDNode fields Lace consumes from a getPublicKey response. `fingerprint`
 * is the BIP-32 fingerprint of the PARENT node, not of the node itself.
 */
export interface TrezorHdNode {
  depth: number;
  childNum: number;
  fingerprint: number;
  /** 32-byte chain code, hex encoded. */
  chainCode: string;
  /** 33-byte compressed public key, hex encoded. */
  publicKey: string;
  xpub: string;
}

/**
 * Bundle response envelope. `device` is left as unknown because the Connect
 * typings understate what the runtime provides: the raw response carries the
 * device features, which mobile narrows to read the Suite `device_id` and
 * derive a stable wallet id per physical device.
 */
export type TrezorGetPublicKeyBundleResponse =
  | { success: false; payload: { error: string } }
  | { success: true; payload: TrezorHdNode[]; device?: unknown };

/**
 * One transaction input in Trezor's input/output signing model. `amount` and
 * hex fields are strings so satoshi values never touch floating point.
 */
export interface TrezorTxInput {
  /** Previous transaction id in display (big-endian) order. */
  prev_hash: string;
  prev_index: number;
  /** Spent amount in satoshis. */
  amount: string;
  /** Full BIP-32 path as numbers, hardened segments offset by 0x80000000. */
  address_n: number[];
  script_type: 'SPENDWITNESS';
  /** Input nSequence; when omitted the firmware defaults to final (0xffffffff). */
  sequence?: number;
}

/**
 * One transaction output. Change is addressed by derivation path so the
 * device verifies it against its own seed instead of displaying it.
 */
export type TrezorTxOutput =
  | { address_n: number[]; amount: string; script_type: 'PAYTOWITNESS' }
  | { address: string; amount: string; script_type: 'PAYTOADDRESS' }
  | { op_return_data: string; amount: '0'; script_type: 'PAYTOOPRETURN' };

export interface TrezorRefTransactionInput {
  prev_hash: string;
  prev_index: number;
  script_sig: string;
  sequence: number;
}

export interface TrezorRefTransactionBinOutput {
  amount: string;
  script_pubkey: string;
}

/**
 * A previous transaction referenced by an input. Supplying these lets the
 * device verify input amounts without Connect fetching them from a backend.
 */
export interface TrezorRefTransaction {
  /** Transaction id in display (big-endian) order. */
  hash: string;
  version: number;
  lock_time: number;
  inputs: TrezorRefTransactionInput[];
  bin_outputs: TrezorRefTransactionBinOutput[];
}

export interface TrezorSignTransactionParams {
  /** Trezor coin shortcut ('btc', 'test'). */
  coin: string;
  inputs: TrezorTxInput[];
  outputs: TrezorTxOutput[];
  refTxs: TrezorRefTransaction[];
  /** Transaction version; when omitted the firmware defaults to 1. */
  version?: number;
  /** Transaction locktime; when omitted the firmware defaults to 0. */
  locktime?: number;
}

/**
 * signTransaction response envelope. On success `serializedTx` is the fully
 * signed raw transaction, hex encoded.
 */
export type TrezorSignTransactionResponse =
  | { success: false; payload: { error: string } }
  | { success: true; payload: { serializedTx: string } };
