import { midnightAccount } from '@lace-contract/midnight-context/src/stub-data';
import { SecretBox } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadAccountKeys } from '../../src/store/account-keys';
import { createAccountKeyManager } from '../../src/store/side-effects/account-key-manager';

import type { AuthSecret } from '@lace-contract/authentication-prompt';

const auth = {} as AuthSecret;
const encryptedSeed = HexBytes('aabb');
const seed = () => new Uint8Array(32).fill(7);

afterEach(() => vi.restoreAllMocks());

describe('account key loading ownership', () => {
  it('clears the decrypted seed immediately and the retained buffers on cache clear', async () => {
    const plaintext = [seed(), seed(), seed(), seed()];
    const open = vi.spyOn(SecretBox, 'open');
    plaintext.forEach(buffer => open.mockResolvedValueOnce(buffer));
    const keys = await firstValueFrom(
      loadAccountKeys(midnightAccount.blockchainSpecific, encryptedSeed, auth),
    );
    expect(plaintext[3].every(byte => byte === 0)).toBe(true);
    expect(plaintext[0].some(byte => byte !== 0)).toBe(true);
    keys.clear();
    expect(plaintext.every(buffer => buffer.every(byte => byte === 0))).toBe(
      true,
    );
  });

  it('clears already decrypted buffers when a later decryption fails', async () => {
    const first = seed();
    const error = new Error('bad password or ciphertext');
    vi.spyOn(SecretBox, 'open')
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(error);
    await expect(
      firstValueFrom(
        loadAccountKeys(
          midnightAccount.blockchainSpecific,
          encryptedSeed,
          auth,
        ),
      ),
    ).rejects.toBe(error);
    expect(first.every(byte => byte === 0)).toBe(true);
  });

  it('discards and clears keys that finish loading after manager destruction', async () => {
    const plaintext = [seed(), seed(), seed(), seed()];
    let finish!: (bytes: Uint8Array) => void;
    const open = vi.spyOn(SecretBox, 'open');
    plaintext.slice(0, 3).forEach(buffer => open.mockResolvedValueOnce(buffer));
    open.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const next = vi.fn();
    const manager = createAccountKeyManager({
      requestKeys: () =>
        loadAccountKeys(
          midnightAccount.blockchainSpecific,
          encryptedSeed,
          auth,
        ),
    });
    const subscription = manager.keys$.subscribe(next);
    await vi.waitFor(() => {
      expect(open).toHaveBeenCalledTimes(4);
    });
    manager.destroy();
    expect(subscription.closed).toBe(true);
    finish(plaintext[3]);
    await vi.waitFor(() => {
      expect(plaintext.every(buffer => buffer.every(byte => byte === 0))).toBe(
        true,
      );
    });
    expect(next).not.toHaveBeenCalled();
  });
});
