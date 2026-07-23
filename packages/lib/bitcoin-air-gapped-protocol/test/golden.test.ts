// Most fixtures are spec-encoded (synthesized); REAL_SEED_SIGNER_ACCOUNT_HEX is
// a real crypto-account capture from a physical SeedSigner. A real crypto-psbt
// capture is still pending task SS-29 hardware validation.

import { Buffer } from 'buffer';

import { HDKey } from '@scure/bip32';
import bs58check from 'bs58check';
import { describe, expect, it } from 'vitest';

import {
  decodeAccountExport,
  decodeCryptoAccount,
  decodeCryptoHdKey,
  WrongScriptTypeError,
} from '../src';

import {
  buildHdKeyCbor,
  buildMultisigThenWpkhAccountCbor,
  buildNonMapTopLevelCbor,
  buildShWpkhAccountCbor,
  buildShWpkhThenWpkhAccountCbor,
  buildUntaggedHdKeyCbor,
  buildUntaggedWpkhAccountCbor,
  buildWpkhAccountCbor,
  buildWrongOuterTagAccountCbor,
  hexToBytes,
  REAL_SEED_SIGNER_ACCOUNT_HEX,
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

const SOURCE_FINGERPRINT = 0x73_c5_da_0a;

const nativeSegwitMainnet: HdKeyFixture = {
  publicKey: PUBLIC_KEY,
  chainCode: CHAIN_CODE,
  components: [
    { index: 84, hardened: true },
    { index: 0, hardened: true },
    { index: 0, hardened: true },
  ],
  sourceFingerprint: SOURCE_FINGERPRINT,
  parentFingerprint: 0x12_34_56_78,
  depth: 3,
  coinType: 0,
  network: 0,
};

const nestedSegwitMainnet: HdKeyFixture = {
  ...nativeSegwitMainnet,
  components: [
    { index: 49, hardened: true },
    { index: 0, hardened: true },
    { index: 0, hardened: true },
  ],
};

describe('decodeCryptoHdKey native-segwit mainnet (m/84h/0h/0h)', () => {
  const decoded = decodeCryptoHdKey(buildHdKeyCbor(nativeSegwitMainnet));

  it('reports purpose, coin type, account, and script type', () => {
    expect(decoded.purpose).toBe(84);
    expect(decoded.coinType).toBe(0);
    expect(decoded.account).toBe(0);
    expect(decoded.scriptType).toBe('NativeSegWit');
  });

  it('formats the source fingerprint as zero-padded lowercase hex', () => {
    expect(decoded.sourceFingerprintHex).toBe('73c5da0a');
  });

  it('reports the full origin path', () => {
    expect(decoded.originPath).toEqual([
      { index: 84, hardened: true },
      { index: 0, hardened: true },
      { index: 0, hardened: true },
    ]);
  });

  it('reconstructs an xpub decodable back to the embedded fields', () => {
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
    const payload = bs58check.decode(decoded.xpubBase58);
    expect(payload.length).toBe(78);
    expect(Array.from(payload.slice(45, 78))).toEqual(Array.from(PUBLIC_KEY));
    expect(Array.from(payload.slice(13, 45))).toEqual(Array.from(CHAIN_CODE));
    expect(payload[4]).toBe(3);
    const childNumber = Buffer.from(payload.slice(9, 13)).readUInt32BE(0);
    expect(childNumber).toBe((0 + 0x80_00_00_00) >>> 0);
  });
});

describe('decodeCryptoHdKey native-segwit testnet (m/84h/1h/0h)', () => {
  const decoded = decodeCryptoHdKey(
    buildHdKeyCbor({
      ...nativeSegwitMainnet,
      components: [
        { index: 84, hardened: true },
        { index: 1, hardened: true },
        { index: 0, hardened: true },
      ],
      coinType: 1,
      network: 1,
    }),
  );

  it('reports coin type 1 and a mainnet-versioned xpub', () => {
    expect(decoded.coinType).toBe(1);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });
});

describe('decodeCryptoHdKey legacy tags (303/304/305)', () => {
  it('decodes the same way as new IANA tags', () => {
    const decoded = decodeCryptoHdKey(
      buildHdKeyCbor({ ...nativeSegwitMainnet, legacyTags: true }),
    );
    expect(decoded.purpose).toBe(84);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.sourceFingerprintHex).toBe('73c5da0a');
  });
});

describe('decodeCryptoAccount', () => {
  it('picks the wpkh descriptor and decodes its hdkey', () => {
    const decoded = decodeCryptoAccount(
      buildWpkhAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
    );
    expect(decoded.purpose).toBe(84);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('skips a non-selected multisig descriptor and picks the wpkh one', () => {
    const decoded = decodeCryptoAccount(
      buildMultisigThenWpkhAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
    );
    expect(decoded.purpose).toBe(84);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('rejects a nested-segwit sh(wpkh) descriptor with WrongScriptTypeError', () => {
    expect(() =>
      decodeCryptoAccount(
        buildShWpkhAccountCbor(SOURCE_FINGERPRINT, nestedSegwitMainnet),
      ),
    ).toThrow(WrongScriptTypeError);
  });

  it('skips a non-selected sh(wpkh) descriptor and picks the bare wpkh one', () => {
    const decoded = decodeCryptoAccount(
      buildShWpkhThenWpkhAccountCbor(
        SOURCE_FINGERPRINT,
        nestedSegwitMainnet,
        nativeSegwitMainnet,
      ),
    );
    expect(decoded.purpose).toBe(84);
    expect(decoded.scriptType).toBe('NativeSegWit');
  });
});

describe('decodeCryptoHdKey keypath child-number range', () => {
  it('rejects a last component index at or above 2^31', () => {
    expect(() =>
      decodeCryptoHdKey(
        buildHdKeyCbor({
          ...nativeSegwitMainnet,
          components: [
            { index: 84, hardened: true },
            { index: 0, hardened: true },
            { index: 0x80_00_00_00, hardened: false },
          ],
        }),
      ),
    ).toThrow('keypath component index out of range');
  });
});

describe('decodeCryptoHdKey always serializes a mainnet-versioned xpub', () => {
  it('serializes an xpub when coin-type is 1 (testnet) and coininfo is absent', () => {
    const decoded = decodeCryptoHdKey(
      buildHdKeyCbor({
        ...nativeSegwitMainnet,
        components: [
          { index: 84, hardened: true },
          { index: 1, hardened: true },
          { index: 0, hardened: true },
        ],
        omitCoinInfo: true,
      }),
    );
    expect(decoded.coinType).toBe(1);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('serializes an xpub when coin-type is 0 (mainnet) and coininfo is absent', () => {
    const decoded = decodeCryptoHdKey(
      buildHdKeyCbor({ ...nativeSegwitMainnet, omitCoinInfo: true }),
    );
    expect(decoded.coinType).toBe(0);
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('serializes an xpub even when an explicit testnet coininfo is present', () => {
    const decoded = decodeCryptoHdKey(
      buildHdKeyCbor({
        ...nativeSegwitMainnet,
        components: [
          { index: 84, hardened: true },
          { index: 1, hardened: true },
          { index: 0, hardened: true },
        ],
        coinType: 1,
        network: 1,
      }),
    );
    expect(decoded.coinType).toBe(1);
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });
});

describe('real SeedSigner crypto-account capture (m/84h/1h/0h testnet)', () => {
  const decoded = decodeCryptoAccount(hexToBytes(REAL_SEED_SIGNER_ACCOUNT_HEX));

  it('decodes a bare wpkh descriptor with no coininfo to an xpub native-segwit account', () => {
    expect(decoded.purpose).toBe(84);
    expect(decoded.coinType).toBe(1);
    expect(decoded.account).toBe(0);
    expect(decoded.scriptType).toBe('NativeSegWit');
    expect(decoded.sourceFingerprintHex).toBe('65b64f0b');
    expect(decoded.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('serializes the testnet capture with the mainnet (xpub) version bytes', () => {
    const payload = bs58check.decode(decoded.xpubBase58);
    expect(Buffer.from(payload.slice(0, 4)).readUInt32BE(0)).toBe(
      0x04_88_b2_1e,
    );
  });

  it('produces an extended key that @scure/bip32 can import and derive (regression: Version mismatch)', () => {
    expect(() => {
      const hdKey = HDKey.fromExtendedKey(decoded.xpubBase58);
      hdKey.derive('m/0/0');
    }).not.toThrow();
  });
});

describe('UR-untagged top-level form (real device shape)', () => {
  it('decodes an untagged crypto-hdkey body to the same result as the tagged form', () => {
    const tagged = decodeCryptoHdKey(buildHdKeyCbor(nativeSegwitMainnet));
    const untagged = decodeCryptoHdKey(
      buildUntaggedHdKeyCbor(nativeSegwitMainnet),
    );
    expect(untagged).toEqual(tagged);
  });

  it('decodes an untagged crypto-account body to the same result as the tagged form', () => {
    const tagged = decodeCryptoAccount(
      buildWpkhAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
    );
    const untagged = decodeCryptoAccount(
      buildUntaggedWpkhAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
    );
    expect(untagged).toEqual(tagged);
    expect(untagged.scriptType).toBe('NativeSegWit');
    expect(untagged.xpubBase58.startsWith('xpub')).toBe(true);
  });

  it('throws when the outer crypto-account tag is the wrong number', () => {
    expect(() =>
      decodeCryptoAccount(
        buildWrongOuterTagAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
      ),
    ).toThrow(/unexpected tag/);
  });

  it('throws when the top level is neither the account tag nor a CBOR map', () => {
    expect(() => decodeCryptoAccount(buildNonMapTopLevelCbor())).toThrow(
      /expected CBOR map/,
    );
  });
});

describe('decodeAccountExport dispatch', () => {
  it('decodes a crypto-hdkey message', () => {
    const decoded = decodeAccountExport({
      urType: 'crypto-hdkey',
      cbor: buildHdKeyCbor(nativeSegwitMainnet),
    });
    expect(decoded.scriptType).toBe('NativeSegWit');
  });

  it('decodes a crypto-account message', () => {
    const decoded = decodeAccountExport({
      urType: 'crypto-account',
      cbor: buildWpkhAccountCbor(SOURCE_FINGERPRINT, nativeSegwitMainnet),
    });
    expect(decoded.scriptType).toBe('NativeSegWit');
  });

  it('throws on an unsupported UR type', () => {
    expect(() =>
      decodeAccountExport({ urType: 'crypto-psbt', cbor: new Uint8Array() }),
    ).toThrow();
  });
});
