import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearPendingCreateWalletSecrets,
  getPendingCreateWalletPasswordUtf8,
  getPendingCreateWalletSecretsSnapshot,
  setPendingCreateWalletSecrets,
  subscribePendingCreateWalletSecrets,
} from '../src/pending-secrets';

describe('pending create wallet secrets buffer', () => {
  afterEach(() => {
    clearPendingCreateWalletSecrets();
  });

  it('starts empty', () => {
    expect(getPendingCreateWalletSecretsSnapshot()).toEqual({});
    expect(getPendingCreateWalletPasswordUtf8()).toBeUndefined();
  });

  it('encodes the password and merges the recovery phrase', () => {
    setPendingCreateWalletSecrets({ password: 'abc' });
    setPendingCreateWalletSecrets({
      recoveryPhrase: ['one', 'two', 'three'],
    });

    expect(getPendingCreateWalletPasswordUtf8()).toBe('abc');
    expect(getPendingCreateWalletSecretsSnapshot().recoveryPhrase).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('redacts the stored password', () => {
    setPendingCreateWalletSecrets({ password: 'abc' });

    const { password } = getPendingCreateWalletSecretsSnapshot();
    expect(String(password)).toBe('[REDACTED]');
    expect(JSON.stringify({ password })).not.toContain('abc');
  });

  it('removes and zeroizes the password when set to undefined', () => {
    setPendingCreateWalletSecrets({
      password: 'abc',
      recoveryPhrase: ['one'],
    });
    const previousPassword = getPendingCreateWalletSecretsSnapshot().password;

    setPendingCreateWalletSecrets({ password: undefined });

    expect(getPendingCreateWalletPasswordUtf8()).toBeUndefined();
    expect(getPendingCreateWalletSecretsSnapshot().recoveryPhrase).toEqual([
      'one',
    ]);
    expect(previousPassword && [...previousPassword].every(b => b === 0)).toBe(
      true,
    );
  });

  it('collapses to a stable empty reference when no secrets remain', () => {
    const emptyBefore = getPendingCreateWalletSecretsSnapshot();
    setPendingCreateWalletSecrets({ password: 'abc' });
    setPendingCreateWalletSecrets({ password: undefined });

    const emptyAfter = getPendingCreateWalletSecretsSnapshot();
    expect(emptyAfter).toEqual({});
    expect(emptyAfter).toBe(emptyBefore);
  });

  it('zeroizes the password on clear', () => {
    setPendingCreateWalletSecrets({ password: 'abc' });
    const password = getPendingCreateWalletSecretsSnapshot().password;

    clearPendingCreateWalletSecrets();

    expect(getPendingCreateWalletSecretsSnapshot()).toEqual({});
    expect(password && [...password].every(b => b === 0)).toBe(true);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePendingCreateWalletSecrets(listener);
    listener.mockClear();

    setPendingCreateWalletSecrets({ password: 'abc' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setPendingCreateWalletSecrets({ password: 'def' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
