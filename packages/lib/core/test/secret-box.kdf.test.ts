import { afterEach, describe, expect, it } from 'vitest';

import { SecretBox } from '../src';
import { SALT_LEN } from '../src/secret-box/format';
import { deriveKey } from '../src/secret-box/kdf';

import type { Argon2idParams } from '../src';

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const bytes = (array: Uint8Array): number[] => Array.from(array);
const hex = (array: Uint8Array): string => Buffer.from(array).toString('hex');

const PASSWORD = utf8('correct horse battery staple');
const PLAINTEXT = utf8('seed phrase: abandon abandon abandon ...');

describe('secret-box real Argon2id', () => {
  it('round-trips a plaintext through a real seal and open', async () => {
    const blob = await SecretBox.seal(PLAINTEXT, PASSWORD);
    expect(bytes(await SecretBox.open(blob, PASSWORD))).toEqual(
      bytes(PLAINTEXT),
    );
  });

  it('derives the documented Argon2id key for a fixed password and salt', async () => {
    const salt = Uint8Array.from(Buffer.from('42'.repeat(SALT_LEN), 'hex'));
    const key = await deriveKey(PASSWORD, salt);
    expect(hex(key)).toBe(
      '882dd7c79f70c4d0a8b96839a64b8be5dca4a9b7c7ecb6030e2194a12a414a04',
    );
  });
});

describe('secret-box pluggable Argon2id implementation', () => {
  afterEach(() => {
    SecretBox.setArgon2idImplementation();
  });

  it('routes seal and open key derivation through the registered implementation', async () => {
    const calls: Argon2idParams[] = [];
    SecretBox.setArgon2idImplementation(async (_password, _salt, params) => {
      calls.push(params);
      return new Uint8Array(params.dkLen).fill(7);
    });

    const blob = await SecretBox.seal(PLAINTEXT, PASSWORD);
    expect(bytes(await SecretBox.open(blob, PASSWORD))).toEqual(
      bytes(PLAINTEXT),
    );
    expect(calls).toEqual([
      { m: 19_456, t: 2, p: 1, dkLen: 32 },
      { m: 19_456, t: 2, p: 1, dkLen: 32 },
    ]);
  });

  it('restores the default implementation when reset with no argument', async () => {
    SecretBox.setArgon2idImplementation(async (_password, _salt, params) =>
      new Uint8Array(params.dkLen).fill(7),
    );
    SecretBox.setArgon2idImplementation();

    const salt = Uint8Array.from(Buffer.from('42'.repeat(SALT_LEN), 'hex'));
    expect(hex(await deriveKey(PASSWORD, salt))).toBe(
      '882dd7c79f70c4d0a8b96839a64b8be5dca4a9b7c7ecb6030e2194a12a414a04',
    );
  });
});
