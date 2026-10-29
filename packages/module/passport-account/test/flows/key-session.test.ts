import { describe, expect, it, vi } from 'vitest';

import { inKeySession } from '../../src/flows/key-session';

import type { PassportAuthoriser } from '@lace-contract/passport';

const flow = { kind: 'sign-in' as const };

const authoriserWith = (
  withKeySession?: PassportAuthoriser['withKeySession'],
): PassportAuthoriser => ({
  scheme: 'jubjub-schnorr',
  deviceCommitment: vi.fn(),
  devicePublicKey: vi.fn(),
  authorise: vi.fn(),
  withKeySession,
});

describe('inKeySession', () => {
  it('delegates the operation and the flow to withKeySession when the authoriser exposes one', async () => {
    const withKeySession = vi.fn(async (operation: () => Promise<unknown>) =>
      operation(),
    );
    const operation = vi.fn(async () => 7);

    await expect(
      inKeySession(
        authoriserWith(withKeySession as PassportAuthoriser['withKeySession']),
        flow,
        operation,
      ),
    ).resolves.toBe(7);
    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(operation, flow);
  });

  it('runs the operation directly when the authoriser exposes no session', async () => {
    const operation = vi.fn(async () => 7);

    await expect(inKeySession(authoriserWith(), flow, operation)).resolves.toBe(
      7,
    );
    expect(operation).toHaveBeenCalledOnce();
  });

  it('rejects with the failure the session reports', async () => {
    const withKeySession = vi.fn(async () => {
      throw new Error('session lost');
    });

    await expect(
      inKeySession(
        authoriserWith(withKeySession as PassportAuthoriser['withKeySession']),
        flow,
        async () => 7,
      ),
    ).rejects.toThrow('session lost');
  });
});
