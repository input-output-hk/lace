import { RecordCorruptedError } from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import {
  isSealedRecord,
  openRecord,
  sealRecord,
} from '../../src/store/envelope';

const record = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const importAesKey = async (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

const sealingKey = async () => importAesKey(new Uint8Array(32).fill(7));
const otherKey = async () => importAesKey(new Uint8Array(32).fill(8));

const flipFirstHexChar = (hex: string): string =>
  (hex.startsWith('0') ? '1' : '0') + hex.slice(1);

describe('sealRecord/openRecord', () => {
  it('round-trips a record through the sealed envelope', async () => {
    const key = await sealingKey();
    const sealed = await sealRecord(key, record);
    await expect(openRecord(key, sealed)).resolves.toEqual(record);
  });

  it('produces a versioned hex envelope with a 12-byte IV', async () => {
    const sealed = await sealRecord(await sealingKey(), record);
    expect(sealed.v).toBe(1);
    expect(sealed.iv).toMatch(/^[0-9a-f]{24}$/);
    expect(sealed.ciphertext).toMatch(/^[0-9a-f]+$/);
  });

  it('draws a fresh IV for every seal', async () => {
    const key = await sealingKey();
    const first = await sealRecord(key, record);
    const second = await sealRecord(key, record);
    expect(second.iv).not.toBe(first.iv);
    expect(second.ciphertext).not.toBe(first.ciphertext);
  });

  it('rejects a tampered ciphertext', async () => {
    const key = await sealingKey();
    const sealed = await sealRecord(key, record);
    await expect(
      openRecord(key, {
        ...sealed,
        ciphertext: flipFirstHexChar(sealed.ciphertext),
      }),
    ).rejects.toThrow(RecordCorruptedError);
  });

  it('rejects a tampered IV', async () => {
    const key = await sealingKey();
    const sealed = await sealRecord(key, record);
    await expect(
      openRecord(key, { ...sealed, iv: flipFirstHexChar(sealed.iv) }),
    ).rejects.toThrow(RecordCorruptedError);
  });

  it('rejects an envelope sealed under a different key', async () => {
    const sealed = await sealRecord(await sealingKey(), record);
    await expect(openRecord(await otherKey(), sealed)).rejects.toThrow(
      RecordCorruptedError,
    );
  });
});

describe('isSealedRecord', () => {
  it('recognises the sealed envelope layout', async () => {
    expect(isSealedRecord(await sealRecord(await sealingKey(), record))).toBe(
      true,
    );
  });

  it.each([
    ['a plaintext record', record],
    ['undefined', undefined],
    ['null', null],
    ['a string', 'sealed'],
    ['an unknown version', { v: 2, iv: '00', ciphertext: '00' }],
    ['a missing ciphertext', { v: 1, iv: '00' }],
  ])('rejects %s', (_name, value) => {
    expect(isSealedRecord(value)).toBe(false);
  });
});
