import { describe, expect, it } from 'vitest';

import loadAuthSecretVerifier from '../src/auth-secret-verifier';

import type { AuthSecret } from '@lace-contract/authentication-prompt';

describe('loadAuthSecretVerifier', () => {
  it('rejects every secret, so a stray verify can never accept an arbitrary one', async () => {
    const { verifyAuthSecret } = loadAuthSecretVerifier();

    await expect(
      verifyAuthSecret({
        authSecret: { passphrase: 'anything' } as unknown as AuthSecret,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyAuthSecret({ authSecret: {} as AuthSecret }),
    ).resolves.toBe(false);
  });
});
