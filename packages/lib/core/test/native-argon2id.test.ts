import { describe, expect, it, vi } from 'vitest';

import { createNativeArgon2id } from '../src';

const params = { m: 19_456, t: 2, p: 1, dkLen: 32 };

describe('createNativeArgon2id', () => {
  it('preserves binary passwords, salts, parameters and uppercase native output', async () => {
    const derive = vi.fn(async () => 'AB'.repeat(32));
    const password = new Uint8Array([0, 255, 128, 65]);
    const salt = new Uint8Array([1, 0, 254]);
    const key = await createNativeArgon2id(derive)(password, salt, params);
    expect(derive).toHaveBeenCalledWith('00ff8041', '0100fe', 19_456, 2, 1, 32);
    expect(key).toEqual(new Uint8Array(32).fill(0xab));
    expect(password).toEqual(new Uint8Array([0, 255, 128, 65]));
    expect(salt).toEqual(new Uint8Array([1, 0, 254]));
  });

  it.each([undefined, null, 32, '', 'aa', 'z0'.repeat(32), '0'.repeat(63)])(
    'rejects malformed native output (%s)',
    async output => {
      const derive = async () => output;
      await expect(
        createNativeArgon2id(derive)(
          new Uint8Array(1),
          new Uint8Array(32),
          params,
        ),
      ).rejects.toThrow('expected 32 bytes');
    },
  );

  it('preserves bridge failures without falling back to JavaScript', async () => {
    const error = new Error('native derivation failed');
    const derive = async () => {
      throw error;
    };
    await expect(
      createNativeArgon2id(derive)(
        new Uint8Array(1),
        new Uint8Array(32),
        params,
      ),
    ).rejects.toBe(error);
  });
});
