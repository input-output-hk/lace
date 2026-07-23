import {
  createReader,
  forEachMapEntry,
  peekIsMap,
  peekIsTag,
  readArrayLength,
  readTag,
  readUint,
} from '@lace-lib/ur-transport';

import { serializeExtendedPublicKey, XPUB_VERSION_MAINNET } from '../crypto';

import type { CborReader } from '@lace-lib/ur-transport';

/** IANA and legacy CBOR tag numbers for BC-UR crypto-hdkey. */
export const HDKEY_TAGS = [40_303, 303];
/** IANA and legacy CBOR tag numbers for BC-UR keypath. */
export const KEYPATH_TAGS = [40_304, 304];

// crypto-hdkey map keys per BCR-2020-007.
const HDKEY_KEY_IS_MASTER = 1;
const HDKEY_KEY_IS_PRIVATE = 2;
const HDKEY_KEY_KEY_DATA = 3;
const HDKEY_KEY_CHAIN_CODE = 4;
const HDKEY_KEY_ORIGIN = 6;
const HDKEY_KEY_PARENT_FINGERPRINT = 8;

const KEYPATH_KEY_COMPONENTS = 1;
const KEYPATH_KEY_SOURCE_FINGERPRINT = 2;
const KEYPATH_KEY_DEPTH = 3;

const HARDENED_OFFSET = 0x80_00_00_00;

/** Supported BIP-script types inferred from the derivation purpose. */
export type BitcoinScriptType =
  | 'Legacy'
  | 'NativeSegWit'
  | 'NestedSegWit'
  | 'Taproot'
  | 'Unknown';

/** A single BIP-32 derivation component. */
export interface PathComponent {
  index: number;
  hardened: boolean;
}

/** A decoded BC-UR crypto-hdkey account export. */
export interface DecodedHdKey {
  /** Reconstructed Base58Check extended public key, always mainnet (xpub) versioned. */
  xpubBase58: string;
  /** Full origin derivation path as index/hardened components. */
  originPath: PathComponent[];
  /** First path component index, e.g. 84 for BIP-84. */
  purpose: number;
  /** Second path component index, the SLIP-44 coin type (0 BTC, 1 testnet). */
  coinType: number;
  /** Third path component index, the account number. */
  account: number;
  /** Master key fingerprint as 8-char lowercase hex. */
  sourceFingerprintHex: string;
  /** Script type inferred from {@link purpose}. */
  scriptType: BitcoinScriptType;
}

/**
 * Tolerant top-level tag reader for BC-UR registry types. BC-UR omits the
 * outermost registry tag from the UR payload because the UR type string already
 * conveys it (a real ur:crypto-account / ur:crypto-hdkey body decodes to a bare
 * CBOR map at the top level), while inner descriptors stay tagged.
 *
 * - tag whose number is in tags   -> consume it, positioning on the inner value
 * - tag whose number is NOT in tags -> throw (genuinely wrong type)
 * - not a tag                     -> leave the reader untouched (UR-untagged form)
 *
 * Only use this for the OUTERMOST top-level registry tag. Inner descriptor tags
 * remain strictly required.
 */
export const skipOptionalTopLevelTag = (
  reader: CborReader,
  tags: number[],
  context: string,
): void => {
  if (!peekIsTag(reader)) {
    return;
  }
  const tag = readTag(reader);
  if (!tags.includes(tag)) {
    throw new Error(`unexpected tag ${tag} for ${context}`);
  }
};

/** Requires the reader to be positioned on a definite-length CBOR map. */
export const expectMap = (reader: CborReader, context: string): void => {
  if (!peekIsMap(reader)) {
    throw new Error(`expected CBOR map for ${context}`);
  }
};

/** Reads a required tag, throwing if absent or not one of the allowed numbers. */
const readExpectedTag = (
  reader: CborReader,
  tags: number[],
  context: string,
): void => {
  if (!peekIsTag(reader)) {
    throw new Error(`expected tagged ${context}`);
  }
  const tag = readTag(reader);
  if (!tags.includes(tag)) {
    throw new Error(`unexpected tag ${tag} for ${context}`);
  }
};

const scriptTypeForPurpose = (purpose: number): BitcoinScriptType => {
  switch (purpose) {
    case 84:
      return 'NativeSegWit';
    case 49:
      return 'NestedSegWit';
    case 86:
      return 'Taproot';
    case 44:
      return 'Legacy';
    default:
      return 'Unknown';
  }
};

const toHex8 = (value: number): string =>
  (value >>> 0).toString(16).padStart(8, '0');

interface ParsedKeypath {
  components: PathComponent[];
  sourceFingerprint?: number;
  depth?: number;
}

const readComponents = (reader: CborReader): PathComponent[] => {
  const length = readArrayLength(reader);
  if (length % 2 !== 0) {
    throw new Error('keypath components must be index/hardened pairs');
  }
  const components: PathComponent[] = [];
  for (let index = 0; index < length; index += 2) {
    const componentIndex = readUint(reader);
    const isHardened = reader.readBoolean();
    components.push({ index: componentIndex, hardened: isHardened });
  }
  reader.readEndArray();
  return components;
};

const readKeypath = (reader: CborReader): ParsedKeypath => {
  readExpectedTag(reader, KEYPATH_TAGS, 'keypath');
  expectMap(reader, 'keypath');
  let components: PathComponent[] = [];
  let sourceFingerprint: number | undefined;
  let depth: number | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case KEYPATH_KEY_COMPONENTS:
        components = readComponents(reader);
        break;
      case KEYPATH_KEY_SOURCE_FINGERPRINT:
        sourceFingerprint = readUint(reader);
        break;
      case KEYPATH_KEY_DEPTH:
        depth = readUint(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  return { components, sourceFingerprint, depth };
};

const childNumberFor = (components: PathComponent[]): number => {
  if (components.length === 0) {
    return 0;
  }
  const last = components[components.length - 1];
  if (
    !Number.isInteger(last.index) ||
    last.index < 0 ||
    last.index >= HARDENED_OFFSET
  ) {
    throw new Error(`keypath component index out of range: ${last.index}`);
  }
  return last.index + (last.hardened ? HARDENED_OFFSET : 0);
};

/**
 * Decodes a BC-UR crypto-hdkey map into a single-sig account export,
 * reconstructing the Base58Check extended public key. The reader must be
 * positioned at the start of the map (any outer tag already consumed). Accepts
 * both new IANA tags (40303/40304) and legacy tags (303/304) for the inner
 * keypath.
 *
 * The extended key is ALWAYS serialized with the mainnet (xpub) version for both
 * networks. Lace stores Bitcoin account extended public keys this way because
 * '@scure/bip32' HDKey.fromExtendedKey recognizes only mainnet versions; the
 * network is tracked separately via the keypath coin-type and the account
 * networkId. BIP-32 version bytes do not affect child derivation or key material.
 */
export const decodeHdKeyMap = (reader: CborReader): DecodedHdKey => {
  expectMap(reader, 'crypto-hdkey');
  let isMaster = false;
  let isPrivate = false;
  let keyData: Uint8Array | undefined;
  let chainCode: Uint8Array | undefined;
  let origin: ParsedKeypath | undefined;
  let parentFingerprint = 0;

  forEachMapEntry(reader, key => {
    switch (key) {
      case HDKEY_KEY_IS_MASTER:
        isMaster = reader.readBoolean();
        break;
      case HDKEY_KEY_IS_PRIVATE:
        isPrivate = reader.readBoolean();
        break;
      case HDKEY_KEY_KEY_DATA:
        keyData = reader.readByteString();
        break;
      case HDKEY_KEY_CHAIN_CODE:
        chainCode = reader.readByteString();
        break;
      case HDKEY_KEY_ORIGIN:
        origin = readKeypath(reader);
        break;
      case HDKEY_KEY_PARENT_FINGERPRINT:
        parentFingerprint = readUint(reader);
        break;
      default:
        reader.skipValue();
    }
  });

  if (isMaster) {
    throw new Error('expected a derived crypto-hdkey, got a master key');
  }
  if (isPrivate) {
    throw new Error('crypto-hdkey must be a public key, got a private key');
  }
  if (keyData === undefined || keyData.length !== 33) {
    throw new Error('crypto-hdkey key-data must be a 33-byte compressed key');
  }
  if (chainCode === undefined || chainCode.length !== 32) {
    throw new Error('crypto-hdkey chain-code must be 32 bytes');
  }
  if (origin === undefined) {
    throw new Error('crypto-hdkey is missing an origin keypath');
  }
  if (origin.components.length < 3) {
    throw new Error('crypto-hdkey origin must have at least 3 components');
  }
  if (origin.sourceFingerprint === undefined) {
    throw new Error('crypto-hdkey origin is missing a source-fingerprint');
  }

  const purpose = origin.components[0].index;
  const coinType = origin.components[1].index;
  const account = origin.components[2].index;
  const depth = origin.depth ?? origin.components.length;

  const xpubBase58 = serializeExtendedPublicKey({
    version: XPUB_VERSION_MAINNET,
    depth,
    parentFingerprint,
    childNumber: childNumberFor(origin.components),
    chainCode,
    publicKey: keyData,
  });

  return {
    xpubBase58,
    originPath: origin.components,
    purpose,
    coinType,
    account,
    sourceFingerprintHex: toHex8(origin.sourceFingerprint),
    scriptType: scriptTypeForPurpose(purpose),
  };
};

/**
 * Decodes a BC-UR crypto-hdkey CBOR body into an account export. Tolerates the
 * UR-untagged top-level form (bare CBOR map) as produced by real devices, as
 * well as the tagged form. The inner keypath tag stays strictly required.
 */
export const decodeCryptoHdKey = (cbor: Uint8Array): DecodedHdKey => {
  const reader = createReader(cbor);
  skipOptionalTopLevelTag(reader, HDKEY_TAGS, 'crypto-hdkey');
  return decodeHdKeyMap(reader);
};
