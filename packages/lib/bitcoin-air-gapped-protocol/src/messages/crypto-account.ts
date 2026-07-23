import {
  createReader,
  forEachMapEntry,
  peekIsTag,
  readArrayLength,
  readTag,
} from '@lace-lib/ur-transport';

import {
  decodeHdKeyMap,
  expectMap,
  HDKEY_TAGS,
  skipOptionalTopLevelTag,
} from './crypto-hdkey';
import { MultisigNotSupportedError, WrongScriptTypeError } from './errors';

import type { DecodedHdKey } from './crypto-hdkey';
import type { CborReader } from '@lace-lib/ur-transport';

/** IANA and legacy CBOR tag numbers for BC-UR crypto-account. */
export const ACCOUNT_TAGS = [40_311, 311];
/** IANA and legacy CBOR tag numbers for BC-UR crypto-output. */
export const OUTPUT_TAGS = [40_308, 308];

const WPKH_TAGS = [40_404, 404];
const PKH_TAGS = [40_403, 403];
const SH_TAGS = [40_400, 400];
const WSH_TAGS = [40_401, 401];
const TR_TAGS = [40_409, 409];
const MULTI_TAGS = [40_405, 405];
const SORTED_MULTI_TAGS = [40_406, 406];

const ACCOUNT_KEY_OUTPUT_DESCRIPTORS = 2;

const includesTag = (tags: number[], tag: number): boolean =>
  tags.includes(tag);

/**
 * A decoded descriptor: a resolved hdkey (with whether it came from a bare wpkh
 * script), or a multisig / nested-segwit placeholder whose error is deferred
 * until the descriptor is actually selected. This mirrors the original tree
 * decoder, which only threw for the selected descriptor.
 */
type DescriptorResult =
  | { kind: 'hdkey'; isWpkh: boolean; decoded: DecodedHdKey }
  | { kind: 'multisig' }
  | { kind: 'nestedSegwit' };

const readRequiredTag = (reader: CborReader, context: string): number => {
  if (!peekIsTag(reader)) {
    throw new Error(`expected tagged ${context}`);
  }
  return readTag(reader);
};

const readHdKeyFromTag = (reader: CborReader): DecodedHdKey => {
  const tag = readRequiredTag(reader, 'crypto-hdkey');
  if (!includesTag(HDKEY_TAGS, tag)) {
    throw new Error(`expected crypto-hdkey, got tag ${tag}`);
  }
  return decodeHdKeyMap(reader);
};

/**
 * Reads one script descriptor content given its already-consumed tag, recursing
 * through script-type wrappers. Only a BARE native-segwit single-key (wpkh) is
 * accepted as wpkh; a wpkh nested inside an sh/wsh wrapper (BIP-49 nested
 * segwit) yields a deferred WrongScriptTypeError result. Multisig wrappers
 * (multi/sortedmulti) yield a deferred MultisigNotSupportedError result.
 */
const readScriptContent = (
  reader: CborReader,
  tag: number,
): DescriptorResult => {
  if (includesTag(MULTI_TAGS, tag) || includesTag(SORTED_MULTI_TAGS, tag)) {
    reader.skipValue();
    return { kind: 'multisig' };
  }
  const isWpkh = includesTag(WPKH_TAGS, tag);
  if (includesTag(SH_TAGS, tag) || includesTag(WSH_TAGS, tag)) {
    const innerTag = readRequiredTag(reader, 'script wrapper content');
    const inner = readScriptContent(reader, innerTag);
    if (inner.kind === 'hdkey' && inner.isWpkh) {
      return { kind: 'nestedSegwit' };
    }
    return inner;
  }
  if (isWpkh || includesTag(PKH_TAGS, tag) || includesTag(TR_TAGS, tag)) {
    return { kind: 'hdkey', isWpkh, decoded: readHdKeyFromTag(reader) };
  }
  if (includesTag(HDKEY_TAGS, tag)) {
    return {
      kind: 'hdkey',
      isWpkh: false,
      decoded: decodeHdKeyMap(reader),
    };
  }
  throw new Error(`unsupported crypto-output script tag: ${tag}`);
};

/**
 * Reads one output descriptor from the array. Accepts a crypto-output(308)
 * wrapper as well as a bare script-type descriptor (wpkh/pkh/tr/sh/wsh/hdkey)
 * passed directly, as produced by real SeedSigner devices.
 */
const readDescriptor = (reader: CborReader): DescriptorResult => {
  const tag = readRequiredTag(reader, 'crypto-output');
  if (includesTag(OUTPUT_TAGS, tag)) {
    const contentTag = readRequiredTag(reader, 'crypto-output content');
    return readScriptContent(reader, contentTag);
  }
  return readScriptContent(reader, tag);
};

const selectDescriptor = (descriptors: DescriptorResult[]): DecodedHdKey => {
  const wpkh = descriptors.find(
    (
      descriptor,
    ): descriptor is {
      kind: 'hdkey';
      isWpkh: boolean;
      decoded: DecodedHdKey;
    } => descriptor.kind === 'hdkey' && descriptor.isWpkh,
  );
  const selected = wpkh ?? descriptors[0];
  if (selected.kind === 'multisig') {
    throw new MultisigNotSupportedError();
  }
  if (selected.kind === 'nestedSegwit') {
    throw new WrongScriptTypeError();
  }
  return selected.decoded;
};

/**
 * Decodes a BC-UR crypto-account CBOR body, selecting the single-key BARE
 * native-segwit (wpkh) output descriptor. Falls back to the first descriptor
 * when no bare wpkh descriptor is present; a selected multisig or nested-segwit
 * sh(wpkh) descriptor throws its deferred domain error. Tolerates the
 * UR-untagged top-level form (bare CBOR map) produced by real devices as well
 * as the tagged form. Inner output descriptors stay strictly tagged. Accepts
 * new IANA and legacy tags.
 */
export const decodeCryptoAccount = (cbor: Uint8Array): DecodedHdKey => {
  const reader = createReader(cbor);
  skipOptionalTopLevelTag(reader, ACCOUNT_TAGS, 'crypto-account');
  expectMap(reader, 'crypto-account');

  let descriptors: DescriptorResult[] | undefined;
  forEachMapEntry(reader, key => {
    if (key === ACCOUNT_KEY_OUTPUT_DESCRIPTORS) {
      const length = readArrayLength(reader);
      const collected: DescriptorResult[] = [];
      for (let index = 0; index < length; index++) {
        collected.push(readDescriptor(reader));
      }
      reader.readEndArray();
      descriptors = collected;
    } else {
      reader.skipValue();
    }
  });

  if (descriptors === undefined) {
    throw new Error('crypto-account output descriptors must be an array');
  }
  if (descriptors.length === 0) {
    throw new Error('crypto-account has no output descriptors');
  }
  return selectDescriptor(descriptors);
};
