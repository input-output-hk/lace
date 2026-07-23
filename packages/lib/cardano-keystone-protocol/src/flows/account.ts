import { Buffer } from 'buffer';

import {
  CryptoMultiAccounts,
  Curve,
  DerivationAlgorithm,
  KeyDerivation,
  KeyDerivationSchema,
  QRHardwareCall,
  QRHardwareCallType,
  QRHardwareCallVersion,
} from '@keystonehq/bc-ur-registry';

import {
  FingerprintMismatchError,
  InvalidAccountPathError,
  KeystoneProtocolError,
  MissingProtocolFieldError,
} from '../errors';
import { KeystoneUrType } from '../ur-types';
import {
  COIN_TYPE_ADA,
  DerivationPath,
  HARDENED_OFFSET,
  PURPOSE_CIP1852,
} from '../value-objects/derivation-path.vo';
import { Xfp } from '../value-objects/xfp.vo';

import { assertUrType, toCborBytes, toKeypath } from './registry-helpers';

import type { CryptoHDKey, CryptoKeypath } from '@keystonehq/bc-ur-registry';
import type { UrResult } from '@lace-lib/ur-transport';

/** Chain type identifier for Cardano in key derivation schemas. */
export const ADA_CHAIN_TYPE = 'ADA';

/** Length in bytes of an account xpub (32 pubkey || 32 chain code). */
export const XPUB_LENGTH = 64;

const PUBLIC_KEY_LENGTH = 32;
const CHAIN_CODE_LENGTH = 32;
const ACCOUNT_PATH_DEPTH = 3;

/** A request message ready to be encoded as an animated UR. */
export interface BuiltRequest {
  urType: string;
  cbor: Uint8Array;
}

/** Options for {@link buildAccountRequest}. */
export interface BuildAccountRequestParams {
  accountIndexes: readonly number[];
  origin?: string;
}

/** One exported account key parsed from a crypto-multi-accounts response. */
export interface ParsedAccountKey {
  path: DerivationPath;
  accountIndex: number;
  publicKey: Uint8Array;
  chainCode: Uint8Array;
  extendedPublicKey: Uint8Array;
}

/** Parsed account export: master fingerprint, device name, and account keys. */
export interface ParsedAccountResponse {
  masterFingerprint: Xfp;
  device: string | undefined;
  accounts: readonly ParsedAccountKey[];
}

/**
 * Builds the CIP-1852 account path m/1852'/1815'/account' for the given
 * account index. Throws when the index is not an integer in [0, 2^31).
 */
export const accountDerivationPath = (accountIndex: number): DerivationPath => {
  if (
    !Number.isInteger(accountIndex) ||
    accountIndex < 0 ||
    accountIndex >= HARDENED_OFFSET
  ) {
    throw new Error(`account index out of range: ${accountIndex}`);
  }
  return DerivationPath([
    PURPOSE_CIP1852 + HARDENED_OFFSET,
    COIN_TYPE_ADA + HARDENED_OFFSET,
    accountIndex + HARDENED_OFFSET,
  ]);
};

const assertAdaSchema = (schema: KeyDerivationSchema): void => {
  if (
    schema.getCurve() !== Curve.ed25519 ||
    schema.getAlgo() !== DerivationAlgorithm.bip32ed25519
  ) {
    throw new KeystoneProtocolError(
      'ADA key derivation schema must use the ed25519 curve with the bip32ed25519 algorithm',
    );
  }
};

/**
 * Builds a qr-hardware-call key derivation request asking the device for the
 * CIP-1852 account xpub(s) at the given account indexes. The registry
 * defaults every schema to secp256k1/slip10, so the curve and algorithm are
 * set explicitly to ed25519/bip32ed25519 as required for Cardano.
 */
export const buildAccountRequest = ({
  accountIndexes,
  origin,
}: BuildAccountRequestParams): BuiltRequest => {
  if (accountIndexes.length === 0) {
    throw new Error('at least one account index is required');
  }
  const schemas = accountIndexes.map(accountIndex => {
    const schema = new KeyDerivationSchema(
      toKeypath(accountDerivationPath(accountIndex)),
      Curve.ed25519,
      DerivationAlgorithm.bip32ed25519,
      ADA_CHAIN_TYPE,
    );
    assertAdaSchema(schema);
    return schema;
  });
  const call = new QRHardwareCall(
    QRHardwareCallType.KeyDerivation,
    new KeyDerivation(schemas),
    origin,
    QRHardwareCallVersion.V0,
  );
  return { urType: KeystoneUrType.AccountRequest, cbor: toCborBytes(call) };
};

const toDerivationPath = (keypath: CryptoKeypath): DerivationPath =>
  DerivationPath(
    keypath.getComponents().map(component => {
      if (component.isWildcard()) {
        throw new InvalidAccountPathError('*');
      }
      return component.isHardened()
        ? component.getIndex() + HARDENED_OFFSET
        : component.getIndex();
    }),
  );

const assertAccountPath = (path: DerivationPath): void => {
  const [purpose, coinType, account] = path;
  if (
    path.length !== ACCOUNT_PATH_DEPTH ||
    purpose !== PURPOSE_CIP1852 + HARDENED_OFFSET ||
    coinType !== COIN_TYPE_ADA + HARDENED_OFFSET ||
    account < HARDENED_OFFSET
  ) {
    throw new InvalidAccountPathError(DerivationPath.toPathString(path));
  }
};

const parseAccountKey = (
  key: CryptoHDKey,
  masterFingerprint: Xfp,
): ParsedAccountKey => {
  const origin: CryptoKeypath | undefined = key.getOrigin();
  if (origin === undefined) {
    throw new MissingProtocolFieldError('key origin path');
  }
  const path = toDerivationPath(origin);
  assertAccountPath(path);
  const sourceFingerprint: Uint8Array | undefined =
    origin.getSourceFingerprint();
  if (
    sourceFingerprint !== undefined &&
    Xfp.toHex(masterFingerprint) !==
      Buffer.from(sourceFingerprint).toString('hex')
  ) {
    throw new FingerprintMismatchError(
      Xfp.toHex(masterFingerprint),
      Buffer.from(sourceFingerprint).toString('hex'),
    );
  }
  const publicKey: Uint8Array | undefined = key.getKey();
  if (publicKey === undefined || publicKey.length === 0) {
    throw new MissingProtocolFieldError('public key');
  }
  if (publicKey.length !== PUBLIC_KEY_LENGTH) {
    throw new KeystoneProtocolError(
      `public key must be ${PUBLIC_KEY_LENGTH} bytes, got ${publicKey.length}`,
    );
  }
  const chainCode: Uint8Array | undefined = key.getChainCode();
  if (chainCode === undefined || chainCode.length === 0) {
    throw new MissingProtocolFieldError('chain code');
  }
  if (chainCode.length !== CHAIN_CODE_LENGTH) {
    throw new KeystoneProtocolError(
      `chain code must be ${CHAIN_CODE_LENGTH} bytes, got ${chainCode.length}`,
    );
  }
  const extendedPublicKey = new Uint8Array(XPUB_LENGTH);
  extendedPublicKey.set(publicKey);
  extendedPublicKey.set(chainCode, PUBLIC_KEY_LENGTH);
  return {
    path,
    accountIndex: path[ACCOUNT_PATH_DEPTH - 1] - HARDENED_OFFSET,
    publicKey: Uint8Array.from(publicKey),
    chainCode: Uint8Array.from(chainCode),
    extendedPublicKey,
  };
};

/**
 * Parses a crypto-multi-accounts response into the master fingerprint,
 * device name, and one entry per exported CIP-1852 account key. Each key must
 * carry a hardened m/1852'/1815'/account' origin path, and any per-key source
 * fingerprint must match the response's master fingerprint. A missing or
 * all-zero master fingerprint is rejected because the registry decodes an
 * absent fingerprint to zero bytes.
 */
export const parseAccountResponse = (
  response: UrResult,
): ParsedAccountResponse => {
  assertUrType(KeystoneUrType.AccountResponse, response);
  const multiAccounts = CryptoMultiAccounts.fromCBOR(
    Buffer.from(response.cbor),
  );
  const fingerprint: Uint8Array | undefined =
    multiAccounts.getMasterFingerprint();
  if (
    fingerprint === undefined ||
    fingerprint.length === 0 ||
    fingerprint.every(byte => byte === 0)
  ) {
    throw new MissingProtocolFieldError('master fingerprint');
  }
  const masterFingerprint = Xfp(Uint8Array.from(fingerprint));
  const keys = multiAccounts.getKeys();
  if (keys.length === 0) {
    throw new MissingProtocolFieldError('keys');
  }
  return {
    masterFingerprint,
    device: multiAccounts.getDevice(),
    accounts: keys.map(key => parseAccountKey(key, masterFingerprint)),
  };
};
