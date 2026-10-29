import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  custodyDataSigStructure,
  deriveCustodyAccountIdentity,
  encodeCustodyDataSignature,
  isCustodyDataOrigin,
  isCustodyDataPurpose,
  verifyCustodyDataSignature,
} from '../src';

import { OTHER_DEVICE_KEY, PREPROD_ADDRESS } from './fixtures';

import type { CustodyDataPurpose, CustodyDataSignature } from '../src';

const ENTROPY = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
const ADDRESS = Cardano.PaymentAddress(PREPROD_ADDRESS);
const ORIGIN = 'https://city.example';
/** A site that relays City's challenge to the user as its own. */
const RELAY_ORIGIN = 'https://evil.example';
const PURPOSE: CustodyDataPurpose = 'sign-in';
/** `Sign in to city.example, nonce 42` in UTF-8. */
const PAYLOAD = HexBlob(
  Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
);

const otherAccountAddress = (): Cardano.PaymentAddress => {
  const identity = deriveCustodyAccountIdentity({
    contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
    creatorKeyHash: OTHER_DEVICE_KEY,
    chainId: Cardano.ChainIds.Preprod,
  });
  if (!identity.ok) throw new Error('The fixture identity must derive');
  return identity.value.address;
};

const cbor = (write: (writer: Serialization.CborWriter) => void): string => {
  const writer = new Serialization.CborWriter();
  write(writer);
  return writer.encodeAsHex();
};

const addressBytes = (address: Cardano.PaymentAddress): Uint8Array =>
  Buffer.from(Cardano.Address.fromBech32(address).toBytes(), 'hex');

type HeaderEntry = [
  number | string,
  (writer: Serialization.CborWriter) => void,
];

/** A CBOR map of `entries`, in the order given. */
const cborMap = (entries: HeaderEntry[]): string =>
  cbor(writer => {
    writer.writeStartMap(entries.length);
    for (const [label, write] of entries) {
      if (typeof label === 'string') writer.writeTextString(label);
      else writer.writeInt(label);
      write(writer);
    }
  });

const int =
  (value: number) =>
  (writer: Serialization.CborWriter): void => {
    writer.writeInt(value);
  };
const text =
  (value: string) =>
  (writer: Serialization.CborWriter): void => {
    writer.writeTextString(value);
  };
const bytes =
  (value: Uint8Array) =>
  (writer: Serialization.CborWriter): void => {
    writer.writeByteString(value);
  };

/** The entries of the protected header Lace writes, by name. */
const ENTRY = {
  algorithm: [1, int(-8)],
  origin: ['origin', text(ORIGIN)],
  address: ['address', bytes(addressBytes(ADDRESS))],
  purpose: ['purpose', text(PURPOSE)],
} satisfies Record<string, HeaderEntry>;

/** The hex of a CBOR text string of at most 23 bytes. */
const shortText = (value: string): string =>
  (0x60 + value.length).toString(16) + Buffer.from(value).toString('hex');

describe('custody data signatures', () => {
  let deviceKey: Crypto.Ed25519PrivateKey;
  let otherKey: Crypto.Ed25519PrivateKey;
  let deviceKeyHash: Crypto.Ed25519KeyHashHex;

  /** A signature made the way a device makes one, by `key`. */
  const sign = (
    key: Crypto.Ed25519PrivateKey,
    {
      address = ADDRESS,
      origin = ORIGIN,
      purpose = PURPOSE,
      payload = PAYLOAD,
    }: {
      address?: Cardano.PaymentAddress;
      origin?: string;
      purpose?: CustodyDataPurpose;
      payload?: HexBlob;
    } = {},
  ): CustodyDataSignature => {
    const message = { address, origin, purpose, payload };
    return encodeCustodyDataSignature({
      ...message,
      publicKey: key.toPublic().hex(),
      signature: key.sign(custodyDataSigStructure(message)).hex(),
    });
  };

  /** A COSE_Sign1 over arbitrary protected headers, signed by `key`. */
  const signWithHeaders = (
    key: Crypto.Ed25519PrivateKey,
    protectedHeaders: string,
    {
      payload = PAYLOAD,
      unprotected = (writer: Serialization.CborWriter) => {
        writer.writeStartMap(0);
      },
    }: {
      payload?: HexBlob;
      unprotected?: (writer: Serialization.CborWriter) => void;
    } = {},
  ): string => {
    const headerBytes = Buffer.from(protectedHeaders, 'hex');
    const sigStructure = cbor(writer => {
      writer.writeStartArray(4);
      writer.writeTextString('Signature1');
      writer.writeByteString(headerBytes);
      writer.writeByteString(new Uint8Array(0));
      writer.writeByteString(Buffer.from(payload, 'hex'));
    });
    const signature = key.sign(HexBlob(sigStructure)).bytes();
    return cbor(writer => {
      writer.writeStartArray(4);
      writer.writeByteString(headerBytes);
      unprotected(writer);
      writer.writeByteString(Buffer.from(payload, 'hex'));
      writer.writeByteString(signature);
    });
  };

  const verify = async (
    signed: CustodyDataSignature,
    overrides: Partial<Parameters<typeof verifyCustodyDataSignature>[0]> = {},
  ) =>
    verifyCustodyDataSignature({
      ...signed,
      payload: PAYLOAD,
      address: ADDRESS,
      origin: ORIGIN,
      purpose: PURPOSE,
      devices: [OTHER_DEVICE_KEY, deviceKeyHash],
      ...overrides,
    });

  beforeAll(async () => {
    await Crypto.ready();
    const root = Crypto.Bip32PrivateKey.fromBip39Entropy(ENTROPY, '');
    deviceKey = root.derive([0, 0]).toRawKey();
    otherKey = root.derive([0, 1]).toRawKey();
    deviceKeyHash = deviceKey.toPublic().hash().hex();
  });

  /**
   * `{1: -8, "origin": ORIGIN, "address": h'<57 address bytes>', "purpose":
   * PURPOSE}`, 114 bytes, labels in deterministic CBOR order.
   */
  const GOLDEN_HEADER = [
    'a4',
    '0127',
    shortText('origin'),
    shortText(ORIGIN),
    shortText('address'),
    '5839',
    Buffer.from(addressBytes(ADDRESS)).toString('hex'),
    shortText('purpose'),
    shortText(PURPOSE),
  ].join('');

  describe('encoding', () => {
    it('signs the CIP-8 Sig_structure whose protected header names EdDSA and binds the origin, the account address and the purpose', () => {
      expect(GOLDEN_HEADER).toHaveLength(114 * 2);
      // ["Signature1", h'<header>', h'', h'<33 payload bytes>']
      expect(
        custodyDataSigStructure({
          address: ADDRESS,
          origin: ORIGIN,
          purpose: PURPOSE,
          payload: PAYLOAD,
        }),
      ).toBe(
        `846a5369676e617475726531${'5872'}${GOLDEN_HEADER}40${'5821'}${PAYLOAD}`,
      );
    });

    it('signs different bytes for each origin and each purpose', () => {
      const sigStructure = (
        origin: string,
        purpose: CustodyDataPurpose,
      ): string =>
        custodyDataSigStructure({
          address: ADDRESS,
          origin,
          purpose,
          payload: PAYLOAD,
        });

      expect(
        new Set([
          sigStructure(ORIGIN, 'sign-in'),
          sigStructure(ORIGIN, 'link-account'),
          sigStructure(RELAY_ORIGIN, 'sign-in'),
          sigStructure(RELAY_ORIGIN, 'link-account'),
        ]).size,
      ).toBe(4);
    });

    it('encodes a COSE_Sign1 with an unhashed payload and an Ed25519 COSE_Key without a key id', () => {
      const signed = sign(deviceKey);
      const reader = new Serialization.CborReader(signed.signature);

      expect(reader.readStartArray()).toBe(4);
      expect(Buffer.from(reader.readByteString()).toString('hex')).toBe(
        GOLDEN_HEADER,
      );
      expect(reader.readStartMap()).toBe(1);
      expect(reader.readTextString()).toBe('hashed');
      expect(reader.readBoolean()).toBe(false);
      reader.readEndMap();
      expect(Buffer.from(reader.readByteString()).toString('hex')).toBe(
        PAYLOAD,
      );
      expect(reader.readByteString()).toHaveLength(64);
      expect(signed.key).toBe(
        `a4010103272006215820${deviceKey.toPublic().hex()}`,
      );
    });

    it.each([
      ['an address that is not bech32', { address: 'not-an-address' }],
      ['an origin with a path', { origin: `${ORIGIN}/` }],
      ['an opaque origin', { origin: 'null' }],
      ['an unknown purpose', { purpose: 'pay' }],
    ])('refuses to sign for %s', (_, overrides) => {
      const message = {
        address: ADDRESS,
        origin: ORIGIN,
        purpose: PURPOSE,
        payload: PAYLOAD,
        ...overrides,
      } as Parameters<typeof custodyDataSigStructure>[0];

      expect(() => custodyDataSigStructure(message)).toThrow();
      expect(() =>
        encodeCustodyDataSignature({
          ...message,
          publicKey: deviceKey.toPublic().hex(),
          signature: Crypto.Ed25519SignatureHex('00'.repeat(64)),
        }),
      ).toThrow();
    });
  });

  describe('isCustodyDataOrigin', () => {
    it.each([ORIGIN, 'http://localhost:3000', 'https://city.example:8443'])(
      'accepts the serialized origin %s',
      origin => {
        expect(isCustodyDataOrigin(origin)).toBe(true);
      },
    );

    it.each([
      `${ORIGIN}/`,
      `${ORIGIN}/sign-in`,
      'https://City.example',
      'https://city.example:443',
      'null',
      'file:///tmp/challenge',
      'city.example',
      '',
      42,
      undefined,
    ])('refuses %j', origin => {
      expect(isCustodyDataOrigin(origin)).toBe(false);
    });
  });

  it('names exactly the two purposes', () => {
    expect(isCustodyDataPurpose('sign-in')).toBe(true);
    expect(isCustodyDataPurpose('link-account')).toBe(true);
    expect(isCustodyDataPurpose('pay')).toBe(false);
    expect(isCustodyDataPurpose(undefined)).toBe(false);
  });

  describe('verifyCustodyDataSignature', () => {
    it('accepts a signature by a listed device and names its key hash', async () => {
      await expect(verify(sign(deviceKey))).resolves.toEqual({
        ok: true,
        value: { keyHash: deviceKeyHash },
      });
    });

    it('accepts hex in either case', async () => {
      const signed = sign(deviceKey);

      await expect(
        verify(
          {
            signature: HexBlob(signed.signature.toUpperCase()),
            key: HexBlob(signed.key.toUpperCase()),
          },
          {
            payload: PAYLOAD.toUpperCase(),
            devices: [deviceKeyHash.toUpperCase()],
          },
        ),
      ).resolves.toMatchObject({ ok: true });
    });

    it('refuses a signature over another payload', async () => {
      const signed = sign(deviceKey, { payload: HexBlob('00') });

      await expect(verify(signed)).resolves.toEqual({
        ok: false,
        error: { code: 'payload-mismatch' },
      });
    });

    it('refuses a signature bound to another custody account', async () => {
      const signed = sign(deviceKey, { address: otherAccountAddress() });

      await expect(verify(signed)).resolves.toEqual({
        ok: false,
        error: { code: 'address-mismatch' },
      });
    });

    it("refuses a signature another site obtained with the verifier's challenge", async () => {
      const relayed = sign(deviceKey, { origin: RELAY_ORIGIN });

      await expect(verify(relayed)).resolves.toEqual({
        ok: false,
        error: { code: 'origin-mismatch' },
      });
      await expect(
        verify(relayed, { origin: RELAY_ORIGIN }),
      ).resolves.toMatchObject({ ok: true });
    });

    it('refuses a sign-in signature presented to link an account, and the reverse', async () => {
      await expect(
        verify(sign(deviceKey), { purpose: 'link-account' }),
      ).resolves.toEqual({ ok: false, error: { code: 'purpose-mismatch' } });
      await expect(
        verify(sign(deviceKey, { purpose: 'link-account' })),
      ).resolves.toEqual({ ok: false, error: { code: 'purpose-mismatch' } });
    });

    it('refuses a signature presented with another key', async () => {
      const signed = sign(deviceKey);
      const { key } = sign(otherKey);

      await expect(verify({ ...signed, key })).resolves.toEqual({
        ok: false,
        error: { code: 'invalid-signature' },
      });
    });

    it('refuses a payload swapped after signing', async () => {
      const original = sign(deviceKey);
      const reader = new Serialization.CborReader(original.signature);
      reader.readStartArray();
      const headers = reader.readByteString();
      reader.skipValue();
      reader.readByteString();
      const signature = reader.readByteString();
      const doctored = cbor(writer => {
        writer.writeStartArray(4);
        writer.writeByteString(headers);
        writer.writeStartMap(0);
        writer.writeByteString(Buffer.from('00', 'hex'));
        writer.writeByteString(signature);
      });

      await expect(
        verify(
          { ...original, signature: HexBlob(doctored) },
          { payload: '00' },
        ),
      ).resolves.toEqual({ ok: false, error: { code: 'invalid-signature' } });
    });

    it('refuses a valid signature by a device the account does not list', async () => {
      await expect(
        verify(sign(otherKey), { devices: [deviceKeyHash] }),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: 'device-not-listed',
          keyHash: otherKey.toPublic().hash().hex(),
        },
      });
      await expect(verify(sign(deviceKey), { devices: [] })).resolves.toEqual({
        ok: false,
        error: { code: 'device-not-listed', keyHash: deviceKeyHash },
      });
    });

    it.each([
      [
        'an address that does not parse',
        { address: 'addr1nope' },
        'invalid-address',
      ],
      ['an empty payload', { payload: '' }, 'invalid-payload'],
      ['a payload that is not hex', { payload: 'zz' }, 'invalid-payload'],
      ['a payload of half a byte', { payload: 'abc' }, 'invalid-payload'],
      [
        'origin with a trailing slash',
        { origin: `${ORIGIN}/` },
        'invalid-origin',
      ],
      ['origin that is a host', { origin: 'city.example' }, 'invalid-origin'],
      ['unknown purpose', { purpose: 'pay' }, 'invalid-purpose'],
    ])("refuses the verifier's own %s", async (_, overrides, code) => {
      await expect(
        verify(
          sign(deviceKey),
          overrides as Partial<
            Parameters<typeof verifyCustodyDataSignature>[0]
          >,
        ),
      ).resolves.toEqual({
        ok: false,
        error: { code },
      });
    });

    describe('malformed COSE_Sign1', () => {
      const { algorithm, origin, address, purpose } = ENTRY;
      const validHeader = () => cborMap([algorithm, origin, address, purpose]);

      it('accepts extra protected headers it does not read, in any order', async () => {
        const signature = signWithHeaders(
          deviceKey,
          cborMap([
            purpose,
            address,
            [4, bytes(addressBytes(ADDRESS))],
            origin,
            algorithm,
          ]),
        );

        await expect(
          verify({ ...sign(deviceKey), signature: HexBlob(signature) }),
        ).resolves.toMatchObject({ ok: true });
      });

      it.each([
        ['no algorithm', () => cborMap([origin, address, purpose])],
        [
          'another algorithm',
          () => cborMap([[1, int(-7)], origin, address, purpose]),
        ],
        ['no address', () => cborMap([algorithm, origin, purpose])],
        [
          'an address that is text',
          () =>
            cborMap([algorithm, origin, ['address', text(ADDRESS)], purpose]),
        ],
        [
          'the address twice',
          () =>
            cborMap([
              algorithm,
              origin,
              ['address', bytes(addressBytes(otherAccountAddress()))],
              address,
              purpose,
            ]),
        ],
        ['no origin', () => cborMap([algorithm, address, purpose])],
        [
          'an origin that is bytes',
          () =>
            cborMap([
              algorithm,
              ['origin', bytes(Buffer.from(ORIGIN))],
              address,
              purpose,
            ]),
        ],
        [
          'the origin twice',
          () =>
            cborMap([
              algorithm,
              ['origin', text(RELAY_ORIGIN)],
              origin,
              address,
              purpose,
            ]),
        ],
        ['no purpose', () => cborMap([algorithm, origin, address])],
        [
          'a purpose that is an integer',
          () => cborMap([algorithm, origin, address, ['purpose', int(1)]]),
        ],
        [
          'a header that is not a map',
          () =>
            cbor(writer => {
              writer.writeStartArray(0);
            }),
        ],
        ['trailing bytes', () => `${validHeader()}00`],
      ])('refuses protected headers with %s', async (_, protectedHeaders) => {
        const signature = signWithHeaders(deviceKey, protectedHeaders());

        await expect(
          verify({ ...sign(deviceKey), signature: HexBlob(signature) }),
        ).resolves.toEqual({
          ok: false,
          error: { code: 'malformed-signature' },
        });
      });

      it.each([
        ['not hex', () => 'zz'],
        ['empty', () => ''],
        [
          'tagged',
          () =>
            cbor(writer => {
              writer.writeTag(18);
              writer.writeEncodedValue(
                Buffer.from(sign(deviceKey).signature, 'hex'),
              );
            }),
        ],
        ['followed by trailing bytes', () => `${sign(deviceKey).signature}00`],
        [
          'a detached payload',
          () => {
            const reader = new Serialization.CborReader(
              sign(deviceKey).signature,
            );
            reader.readStartArray();
            const headers = reader.readByteString();
            return cbor(writer => {
              writer.writeStartArray(4);
              writer.writeByteString(headers);
              writer.writeStartMap(0);
              writer.writeNull();
              writer.writeByteString(new Uint8Array(64));
            });
          },
        ],
        [
          'a short signature',
          () => {
            const reader = new Serialization.CborReader(
              sign(deviceKey).signature,
            );
            reader.readStartArray();
            const headers = reader.readByteString();
            return cbor(writer => {
              writer.writeStartArray(4);
              writer.writeByteString(headers);
              writer.writeStartMap(0);
              writer.writeByteString(Buffer.from(PAYLOAD, 'hex'));
              writer.writeByteString(new Uint8Array(63));
            });
          },
        ],
        [
          'unprotected headers that are not a map',
          () =>
            signWithHeaders(deviceKey, validHeader(), {
              unprotected: writer => {
                writer.writeNull();
              },
            }),
        ],
        [
          'three fields',
          () =>
            cbor(writer => {
              writer.writeStartArray(3);
              writer.writeByteString(Buffer.from(validHeader(), 'hex'));
              writer.writeStartMap(0);
              writer.writeByteString(Buffer.from(PAYLOAD, 'hex'));
            }),
        ],
      ])('refuses a COSE_Sign1 that is %s', async (_, signature) => {
        await expect(
          verify({ ...sign(deviceKey), signature: signature() as HexBlob }),
        ).resolves.toEqual({
          ok: false,
          error: { code: 'malformed-signature' },
        });
      });
    });

    describe('malformed COSE_Key', () => {
      const coseKey = cborMap;
      const publicKey =
        (bytes?: () => Uint8Array) => (writer: Serialization.CborWriter) => {
          writer.writeByteString(bytes?.() ?? deviceKey.toPublic().bytes());
        };

      it('accepts a key id and labels it does not read', async () => {
        const key = coseKey([
          [1, int(1)],
          [2, writer => writer.writeByteString(addressBytes(ADDRESS))],
          [-1, int(6)],
          [-2, publicKey()],
          ['comment', writer => writer.writeTextString('device')],
        ]);

        await expect(
          verify({ ...sign(deviceKey), key: HexBlob(key) }),
        ).resolves.toMatchObject({ ok: true });
      });

      it.each([
        [
          'another key type',
          [
            [1, int(2)],
            [-1, int(6)],
            [-2, publicKey()],
          ],
        ],
        [
          'another curve',
          [
            [1, int(1)],
            [-1, int(4)],
            [-2, publicKey()],
          ],
        ],
        [
          'another algorithm',
          [
            [1, int(1)],
            [3, int(-7)],
            [-1, int(6)],
            [-2, publicKey()],
          ],
        ],
        [
          'no public key',
          [
            [1, int(1)],
            [-1, int(6)],
          ],
        ],
        [
          'a short public key',
          [
            [1, int(1)],
            [-1, int(6)],
            [-2, publicKey(() => new Uint8Array(31))],
          ],
        ],
        [
          'the public key twice',
          [
            [1, int(1)],
            [-1, int(6)],
            [-2, publicKey(() => otherKey.toPublic().bytes())],
            [-2, publicKey()],
          ],
        ],
      ] as [string, [number | string, (writer: Serialization.CborWriter) => void][]][])(
        'refuses a COSE_Key with %s',
        async (_, entries) => {
          await expect(
            verify({ ...sign(deviceKey), key: HexBlob(coseKey(entries)) }),
          ).resolves.toEqual({ ok: false, error: { code: 'malformed-key' } });
        },
      );

      it('refuses a COSE_Key that is not a map or not hex', async () => {
        for (const key of ['80', 'zz', `${sign(deviceKey).key}00`]) {
          await expect(
            verify({ ...sign(deviceKey), key: key as HexBlob }),
          ).resolves.toEqual({ ok: false, error: { code: 'malformed-key' } });
        }
      });
    });
  });
});
