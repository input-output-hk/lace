import { Buffer } from 'buffer';

import {
  CryptoAccount,
  CryptoHDKey,
  CryptoKeypath,
  CryptoOutput,
  PathComponent,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry';
import { describe, expect, it } from 'vitest';

import { decodeAccountExport, decodeCryptoAccount } from '../src';

import {
  buildKeystoneMultiScriptAccountCbor,
  type HdKeyFixture,
} from './fixtures/build';

const PUBLIC_KEY = Uint8Array.from(
  Buffer.from(
    '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
    'hex',
  ),
);
const CHAIN_CODE = Uint8Array.from(
  Buffer.from(
    '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508',
    'hex',
  ),
);

const MASTER_FINGERPRINT = 0xe9_18_1c_f3;
const MASTER_FINGERPRINT_HEX = 'e9181cf3';
const PARENT_FINGERPRINT = Buffer.from('12345678', 'hex');

const fixtureForPurpose = (purpose: number): HdKeyFixture => ({
  publicKey: PUBLIC_KEY,
  chainCode: CHAIN_CODE,
  components: [
    { index: purpose, hardened: true },
    { index: 0, hardened: true },
    { index: 0, hardened: true },
  ],
  sourceFingerprint: MASTER_FINGERPRINT,
  depth: 3,
});

const registryHdKey = (purpose: number): CryptoHDKey =>
  new CryptoHDKey({
    isMaster: false,
    key: Buffer.from(PUBLIC_KEY),
    chainCode: Buffer.from(CHAIN_CODE),
    origin: new CryptoKeypath(
      [
        new PathComponent({ index: purpose, hardened: true }),
        new PathComponent({ index: 0, hardened: true }),
        new PathComponent({ index: 0, hardened: true }),
      ],
      Buffer.from(MASTER_FINGERPRINT_HEX, 'hex'),
      3,
    ),
    parentFingerprint: PARENT_FINGERPRINT,
  });

/**
 * A multi-descriptor account as the Keystone registry encoder emits it: pkh
 * (BIP-44), sh(wpkh) (BIP-49) and wpkh (BIP-84) descriptors, legacy registry
 * tags and an untagged top-level map. The 0.8.x registry cannot express
 * taproot descriptors, so the tr (BIP-86) branch is covered by the
 * hand-encoded fixture below.
 */
const registryAccountCbor = (): Uint8Array =>
  Uint8Array.from(
    new CryptoAccount(Buffer.from(MASTER_FINGERPRINT_HEX, 'hex'), [
      new CryptoOutput([ScriptExpressions.PUBLIC_KEY_HASH], registryHdKey(44)),
      new CryptoOutput(
        [
          ScriptExpressions.SCRIPT_HASH,
          ScriptExpressions.WITNESS_PUBLIC_KEY_HASH,
        ],
        registryHdKey(49),
      ),
      new CryptoOutput(
        [ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
        registryHdKey(84),
      ),
    ]).toCBOR() as Uint8Array,
  );

describe('Keystone crypto-account export (registry-encoded, multi script type)', () => {
  const decoded = decodeCryptoAccount(registryAccountCbor());

  it('selects the bare wpkh descriptor among pkh and sh(wpkh)', () => {
    expect(decoded.purpose).toBe(84);
    expect(decoded.coinType).toBe(0);
    expect(decoded.account).toBe(0);
    expect(decoded.scriptType).toBe('NativeSegWit');
  });

  it('reads the device master fingerprint from the selected descriptor', () => {
    expect(decoded.sourceFingerprintHex).toBe(MASTER_FINGERPRINT_HEX);
  });

  it('reconstructs a mainnet-versioned xpub', () => {
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('dispatches through decodeAccountExport for the crypto-account UR type', () => {
    const dispatched = decodeAccountExport({
      urType: 'crypto-account',
      cbor: registryAccountCbor(),
    });
    expect(dispatched).toEqual(decoded);
  });
});

describe('Keystone crypto-account export (hand-encoded, includes taproot)', () => {
  const decoded = decodeCryptoAccount(
    buildKeystoneMultiScriptAccountCbor(MASTER_FINGERPRINT, {
      legacy: fixtureForPurpose(44),
      nestedSegwit: fixtureForPurpose(49),
      nativeSegwit: fixtureForPurpose(84),
      taproot: fixtureForPurpose(86),
    }),
  );

  it('selects the bare wpkh descriptor among pkh, sh(wpkh) and tr', () => {
    expect(decoded.purpose).toBe(84);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.sourceFingerprintHex).toBe(MASTER_FINGERPRINT_HEX);
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });
});
