import { describe, expect, it, vi } from 'vitest';

import { RemoteSignerResultError } from '../src/cardano-remote-signer-factory';
import { requestRemoteCardanoAccountPublicKey } from '../src/remote-cardano-account-public-key';

const extendedAccountPublicKey = 'ab'.repeat(64);

describe('requestRemoteCardanoAccountPublicKey', () => {
  it('sends the account index and returns the served key', async () => {
    const request = vi.fn(async () => ({
      accountIndex: 2,
      extendedAccountPublicKey,
    }));

    await expect(
      requestRemoteCardanoAccountPublicKey({ request }, 2),
    ).resolves.toBe(extendedAccountPublicKey);
    expect(request).toHaveBeenCalledWith('cardano-account-public-key', {
      accountIndex: 2,
    });
  });

  it.each([
    [
      'a result for another account',
      { accountIndex: 1, extendedAccountPublicKey },
    ],
    [
      'a key of the wrong length',
      { accountIndex: 0, extendedAccountPublicKey: 'ab' },
    ],
    [
      'a key that is not hex',
      { accountIndex: 0, extendedAccountPublicKey: 'zz'.repeat(64) },
    ],
    ['a missing key', { accountIndex: 0 }],
    ['a non-object result', extendedAccountPublicKey],
  ])('refuses %s', async (_, result) => {
    const request = vi.fn(async () => result);

    await expect(
      requestRemoteCardanoAccountPublicKey({ request }, 0),
    ).rejects.toThrow(RemoteSignerResultError);
  });

  it('propagates a signer failure', async () => {
    const failure = new Error('declined');
    const request = vi.fn(async () => {
      throw failure;
    });

    await expect(
      requestRemoteCardanoAccountPublicKey({ request }, 0),
    ).rejects.toBe(failure);
  });
});
