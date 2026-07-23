import { Buffer } from 'buffer';

import bs58check from 'bs58check';
import { describe, expect, it } from 'vitest';

import {
  serializeExtendedPublicKey,
  XPUB_VERSION_MAINNET,
} from '../src/crypto';

describe('base58check (bs58check)', () => {
  it('base58check round-trips and verifies the checksum', () => {
    const payload = Uint8Array.from([1, 2, 3, 4, 5]);
    const encoded = bs58check.encode(payload);
    expect(Array.from(bs58check.decode(encoded))).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects a corrupted base58check checksum', () => {
    const encoded = bs58check.encode(Uint8Array.from([1, 2, 3, 4]));
    const corrupted = `${encoded.slice(0, -1)}${
      encoded.endsWith('A') ? 'B' : 'A'
    }`;
    expect(() => bs58check.decode(corrupted)).toThrow();
  });

  it('matches the canonical BIP-32 vector 1 master xpub and its published fields', () => {
    // BIP-32 Test Vector 1 master public key (m). Published field values are an
    // external oracle, independent of our own encode/decode being self-inverse.
    const knownXpub =
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
    const expectedChainCode =
      '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508';
    const expectedPublicKey =
      '0339a36013301597daef41fbe593a02cc513d0b55527ec2df1050e2e8ff49c85c2';

    const payload = bs58check.decode(knownXpub);
    expect(payload.length).toBe(78);
    const version = Buffer.from(payload.slice(0, 4)).readUInt32BE(0);
    expect(version).toBe(XPUB_VERSION_MAINNET);
    expect(payload[4]).toBe(0);
    expect(Buffer.from(payload.slice(5, 9)).readUInt32BE(0)).toBe(0);
    expect(Buffer.from(payload.slice(9, 13)).readUInt32BE(0)).toBe(0);
    expect(Buffer.from(payload.slice(13, 45)).toString('hex')).toBe(
      expectedChainCode,
    );
    expect(Buffer.from(payload.slice(45, 78)).toString('hex')).toBe(
      expectedPublicKey,
    );

    const reEncoded = serializeExtendedPublicKey({
      version,
      depth: payload[4],
      parentFingerprint: Buffer.from(payload.slice(5, 9)).readUInt32BE(0),
      childNumber: Buffer.from(payload.slice(9, 13)).readUInt32BE(0),
      chainCode: payload.slice(13, 45),
      publicKey: payload.slice(45, 78),
    });
    expect(reEncoded).toBe(knownXpub);
  });

  it('encodes the BIP-32 vector 1 master fields back to the published xpub', () => {
    const xpub = serializeExtendedPublicKey({
      version: XPUB_VERSION_MAINNET,
      depth: 0,
      parentFingerprint: 0,
      childNumber: 0,
      chainCode: Uint8Array.from(
        Buffer.from(
          '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508',
          'hex',
        ),
      ),
      publicKey: Uint8Array.from(
        Buffer.from(
          '0339a36013301597daef41fbe593a02cc513d0b55527ec2df1050e2e8ff49c85c2',
          'hex',
        ),
      ),
    });
    expect(xpub).toBe(
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
    );
  });
});

describe('serializeExtendedPublicKey', () => {
  const publicKey = Uint8Array.from(
    Buffer.from(
      '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
      'hex',
    ),
  );
  const chainCode = Uint8Array.from(
    Buffer.from(
      '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508',
      'hex',
    ),
  );

  it('produces a mainnet xpub decodable back to its fields', () => {
    const xpub = serializeExtendedPublicKey({
      version: XPUB_VERSION_MAINNET,
      depth: 3,
      parentFingerprint: 0x12_34_56_78,
      childNumber: (0 + 0x80_00_00_00) >>> 0,
      chainCode,
      publicKey,
    });
    expect(xpub.startsWith('xpub')).toBe(true);
    const payload = bs58check.decode(xpub);
    expect(Buffer.from(payload.slice(0, 4)).readUInt32BE(0)).toBe(
      XPUB_VERSION_MAINNET,
    );
    expect(payload[4]).toBe(3);
    expect(Array.from(payload.slice(45, 78))).toEqual(Array.from(publicKey));
  });

  it('rejects a wrong-length chain code', () => {
    expect(() =>
      serializeExtendedPublicKey({
        version: XPUB_VERSION_MAINNET,
        depth: 0,
        parentFingerprint: 0,
        childNumber: 0,
        chainCode: new Uint8Array(31),
        publicKey,
      }),
    ).toThrow();
  });
});
