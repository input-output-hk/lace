import type { DeviceDescriptor } from '@lace-lib/util-hw';

/**
 * Per-platform Bitcoin-Ledger transport. Web addons construct WebUSB-backed
 * implementations; mobile addons construct BLE-backed ones. Each call opens a
 * fresh connection to the Ledger Bitcoin app and closes it when done, so
 * cross-platform onboarding code stays free of transport details.
 */
export interface LedgerBitcoinTransport {
  /** Fetch the BIP-32 master key fingerprint as 8-char lowercase hex. */
  getMasterFingerprint: (descriptor: DeviceDescriptor) => Promise<string>;

  /**
   * Fetch the base58 extended public key at the given derivation path
   * (e.g. "m/84'/0'/0'"). Used during onboarding.
   */
  getExtendedPubkey: (
    descriptor: DeviceDescriptor,
    path: string,
  ) => Promise<string>;

  /**
   * Sign a PSBT on the device with the default single-sig native-segwit
   * wallet policy built from the given key origin. Default policies need no
   * on-device registration. The PSBT must carry witnessUtxo/nonWitnessUtxo
   * and a BIP-32 key-origin for every owned input so the device can match
   * its keys. Resolves with one signature per signed input.
   */
  signPsbt: (
    descriptor: DeviceDescriptor,
    props: LedgerBitcoinSignPsbtProps,
  ) => Promise<LedgerBitcoinInputSignature[]>;
}

/** Key origin and payload for a device PSBT signing round. */
export interface LedgerBitcoinSignPsbtProps {
  /** The unsigned PSBT, base64 encoded. */
  psbtBase64: string;
  /** Device BIP-32 master key fingerprint as 8-char lowercase hex. */
  masterFingerprint: string;
  /** Account-level derivation path, e.g. "m/84'/0'/0'". */
  accountPath: string;
  /** Base58 extended public key at {@link accountPath}. */
  extendedPublicKey: string;
}

/** A signature the device produced for one PSBT input. */
export interface LedgerBitcoinInputSignature {
  inputIndex: number;
  /** The public key whose private key produced the signature. */
  pubkey: Uint8Array;
  /** DER-encoded ECDSA signature with the trailing sighash-type byte. */
  signature: Uint8Array;
}
