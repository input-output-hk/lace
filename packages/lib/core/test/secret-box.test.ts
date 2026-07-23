import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { emip3encrypt, SecretBox } from '../src';
import {
  decodeEnvelope,
  encodeHeader,
  HEADER_LEN,
  isSealed,
  MAGIC,
  NONCE_LEN,
  SALT_LEN,
} from '../src/secret-box/format';

vi.mock('../src/secret-box/kdf', async importOriginal => {
  const original = await importOriginal<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('../src/secret-box/kdf')
  >();
  return {
    ...original,
    deriveKey: vi.fn(async (password: Uint8Array, salt: Uint8Array) =>
      sha256(Uint8Array.from([...password, ...salt])),
    ),
  };
});

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const bytes = (array: Uint8Array): number[] => Array.from(array);

const EMIP3_ITERATIONS = 19_162;
const TAG_LEN = 16;

const legacyEncryptWithSalt = async (
  plaintext: Uint8Array,
  password: Uint8Array,
  salt: Uint8Array,
): Promise<Uint8Array> => {
  const key = await pbkdf2Async(sha512, password, salt, {
    c: EMIP3_ITERATIONS,
    dkLen: 32,
  });
  const nonce = new Uint8Array(NONCE_LEN).fill(7);
  const ciphertextWithTag = chacha20poly1305(key, nonce).encrypt(plaintext);
  const ciphertext = ciphertextWithTag.subarray(
    0,
    ciphertextWithTag.length - TAG_LEN,
  );
  const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_LEN);
  return Uint8Array.from([...salt, ...nonce, ...tag, ...ciphertext]);
};

const PASSWORD = utf8('correct horse battery staple');
const WRONG_PASSWORD = utf8('Tr0ub4dor&3');
const PLAINTEXT = utf8('seed phrase: abandon abandon abandon ...');

describe('secret-box', () => {
  let blob: Uint8Array;

  beforeAll(async () => {
    blob = await SecretBox.seal(PLAINTEXT, PASSWORD);
  });

  describe('seal', () => {
    it('produces an envelope prefixed with the SBV1 magic', () => {
      expect(isSealed(blob)).toBe(true);
      expect(bytes(blob.subarray(0, MAGIC.length))).toEqual(bytes(MAGIC));
    });

    it('produces a blob of header + ciphertext + tag length', () => {
      expect(blob.length).toBe(HEADER_LEN + PLAINTEXT.length + TAG_LEN);
    });

    it('uses a fresh salt and nonce per call, so blobs never repeat', async () => {
      const other = await SecretBox.seal(PLAINTEXT, PASSWORD);
      expect(bytes(other)).not.toEqual(bytes(blob));
    });
  });

  describe('open (SBV1)', () => {
    it('round-trips the plaintext', async () => {
      expect(bytes(await SecretBox.open(blob, PASSWORD))).toEqual(
        bytes(PLAINTEXT),
      );
    });

    it('round-trips empty plaintext', async () => {
      const empty = await SecretBox.seal(new Uint8Array(0), PASSWORD);
      expect((await SecretBox.open(empty, PASSWORD)).length).toBe(0);
    });

    it('rejects a wrong password', async () => {
      await expect(SecretBox.open(blob, WRONG_PASSWORD)).rejects.toThrow();
    });

    it('rejects a tampered ciphertext body', async () => {
      const tampered = blob.slice();
      tampered[tampered.length - 1] ^= 0xff;
      await expect(SecretBox.open(tampered, PASSWORD)).rejects.toThrow();
    });

    it('rejects a tampered salt (authenticated header)', async () => {
      const tampered = blob.slice();
      tampered[MAGIC.length] ^= 0xff;
      await expect(SecretBox.open(tampered, PASSWORD)).rejects.toThrow();
    });

    it('rejects a tampered nonce (authenticated header)', async () => {
      const tampered = blob.slice();
      tampered[HEADER_LEN - 1] ^= 0xff;
      await expect(SecretBox.open(tampered, PASSWORD)).rejects.toThrow();
    });

    it('rejects a tampered magic byte (routed to the legacy path)', async () => {
      const tampered = blob.slice();
      tampered[0] ^= 0xff;
      await expect(SecretBox.open(tampered, PASSWORD)).rejects.toThrow();
    });

    it('rejects a sealed blob with no ciphertext body', async () => {
      await expect(
        SecretBox.open(blob.slice(0, HEADER_LEN), PASSWORD),
      ).rejects.toThrow();
    });
  });

  describe('open (legacy EMIP-003)', () => {
    it('decrypts a blob produced by the canonical emip3encrypt', async () => {
      const legacy = await emip3encrypt(PLAINTEXT, PASSWORD);
      expect(isSealed(legacy)).toBe(false);
      expect(bytes(await SecretBox.open(legacy, PASSWORD))).toEqual(
        bytes(PLAINTEXT),
      );
    });

    it('rejects a legacy blob opened with a wrong password', async () => {
      const legacy = await emip3encrypt(PLAINTEXT, PASSWORD);
      await expect(SecretBox.open(legacy, WRONG_PASSWORD)).rejects.toThrow();
    });

    it('decrypts a legacy blob whose salt begins with the SBV1 magic', async () => {
      const salt = new Uint8Array(SALT_LEN);
      salt.set(MAGIC, 0);
      const legacy = await legacyEncryptWithSalt(PLAINTEXT, PASSWORD, salt);
      expect(isSealed(legacy)).toBe(true);
      expect(bytes(await SecretBox.open(legacy, PASSWORD))).toEqual(
        bytes(PLAINTEXT),
      );
    });
  });

  describe('isSealed', () => {
    it('is false for input shorter than the header', () => {
      expect(isSealed(MAGIC)).toBe(false);
      expect(isSealed(new Uint8Array(0))).toBe(false);
    });

    it('is false when the magic does not match', () => {
      const notMagic = new Uint8Array(HEADER_LEN);
      expect(isSealed(notMagic)).toBe(false);
    });
  });

  describe('format guards', () => {
    it('encodeHeader rejects a salt of the wrong length', () => {
      expect(() =>
        encodeHeader(new Uint8Array(SALT_LEN - 1), new Uint8Array(NONCE_LEN)),
      ).toThrow(RangeError);
    });

    it('encodeHeader rejects a nonce of the wrong length', () => {
      expect(() =>
        encodeHeader(new Uint8Array(SALT_LEN), new Uint8Array(NONCE_LEN + 1)),
      ).toThrow(RangeError);
    });

    it('decodeEnvelope rejects a blob without the magic', () => {
      expect(() => decodeEnvelope(new Uint8Array(HEADER_LEN))).toThrow();
    });
  });
});
