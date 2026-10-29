import {
  AccAddress,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  decodeDevicePublicKey,
  deviceEnvelopes,
  encodeDevicePublicKey,
  isAddressedTo,
  isDeviceRegistration,
  isLaceRecord,
  openDeviceEnvelope,
  openDeviceRegistration,
  openGrantRecord,
  sealDeviceEnvelope,
  sealDeviceRegistration,
  sealGrantRecord,
} from '../../src/acc/envelopes';
import {
  INBOX_ENTRY_LENGTH,
  MAX_INBOX_ENTRIES_PER_REQUEST,
  openInboxEntry,
} from '../../src/acc/inbox';
import { JubjubDevice } from '../../src/acc/signer';

import type { AccountSecrets } from '../../src/acc/envelopes';
import type {
  DeviceReader,
  GrantRecipient,
  GrantRecordPart,
} from '@lace-contract/passport';

const UINT128_MAX = (2n ** 128n - 1n).toString();
const DEVICE_ENVELOPE_TYPE = 0xd1;
const DEVICE_REGISTRATION_TYPE = 0xd2;
const GRANT_RECORD_TYPE = 0xd3;
const SUITE = 0x02;
const ACCOUNT = AccAddress('ac'.repeat(32));
const OTHER_ACCOUNT = AccAddress('ad'.repeat(32));

const keyPair = () => {
  const secretKey = x25519.utils.randomSecretKey();
  return { secretKey, publicKey: x25519.getPublicKey(secretKey) };
};

const secrets = (): AccountSecrets => ({
  secret: x25519.utils.randomSecretKey(),
  rosterKey: crypto.getRandomValues(new Uint8Array(32)),
});

const reader: DeviceReader = {
  readerPublicKey: HexBytes.fromByteArray(keyPair().publicKey),
  devicePublicKey: encodeDevicePublicKey(JubjubDevice.generate().pk),
};

const grantId = GrantId('ab'.repeat(32));

const recordParts: GrantRecordPart[] = [
  {
    part: 'grant',
    grantId,
    slot: GrantSlot(255),
    scopeSalt: GrantScopeSalt('cd'.repeat(32)),
    granteeScheme: 'jubjub-schnorr',
    granteePublicKey: 'ef'.repeat(32),
    readPublicKey: '12'.repeat(32),
  },
  {
    part: 'grant',
    grantId,
    slot: GrantSlot(0),
    scopeSalt: GrantScopeSalt('cd'.repeat(32)),
    granteeScheme: 'jubjub-schnorr',
    granteePublicKey: 'ef'.repeat(32),
  },
  {
    part: 'grant',
    grantId,
    slot: GrantSlot(3),
    scopeSalt: GrantScopeSalt('cd'.repeat(32)),
    granteeScheme: 'secp256k1-ecdsa',
    granteePublicKey: `02${'ef'.repeat(32)}`,
    readPublicKey: '12'.repeat(32),
  },
  {
    part: 'grant',
    grantId,
    slot: GrantSlot(4),
    scopeSalt: GrantScopeSalt('cd'.repeat(32)),
    granteeScheme: 'secp256k1-ecdsa',
    granteePublicKey: `03${'ef'.repeat(32)}`,
  },
  ...(
    [
      { kind: 'any' },
      { kind: 'user-address', value: '56'.repeat(32) },
      { kind: 'coin-public-key', value: '57'.repeat(32) },
      { kind: 'contract-address', value: '58'.repeat(32) },
    ] satisfies GrantRecipient[]
  ).map(
    (recipient): GrantRecordPart => ({
      part: 'object',
      grantId,
      object: { color: '34'.repeat(32), recipient, maxCoinValue: UINT128_MAX },
    }),
  ),
  {
    part: 'object',
    grantId,
    object: {
      color: '00'.repeat(32),
      recipient: { kind: 'any' },
      maxCoinValue: '0',
    },
  },
  { part: 'view', grantId, encKeyPrefix: 'a1b2c3', seal: '9f'.repeat(94) },
];

/** Every single-byte flip of an entry, one copy per position. */
const flips = (entry: Uint8Array): Uint8Array[] =>
  Array.from(entry, (_, index) => {
    const copy = entry.slice();
    copy[index] ^= 0x01;
    return copy;
  });

const isZero = (bytes: Uint8Array): boolean => bytes.every(byte => byte === 0);

/**
 * Seals any 130-byte plaintext as a grant record of `account` under the
 * keys the reader secret derives, the way a record is framed, so a test
 * can present a part no writer produces.
 */
const sealRawGrantRecord = async (
  readerSecret: Uint8Array,
  account: AccAddress,
  plaintext: Uint8Array,
): Promise<Uint8Array> => {
  const accountBytes = ByteArray.fromHex(HexBytes(account));
  const derive = async (
    label: string,
    algorithm: AesKeyAlgorithm | HmacImportParams,
    usage: KeyUsage,
  ) => {
    const material = await crypto.subtle.importKey(
      'raw',
      readerSecret as Uint8Array<ArrayBuffer>,
      'HKDF',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: Uint8Array.from([
          ...new TextEncoder().encode(label),
          ...accountBytes,
        ]),
      },
      material,
      256,
    );
    return crypto.subtle.importKey('raw', bits, algorithm, false, [usage]);
  };
  const key = await derive(
    'lace:passport:grant-record:v1',
    { name: 'AES-GCM', length: 256 },
    'encrypt',
  );
  const tagKey = await derive(
    'lace:passport:grant-record-tag:v1',
    { name: 'HMAC', hash: 'SHA-256' },
    'sign',
  );
  const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
  entry[0] = GRANT_RECORD_TYPE;
  entry[1] = SUITE;
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  entry.set(nonce, 34);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: Uint8Array.from([
          ...entry.subarray(0, 2),
          ...entry.subarray(34, 46),
        ]),
        tagLength: 128,
      },
      key,
      plaintext as Uint8Array<ArrayBuffer>,
    ),
  );
  entry.set(sealed.subarray(plaintext.length), 46);
  entry.set(sealed.subarray(0, plaintext.length), 62);
  entry.set(
    new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        tagKey,
        Uint8Array.from([...entry.subarray(0, 2), ...entry.subarray(34)]),
      ),
    ),
    2,
  );
  return entry;
};

describe('device envelopes', () => {
  it('lay out type, suite, recipient tag, ephemeral key, nonce, AEAD tag, ciphertext and zero padding in 192 bytes', async () => {
    const { publicKey } = keyPair();

    const entry = await sealDeviceEnvelope(publicKey, secrets());

    expect(entry).toHaveLength(INBOX_ENTRY_LENGTH);
    expect(entry[0]).toBe(DEVICE_ENVELOPE_TYPE);
    expect(entry[1]).toBe(SUITE);
    expect(isZero(entry.subarray(158))).toBe(true);
    expect(isZero(entry.subarray(94, 158))).toBe(false);
    expect(isLaceRecord(entry)).toBe(true);
    expect(isDeviceRegistration(entry)).toBe(false);
  });

  it('round-trip the account secret and roster key for the reader', async () => {
    const { secretKey, publicKey } = keyPair();
    const delivered = secrets();

    const entry = await sealDeviceEnvelope(publicKey, delivered);

    await expect(openDeviceEnvelope(secretKey, entry)).resolves.toEqual(
      delivered,
    );
  });

  it('open to null after any single byte flips, at another length, or for another reader', async () => {
    const { secretKey, publicKey } = keyPair();
    const entry = await sealDeviceEnvelope(publicKey, secrets());

    for (const tampered of flips(entry)) {
      await expect(openDeviceEnvelope(secretKey, tampered)).resolves.toBeNull();
    }
    await expect(
      openDeviceEnvelope(secretKey, entry.slice(0, 191)),
    ).resolves.toBeNull();
    await expect(
      openDeviceEnvelope(keyPair().secretKey, entry),
    ).resolves.toBeNull();
  });

  it('carry tags that link no two envelopes and match only their reader', async () => {
    const { publicKey } = keyPair();
    const other = keyPair().publicKey;

    const first = await sealDeviceEnvelope(publicKey, secrets());
    const second = await sealDeviceEnvelope(publicKey, secrets());

    expect(first.subarray(2, 34)).not.toEqual(second.subarray(2, 34));
    expect(first.subarray(34, 66)).not.toEqual(second.subarray(34, 66));
    expect(isAddressedTo(first, publicKey)).toBe(true);
    expect(isAddressedTo(second, publicKey)).toBe(true);
    expect(isAddressedTo(first, other)).toBe(false);
  });

  it('are listed for their reader newest first', async () => {
    const { publicKey } = keyPair();
    const others = await sealDeviceEnvelope(keyPair().publicKey, secrets());
    const own = await Promise.all(
      Array.from({ length: 20 }, async () =>
        sealDeviceEnvelope(publicKey, secrets()),
      ),
    );

    const listed = deviceEnvelopes([others, ...own], publicKey);

    expect(listed).toEqual(own.slice().reverse());
  });

  it('carry a tag over the whole envelope, its type, suite and every byte after the tag', async () => {
    const { publicKey } = keyPair();

    const entry = await sealDeviceEnvelope(publicKey, secrets());

    expect(entry.subarray(2, 34)).toEqual(
      sha256(
        Uint8Array.from([
          ...new TextEncoder().encode('lace:passport:envelope-tag:v2'),
          ...entry.subarray(0, 2),
          ...publicKey,
          ...entry.subarray(34),
        ]),
      ),
    );
  });

  it('are not addressed to their reader once any byte, outside the tag or in it, changes', async () => {
    const { publicKey } = keyPair();
    const entry = await sealDeviceEnvelope(publicKey, secrets());

    for (const tampered of flips(entry)) {
      expect(isAddressedTo(tampered, publicKey)).toBe(false);
    }
  });

  it('are not addressed to their reader when a copy keeps the tag and ephemeral key but replaces any later range', async () => {
    const { publicKey } = keyPair();
    const entry = await sealDeviceEnvelope(publicKey, secrets());
    const ranges: [string, number, number][] = [
      ['type', 0, 1],
      ['suite', 1, 2],
      ['nonce', 66, 78],
      ['AEAD tag', 78, 94],
      ['ciphertext', 94, 158],
      ['padding', 158, 192],
    ];

    for (const [, start, end] of ranges) {
      const copied = entry.slice();
      for (let index = start; index < end; index++) copied[index] ^= 0xff;
      expect(isAddressedTo(copied, publicKey)).toBe(false);
    }
  });

  it('are listed every one, however many, while copies of their tag with other bytes are not', async () => {
    const { publicKey } = keyPair();
    const live = await sealDeviceEnvelope(publicKey, secrets());
    const copies = Array.from(
      { length: MAX_INBOX_ENTRIES_PER_REQUEST + 1 },
      (_, index) => {
        const copy = live.slice();
        copy.set(crypto.getRandomValues(new Uint8Array(126)), 66);
        copy[100] = index % 256;
        return copy;
      },
    );
    const flood = await Promise.all(
      Array.from({ length: 8 }, async () =>
        sealDeviceEnvelope(publicKey, secrets()),
      ),
    );

    expect(deviceEnvelopes([live, ...copies], publicKey)).toEqual([live]);
    expect(
      deviceEnvelopes(
        [
          live,
          ...Array.from(
            { length: MAX_INBOX_ENTRIES_PER_REQUEST / flood.length + 1 },
            () => flood,
          ).flat(),
        ],
        publicKey,
      ),
    ).toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST + flood.length + 1);
  });
});

describe('device registrations', () => {
  it('lay out type, suite, nonce, AEAD tag, ciphertext and zero padding in 192 bytes', async () => {
    const entry = await sealDeviceRegistration(
      crypto.getRandomValues(new Uint8Array(32)),
      reader,
    );

    expect(entry).toHaveLength(INBOX_ENTRY_LENGTH);
    expect(entry[0]).toBe(DEVICE_REGISTRATION_TYPE);
    expect(entry[1]).toBe(SUITE);
    expect(isZero(entry.subarray(94))).toBe(true);
    expect(isDeviceRegistration(entry)).toBe(true);
    expect(isLaceRecord(entry)).toBe(true);
  });

  it('round-trip the reader and device keys under the roster key', async () => {
    const rosterKey = crypto.getRandomValues(new Uint8Array(32));

    const entry = await sealDeviceRegistration(rosterKey, reader);

    await expect(openDeviceRegistration(rosterKey, entry)).resolves.toEqual(
      reader,
    );
  });

  it('open to null after any single byte flips or under another roster key', async () => {
    const rosterKey = crypto.getRandomValues(new Uint8Array(32));
    const entry = await sealDeviceRegistration(rosterKey, reader);

    for (const tampered of flips(entry)) {
      await expect(
        openDeviceRegistration(rosterKey, tampered),
      ).resolves.toBeNull();
    }
    await expect(
      openDeviceRegistration(crypto.getRandomValues(new Uint8Array(32)), entry),
    ).resolves.toBeNull();
    await expect(
      openDeviceRegistration(rosterKey, entry.slice(0, 191)),
    ).resolves.toBeNull();
  });

  it('share no bytes between two registrations of the same device', async () => {
    const rosterKey = crypto.getRandomValues(new Uint8Array(32));

    const first = await sealDeviceRegistration(rosterKey, reader);
    const second = await sealDeviceRegistration(rosterKey, reader);

    expect(first.subarray(2, 94)).not.toEqual(second.subarray(2, 94));
  });
});

describe('grant records', () => {
  it('lay out type, suite, recipient tag, nonce, AEAD tag and ciphertext in 192 bytes', async () => {
    const entry = await sealGrantRecord(
      x25519.utils.randomSecretKey(),
      ACCOUNT,
      recordParts[0],
    );

    expect(entry).toHaveLength(INBOX_ENTRY_LENGTH);
    expect(entry[0]).toBe(GRANT_RECORD_TYPE);
    expect(entry[1]).toBe(SUITE);
    expect(isLaceRecord(entry)).toBe(true);
  });

  it('round-trip every part for the device that sealed it', async () => {
    const readerSecret = x25519.utils.randomSecretKey();

    for (const part of recordParts) {
      const entry = await sealGrantRecord(readerSecret, ACCOUNT, part);

      await expect(
        openGrantRecord(readerSecret, ACCOUNT, entry),
      ).resolves.toEqual(part);
    }
  });

  it('open to null after any single byte flips, at another length, or for another device', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const entry = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);

    for (const tampered of flips(entry)) {
      await expect(
        openGrantRecord(readerSecret, ACCOUNT, tampered),
      ).resolves.toBeNull();
    }
    await expect(
      openGrantRecord(readerSecret, ACCOUNT, entry.slice(0, 191)),
    ).resolves.toBeNull();
    await expect(
      openGrantRecord(x25519.utils.randomSecretKey(), ACCOUNT, entry),
    ).resolves.toBeNull();
  });

  it('neither open nor match their tag under another account', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const entry = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);

    await expect(
      openGrantRecord(readerSecret, OTHER_ACCOUNT, entry),
    ).resolves.toBeNull();
    const forged = await sealGrantRecord(
      readerSecret,
      OTHER_ACCOUNT,
      recordParts[0],
    );
    expect(forged.subarray(2, 34)).not.toEqual(entry.subarray(2, 34));
    await expect(
      openGrantRecord(readerSecret, ACCOUNT, forged),
    ).resolves.toBeNull();
  });

  it('carry an HMAC-SHA256 tag under the device tag key over their type, suite and every byte after the tag', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const entry = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);
    const material = await crypto.subtle.importKey(
      'raw',
      readerSecret,
      'HKDF',
      false,
      ['deriveBits'],
    );
    const tagKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(0),
          info: Uint8Array.from([
            ...new TextEncoder().encode('lace:passport:grant-record-tag:v1'),
            ...ByteArray.fromHex(HexBytes(ACCOUNT)),
          ]),
        },
        material,
        256,
      ),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    expect(entry.subarray(2, 34)).toEqual(
      new Uint8Array(
        await crypto.subtle.sign(
          'HMAC',
          tagKey,
          Uint8Array.from([...entry.subarray(0, 2), ...entry.subarray(34)]),
        ),
      ),
    );
  });

  it('open to null when a copy keeps the tag but replaces any later range', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const entry = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);
    const ranges: [number, number][] = [
      [34, 46],
      [46, 62],
      [62, 192],
    ];

    for (const [start, end] of ranges) {
      const copied = entry.slice();
      for (let index = start; index < end; index++) copied[index] ^= 0xff;
      await expect(
        openGrantRecord(readerSecret, ACCOUNT, copied),
      ).resolves.toBeNull();
    }
  });

  it('carry a tag per record that links no two records', async () => {
    const readerSecret = x25519.utils.randomSecretKey();

    const first = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);
    const second = await sealGrantRecord(readerSecret, ACCOUNT, recordParts[0]);

    expect(first.subarray(2, 34)).not.toEqual(second.subarray(2, 34));
    expect(first.subarray(34, 46)).not.toEqual(second.subarray(34, 46));
  });

  it('refuse a grant part whose grantee the record cannot hold', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const grant = (
      granteeScheme: string,
      granteePublicKey: string,
    ): GrantRecordPart =>
      ({
        ...recordParts[1],
        granteeScheme,
        granteePublicKey,
      } as GrantRecordPart);
    const refusals: [string, string][] = [
      ['jubjub-schnorr', `02${'ef'.repeat(32)}`],
      ['jubjub-schnorr', 'ef'.repeat(31)],
      ['secp256k1-ecdsa', `04${'ef'.repeat(32)}`],
      ['secp256k1-ecdsa', 'ef'.repeat(32)],
      ['secp256k1-ecdsa', `02${'ef'.repeat(64)}`],
      ['p256-ecdsa', `02${'ef'.repeat(32)}`],
    ];

    for (const [scheme, key] of refusals) {
      await expect(
        sealGrantRecord(readerSecret, ACCOUNT, grant(scheme, key)),
      ).rejects.toThrow(
        new Error(`Grant record cannot carry this '${scheme}' grantee key`),
      );
    }
  });

  it('carry a secp256k1 grantee as its x coordinate, its parity in the part byte, at the same length', async () => {
    const readerSecret = x25519.utils.randomSecretKey();

    for (const prefix of ['02', '03']) {
      const part: GrantRecordPart = {
        part: 'grant',
        grantId,
        slot: GrantSlot(9),
        scopeSalt: GrantScopeSalt('cd'.repeat(32)),
        granteeScheme: 'secp256k1-ecdsa',
        granteePublicKey: `${prefix}${'ef'.repeat(32)}`,
      };

      const entry = await sealGrantRecord(readerSecret, ACCOUNT, part);

      expect(entry).toHaveLength(INBOX_ENTRY_LENGTH);
      await expect(
        openGrantRecord(readerSecret, ACCOUNT, entry),
      ).resolves.toEqual(part);
    }
  });

  it('open to null for a part byte no writer produces', async () => {
    const readerSecret = x25519.utils.randomSecretKey();
    const plaintext = new Uint8Array(130);
    plaintext.set(ByteArray.fromHex(HexBytes(grantId)), 1);

    for (const partByte of [5, 0xff]) {
      plaintext[0] = partByte;
      await expect(
        openGrantRecord(
          readerSecret,
          ACCOUNT,
          await sealRawGrantRecord(readerSecret, ACCOUNT, plaintext),
        ),
      ).resolves.toBeNull();
    }
    plaintext[0] = 0;
    await expect(
      openGrantRecord(
        readerSecret,
        ACCOUNT,
        await sealRawGrantRecord(readerSecret, ACCOUNT, plaintext),
      ),
    ).resolves.toMatchObject({
      part: 'grant',
      granteeScheme: 'jubjub-schnorr',
    });
  });
});

describe('known-answer vectors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Fixes every fresh random byte, ephemeral keys and nonces alike, to 0x22. */
  const fixRandomness = (): void => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(
      <T extends ArrayBufferView | null>(array: T): T => {
        if (array) {
          new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(
            0x22,
          );
        }
        return array;
      },
    );
  };

  const READER_SECRET = new Uint8Array(32).fill(0x33);
  const READER_PUBLIC_KEY =
    '7b0d47d93427f8311160781c7c733fd89f88970aef490d8aa0ee19a4cb8a1b14';
  const ROSTER_KEY = new Uint8Array(32).fill(0x55);

  it('derive the reader public key of the fixed secret', () => {
    expect(HexBytes.fromByteArray(x25519.getPublicKey(READER_SECRET))).toBe(
      READER_PUBLIC_KEY,
    );
  });

  it('seal a device envelope to the exact bytes', async () => {
    fixRandomness();

    const entry = await sealDeviceEnvelope(x25519.getPublicKey(READER_SECRET), {
      secret: new Uint8Array(32).fill(0x44),
      rosterKey: ROSTER_KEY,
    });

    expect(HexBytes.fromByteArray(entry)).toBe(
      'd10238cce6f0f9ec7443d4b3a17e6c713089359442cdc8bdfd0d22322652db6e707b0faa684ed28867b97f4a6a2dee5df8ce974e76b7018e3f22a1c4cf2678570f202222222222222222222222226c200382a0e1dad49092d547cd528f171f12233b4adaf36f09b4608863371b67d1ebd0e7dee34ef15464ed4c0ae4902b1279a0b156ebe9e5707be672063f8cb27be0d83b0fe9668b6a9d4a9c9ea507f900000000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('seal a device registration to the exact bytes', async () => {
    fixRandomness();

    const entry = await sealDeviceRegistration(ROSTER_KEY, {
      readerPublicKey: READER_PUBLIC_KEY,
      devicePublicKey: '66'.repeat(32),
    });

    expect(HexBytes.fromByteArray(entry)).toBe(
      'd2022222222222222222222222228fc30adbe62bc3142ecdcb37219ed96aa575023dc20dbb79214b58a596e0aaf2b297f7c95be8b720fa75648b6e30ff4128c699888718075a8280cd4dde4bec79f23df3ad309e9c45db55d43d8a5f5a5e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('seal each grant record part to the exact bytes, a jubjub grant as before secp256k1 grantees', async () => {
    fixRandomness();
    const id = GrantId('ab'.repeat(32));
    const parts: [GrantRecordPart, string][] = [
      [
        {
          part: 'grant',
          grantId: id,
          slot: GrantSlot(7),
          scopeSalt: GrantScopeSalt('cd'.repeat(32)),
          granteeScheme: 'jubjub-schnorr',
          granteePublicKey: 'ef'.repeat(32),
          readPublicKey: '12'.repeat(32),
        },
        'd30232efd10210fc1f34f5d3cfb9e771cb8e7e1db1a210bcc3ae12fd6493aa7e05fb222222222222222222222222f562e74fa64f1bcc5b7633d4f00dbdc2180136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef893b269e2e3a09f217fd1e7dbc0925ee905ada4b59b78667462d11ce1d2b537d21cfd3510fb605bb1beaadc168f245ede9032877b13c876f60f341a494c106fa45ae6840c10afedf4f1c868214e2ce34e36e87e459044dff6616485974f2546c344',
      ],
      [
        {
          part: 'grant',
          grantId: id,
          slot: GrantSlot(7),
          scopeSalt: GrantScopeSalt('cd'.repeat(32)),
          granteeScheme: 'jubjub-schnorr',
          granteePublicKey: 'ef'.repeat(32),
        },
        'd302846a06213448a1686f83708630875034363bd18bfbc370f50e94fff21b46f7e7222222222222222222222222578e412dcc93420d73e5b5ac6705c95d180136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef893b269e2e3a09f217fd1e7dbc0925ee905ada4b59b78667462d11ce1d2b537d21cfd3510fb605bb1beaadc168f245ede9032877b13c876f60f341a494c106fa45af4961e02bdffe6e3da7a335c3ef15c24fa6c578256cde4737697855d3754d156',
      ],
      [
        {
          part: 'grant',
          grantId: id,
          slot: GrantSlot(7),
          scopeSalt: GrantScopeSalt('cd'.repeat(32)),
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: `02${'ef'.repeat(32)}`,
          readPublicKey: '12'.repeat(32),
        },
        'd3024b51d8f6970e2d8bde8740a1a65dbf7035748719b0348733d519482250f08251222222222222222222222222bad3d8608d5f762093520dc0cb9418ad1b0136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef893b269e2e3a09f217fd1e7dbc0925ee905ada4b59b78667462d11ce1d2b537d21cfd3510fb605bb1beaadc168f245ede9032877b13c876f60f341a494c106fa45ae6840c10afedf4f1c868214e2ce34e36e87e459044dff6616485974f2546c344',
      ],
      [
        {
          part: 'grant',
          grantId: id,
          slot: GrantSlot(7),
          scopeSalt: GrantScopeSalt('cd'.repeat(32)),
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: `03${'ef'.repeat(32)}`,
        },
        'd302ad8f8fa2a7076b34ff290e7859b8cc97c6672137bde3a9e90e55e2b48be227e9222222222222222222222222bdcdeab9a8ac2f639395e263c2d845c91c0136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef893b269e2e3a09f217fd1e7dbc0925ee905ada4b59b78667462d11ce1d2b537d21cfd3510fb605bb1beaadc168f245ede9032877b13c876f60f341a494c106fa45af4961e02bdffe6e3da7a335c3ef15c24fa6c578256cde4737697855d3754d156',
      ],
      [
        {
          part: 'object',
          grantId: id,
          object: {
            color: '34'.repeat(32),
            recipient: { kind: 'user-address', value: '56'.repeat(32) },
            maxCoinValue: '1000',
          },
        },
        'd3021ca9b99b1d95e58d5a60297e35d12a604f9bbbd3cc52e1591d96408d26f5fff3222222222222222222222222aa9b4324f4a01d93158ac01a6e8f14e9190136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef8a04b901b1a5966d886281e22396ba710fc545d4c62819f8d9b28e5182b4cce2bd0448ca942d9e208071365af369de767298b3ec2aa71cf4fb68da3f0f5a9d61de3f4961e02bdffe6e3da7a335c3ef15fccfa6c578256cde4737697855d3754d156',
      ],
      [
        {
          part: 'view',
          grantId: id,
          encKeyPrefix: 'a1b2c3',
          seal: '9f'.repeat(94),
        },
        'd30279ff93e96f6c7d500542ca0b164d2bb11d9744c6cff148ae91098990570d485322222222222222222222222205650bf63e4008ce16d1f4c2f7da7b511a0136b9c02f2b04ec15e7bd13bfc9209100255948af63f7f1b88a410fa41feef835cd67b0b1f2cd732d83b58992c00cbb57fff6e7c92a342630834eb380e765804e8d45608b102bc1cedaac66ff542eaee042f70b63b806867f446a393c601fd42a6b09819d2260797c45e5acc3a16ec3bb65f3c81dc9527bece9081ac2a8cb4ec9',
      ],
    ];

    for (const [part, expected] of parts) {
      const entry = await sealGrantRecord(READER_SECRET, ACCOUNT, part);
      expect(HexBytes.fromByteArray(entry)).toBe(expected);
      await expect(
        openGrantRecord(READER_SECRET, ACCOUNT, entry),
      ).resolves.toEqual(part);
    }
  });
});

describe('upstream readers', () => {
  it('skip every Lace record kind as an entry they cannot open', async () => {
    const { secretKey, publicKey } = keyPair();
    const delivered = secrets();
    const entries = [
      await sealDeviceEnvelope(publicKey, delivered),
      await sealDeviceRegistration(delivered.rosterKey, reader),
      await sealGrantRecord(secretKey, ACCOUNT, recordParts[0]),
    ];

    for (const entry of entries) {
      await expect(openInboxEntry(secretKey, entry)).resolves.toBeNull();
      await expect(openInboxEntry(delivered.secret, entry)).resolves.toBeNull();
    }
  });

  it('are not Lace records', () => {
    const entry = new Uint8Array(INBOX_ENTRY_LENGTH);
    entry[0] = 0x01;
    entry[1] = 0x01;

    expect(isLaceRecord(entry)).toBe(false);
  });
});

describe('device public keys', () => {
  it('round-trip a device key through its compressed form', () => {
    const { pk } = JubjubDevice.generate();

    const encoded = encodeDevicePublicKey(pk);

    expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    expect(decodeDevicePublicKey(encoded)).toEqual(pk);
  });

  it('decode to undefined for bytes that name no point', () => {
    expect(decodeDevicePublicKey('ff'.repeat(32))).toBeUndefined();
    expect(decodeDevicePublicKey('zz')).toBeUndefined();
  });
});
