// SYNTHESIZED fixtures (spec-encoded), NOT captured from a physical device.
// Replace with a real SeedSigner crypto-hdkey/crypto-psbt capture in task SS-29
// hardware validation.

import { Buffer } from 'buffer';

import { describe, expect, it } from 'vitest';

import {
  assertSingleSigNativeSegwit,
  decodeCryptoAccount,
  decodeCryptoHdKey,
  MULTISIG_NOT_SUPPORTED_CODE,
  MultisigNotSupportedError,
  WRONG_SCRIPT_TYPE_CODE,
  WrongScriptTypeError,
} from '../src';

import {
  buildHdKeyCbor,
  buildMultisigAccountCbor,
  type HdKeyFixture,
} from './fixtures/build';
import { CborWriter } from './fixtures/cbor-writer';

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

const baseFixture = (purpose: number): HdKeyFixture => ({
  publicKey: PUBLIC_KEY,
  chainCode: CHAIN_CODE,
  components: [
    { index: purpose, hardened: true },
    { index: 0, hardened: true },
    { index: 0, hardened: true },
  ],
  sourceFingerprint: 0x73_c5_da_0a,
  depth: 3,
});

describe('assertSingleSigNativeSegwit', () => {
  it('passes for native-segwit (purpose 84)', () => {
    const decoded = decodeCryptoHdKey(buildHdKeyCbor(baseFixture(84)));
    expect(() => {
      assertSingleSigNativeSegwit(decoded);
    }).not.toThrow();
  });

  it('throws WrongScriptTypeError for nested-segwit (purpose 49)', () => {
    const decoded = decodeCryptoHdKey(buildHdKeyCbor(baseFixture(49)));
    expect(decoded.scriptType).toBe('NestedSegWit');
    expect(() => {
      assertSingleSigNativeSegwit(decoded);
    }).toThrow(WrongScriptTypeError);
    try {
      assertSingleSigNativeSegwit(decoded);
    } catch (error) {
      expect((error as WrongScriptTypeError).code).toBe(WRONG_SCRIPT_TYPE_CODE);
      expect((error as WrongScriptTypeError).name).toBe(WRONG_SCRIPT_TYPE_CODE);
    }
  });

  it('throws WrongScriptTypeError for taproot (purpose 86)', () => {
    const decoded = decodeCryptoHdKey(buildHdKeyCbor(baseFixture(86)));
    expect(decoded.scriptType).toBe('Taproot');
    expect(() => {
      assertSingleSigNativeSegwit(decoded);
    }).toThrow(WrongScriptTypeError);
  });

  it('throws WrongScriptTypeError for legacy (purpose 44)', () => {
    const decoded = decodeCryptoHdKey(buildHdKeyCbor(baseFixture(44)));
    expect(decoded.scriptType).toBe('Legacy');
    expect(() => {
      assertSingleSigNativeSegwit(decoded);
    }).toThrow(WrongScriptTypeError);
  });
});

describe('multisig rejection', () => {
  it('throws MultisigNotSupportedError when decoding a sortedmulti crypto-account', () => {
    expect(() =>
      decodeCryptoAccount(buildMultisigAccountCbor(0x73_c5_da_0a)),
    ).toThrow(MultisigNotSupportedError);
    try {
      decodeCryptoAccount(buildMultisigAccountCbor(0x73_c5_da_0a));
    } catch (error) {
      expect((error as MultisigNotSupportedError).code).toBe(
        MULTISIG_NOT_SUPPORTED_CODE,
      );
      expect((error as MultisigNotSupportedError).name).toBe(
        MULTISIG_NOT_SUPPORTED_CODE,
      );
    }
  });
});

describe('private key rejection', () => {
  it('rejects a crypto-hdkey marked is-private (BCR-2020-007 key 2)', () => {
    const writer = new CborWriter();
    writer.writeTag(40_303);
    writer.writeMapHeader(4);
    writer.writeUint(2);
    writer.writeBool(true);
    writer.writeUint(3);
    writer.writeBytes(new Uint8Array(33));
    writer.writeUint(4);
    writer.writeBytes(CHAIN_CODE);
    writer.writeUint(6);
    writer.writeTag(40_304);
    writer.writeMapHeader(2);
    writer.writeUint(1);
    writer.writeArrayHeader(6);
    writer.writeUint(84);
    writer.writeBool(true);
    writer.writeUint(0);
    writer.writeBool(true);
    writer.writeUint(0);
    writer.writeBool(true);
    writer.writeUint(2);
    writer.writeUint(0x73_c5_da_0a);

    expect(() => decodeCryptoHdKey(writer.toBytes())).toThrow(/private key/);
  });
});
