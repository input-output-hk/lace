// Most fixtures are spec-encoded (synthesized); REAL_SEED_SIGNER_ACCOUNT_HEX is
// a real crypto-account capture from a physical SeedSigner. A real crypto-psbt
// capture is still pending task SS-29 hardware validation.

import { CborWriter } from './cbor-writer';

const HDKEY_TAG = 40_303;
const KEYPATH_TAG = 40_304;
const COININFO_TAG = 40_305;
const ACCOUNT_TAG = 40_311;
const OUTPUT_TAG = 40_308;
const WPKH_TAG = 40_404;
const SH_TAG = 40_400;
const SORTED_MULTI_TAG = 40_406;
const LEGACY_HDKEY_TAG = 303;
const LEGACY_PKH_TAG = 403;
const LEGACY_WPKH_TAG = 404;
const LEGACY_SH_TAG = 400;
const LEGACY_TR_TAG = 409;

/** A single derivation component for fixture keypaths. */
export interface FixtureComponent {
  index: number;
  hardened: boolean;
}

/** Inputs for {@link buildHdKeyCbor}. */
export interface HdKeyFixture {
  publicKey: Uint8Array;
  chainCode: Uint8Array;
  components: FixtureComponent[];
  sourceFingerprint: number;
  parentFingerprint?: number;
  depth?: number;
  coinType?: number;
  network?: number;
  legacyTags?: boolean;
  omitCoinInfo?: boolean;
}

const writeKeypath = (
  writer: CborWriter,
  fixture: HdKeyFixture,
  isLegacy: boolean,
): void => {
  writer.writeTag(isLegacy ? 304 : KEYPATH_TAG);
  const entries = 2 + (fixture.depth === undefined ? 0 : 1);
  writer.writeMapHeader(entries);
  writer.writeUint(1);
  writer.writeArrayHeader(fixture.components.length * 2);
  for (const component of fixture.components) {
    writer.writeUint(component.index);
    writer.writeBool(component.hardened);
  }
  writer.writeUint(2);
  writer.writeUint(fixture.sourceFingerprint);
  if (fixture.depth !== undefined) {
    writer.writeUint(3);
    writer.writeUint(fixture.depth);
  }
};

const writeCoinInfo = (
  writer: CborWriter,
  fixture: HdKeyFixture,
  isLegacy: boolean,
): void => {
  writer.writeTag(isLegacy ? 305 : COININFO_TAG);
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(fixture.coinType ?? 0);
  writer.writeUint(2);
  writer.writeUint(fixture.network ?? 0);
};

const writeHdKeyMap = (writer: CborWriter, fixture: HdKeyFixture): void => {
  const isLegacy = fixture.legacyTags === true;
  const hasCoinInfo = fixture.omitCoinInfo !== true;
  writer.writeMapHeader(hasCoinInfo ? 5 : 4);
  writer.writeUint(1);
  writer.writeBool(false);
  writer.writeUint(3);
  writer.writeBytes(fixture.publicKey);
  writer.writeUint(4);
  writer.writeBytes(fixture.chainCode);
  if (hasCoinInfo) {
    writer.writeUint(5);
    writeCoinInfo(writer, fixture, isLegacy);
  }
  writer.writeUint(6);
  writeKeypath(writer, fixture, isLegacy);
};

/** Builds a tagged crypto-hdkey CBOR body from fixture parts. */
export const buildHdKeyCbor = (fixture: HdKeyFixture): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(fixture.legacyTags === true ? 303 : HDKEY_TAG);
  writeHdKeyMap(writer, fixture);
  return writer.toBytes();
};

/**
 * Builds a UR-untagged crypto-hdkey CBOR body: the same map as
 * {@link buildHdKeyCbor} but WITHOUT the outer crypto-hdkey tag, mimicking a
 * real device export where BC-UR omits the top-level registry tag. Inner
 * keypath/coininfo tags stay intact.
 */
export const buildUntaggedHdKeyCbor = (fixture: HdKeyFixture): Uint8Array => {
  const writer = new CborWriter();
  writeHdKeyMap(writer, fixture);
  return writer.toBytes();
};

const writeWpkhAccountMap = (
  writer: CborWriter,
  masterFingerprint: number,
  fixture: HdKeyFixture,
): void => {
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(1);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(WPKH_TAG);
  writer.writeTag(HDKEY_TAG);
  writeHdKeyMap(writer, fixture);
};

/** Builds a tagged crypto-account CBOR body wrapping a single wpkh descriptor. */
export const buildWpkhAccountCbor = (
  masterFingerprint: number,
  fixture: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(ACCOUNT_TAG);
  writeWpkhAccountMap(writer, masterFingerprint, fixture);
  return writer.toBytes();
};

/**
 * Builds a UR-untagged crypto-account CBOR body: the same map as
 * {@link buildWpkhAccountCbor} but WITHOUT the outer crypto-account tag,
 * mimicking a real SeedSigner Sparrow export where BC-UR omits the top-level
 * registry tag. Inner crypto-output/wpkh/hdkey tags stay intact.
 */
export const buildUntaggedWpkhAccountCbor = (
  masterFingerprint: number,
  fixture: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writeWpkhAccountMap(writer, masterFingerprint, fixture);
  return writer.toBytes();
};

/** Builds a crypto-account CBOR body wrapped in a WRONG outer tag (hdkey tag). */
export const buildWrongOuterTagAccountCbor = (
  masterFingerprint: number,
  fixture: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(HDKEY_TAG);
  writeWpkhAccountMap(writer, masterFingerprint, fixture);
  return writer.toBytes();
};

/** Builds a top-level CBOR value that is neither the account tag nor a map. */
export const buildNonMapTopLevelCbor = (): Uint8Array => {
  const writer = new CborWriter();
  writer.writeArrayHeader(0);
  return writer.toBytes();
};

/** Builds a tagged crypto-output CBOR body that is a sortedmulti (multisig). */
export const buildSortedMultiOutputCbor = (): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(SORTED_MULTI_TAG);
  writer.writeMapHeader(0);
  return writer.toBytes();
};

/**
 * REAL device capture: a SeedSigner "Export Xpub -> Sparrow" (crypto-account)
 * output for m/84'/1'/0' (native-segwit, testnet). UR-untagged top-level map;
 * the single descriptor is a BARE wpkh(404) tag wrapping a crypto-hdkey(303)
 * with NO coininfo (key 5). Master/source fingerprint 0x65b64f0b, parent
 * fingerprint 0x70f86b6d. Byte-for-byte as reassembled from the device QR.
 */
export const REAL_SEED_SIGNER_ACCOUNT_HEX =
  'a2011a65b64f0b0281d90194d9012fa4035821023639153470be49c2e0fc82a8c64e2b2a038cd9976601098188fb1a99bdfdb02204582008e5ac65f2ae0ffcf2f72e4b945588b0703ff53c1ade8777f2f2957478d743b706d90130a301861854f501f500f5021a65b64f0b0303081a70f86b6d';

/** Decodes a hex string into the raw CBOR bytes for a golden fixture. */
export const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

/** Builds a tagged crypto-account CBOR body whose only descriptor is multisig. */
export const buildMultisigAccountCbor = (
  masterFingerprint: number,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(ACCOUNT_TAG);
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(1);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(SORTED_MULTI_TAG);
  writer.writeMapHeader(0);
  return writer.toBytes();
};

/**
 * Builds a tagged crypto-account whose only descriptor is sh(wpkh(...)), the
 * BIP-49 nested-segwit form.
 */
export const buildShWpkhAccountCbor = (
  masterFingerprint: number,
  fixture: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(ACCOUNT_TAG);
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(1);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(SH_TAG);
  writer.writeTag(WPKH_TAG);
  writer.writeTag(HDKEY_TAG);
  writeHdKeyMap(writer, fixture);
  return writer.toBytes();
};

/**
 * Builds a tagged crypto-account whose descriptor array is
 * [sh(wpkh), wpkh]: the nested-segwit descriptor must be skipped and the bare
 * wpkh descriptor selected.
 */
export const buildShWpkhThenWpkhAccountCbor = (
  masterFingerprint: number,
  nested: HdKeyFixture,
  native: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(ACCOUNT_TAG);
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(2);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(SH_TAG);
  writer.writeTag(WPKH_TAG);
  writer.writeTag(HDKEY_TAG);
  writeHdKeyMap(writer, nested);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(WPKH_TAG);
  writer.writeTag(HDKEY_TAG);
  writeHdKeyMap(writer, native);
  return writer.toBytes();
};

/**
 * Builds a tagged crypto-account whose descriptor array is [sortedmulti, wpkh].
 * Locks the streaming selection contract: the multisig descriptor is not the
 * selected one, so it must be skipped (not throw) and the wpkh descriptor picked.
 */
export const buildMultisigThenWpkhAccountCbor = (
  masterFingerprint: number,
  fixture: HdKeyFixture,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeTag(ACCOUNT_TAG);
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(2);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(SORTED_MULTI_TAG);
  writer.writeMapHeader(0);
  writer.writeTag(OUTPUT_TAG);
  writer.writeTag(WPKH_TAG);
  writer.writeTag(HDKEY_TAG);
  writeHdKeyMap(writer, fixture);
  return writer.toBytes();
};

/** Script-type fixtures for {@link buildKeystoneMultiScriptAccountCbor}. */
export interface KeystoneAccountFixtures {
  legacy: HdKeyFixture;
  nestedSegwit: HdKeyFixture;
  nativeSegwit: HdKeyFixture;
  taproot: HdKeyFixture;
}

const writeKeystoneHdKey = (
  writer: CborWriter,
  fixture: HdKeyFixture,
): void => {
  writer.writeTag(LEGACY_HDKEY_TAG);
  writeHdKeyMap(writer, { ...fixture, legacyTags: true, omitCoinInfo: true });
};

/**
 * Builds a Keystone-shaped crypto-account: UR-untagged top-level map, legacy
 * registry tags, no coininfo, and BARE script-type descriptors (no
 * crypto-output wrapper), covering the four script types the device's
 * connect-software-wallet export carries (pkh, sh(wpkh), wpkh, tr). The bare
 * wpkh descriptor is the one the decoder must select.
 */
export const buildKeystoneMultiScriptAccountCbor = (
  masterFingerprint: number,
  fixtures: KeystoneAccountFixtures,
): Uint8Array => {
  const writer = new CborWriter();
  writer.writeMapHeader(2);
  writer.writeUint(1);
  writer.writeUint(masterFingerprint);
  writer.writeUint(2);
  writer.writeArrayHeader(4);
  writer.writeTag(LEGACY_PKH_TAG);
  writeKeystoneHdKey(writer, fixtures.legacy);
  writer.writeTag(LEGACY_SH_TAG);
  writer.writeTag(LEGACY_WPKH_TAG);
  writeKeystoneHdKey(writer, fixtures.nestedSegwit);
  writer.writeTag(LEGACY_WPKH_TAG);
  writeKeystoneHdKey(writer, fixtures.nativeSegwit);
  writer.writeTag(LEGACY_TR_TAG);
  writeKeystoneHdKey(writer, fixtures.taproot);
  return writer.toBytes();
};
