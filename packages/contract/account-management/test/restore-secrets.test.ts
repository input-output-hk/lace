import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearRestoreWalletSecrets,
  getRestoreWalletSecretsSnapshot,
  setRestoreWalletSecrets,
  subscribeRestoreWalletSecrets,
} from '../src/restore-secrets';

describe('restore wallet secrets buffer', () => {
  afterEach(() => {
    clearRestoreWalletSecrets();
  });

  it('starts empty', () => {
    expect(getRestoreWalletSecretsSnapshot()).toEqual({});
  });

  it('stages the recovery phrase', () => {
    setRestoreWalletSecrets({ recoveryPhrase: ['one', 'two', 'three'] });

    expect(getRestoreWalletSecretsSnapshot()).toEqual({
      recoveryPhrase: ['one', 'two', 'three'],
    });
  });

  it('collapses to a stable empty reference when cleared', () => {
    const emptyBefore = getRestoreWalletSecretsSnapshot();
    setRestoreWalletSecrets({ recoveryPhrase: ['one'] });

    clearRestoreWalletSecrets();

    const emptyAfter = getRestoreWalletSecretsSnapshot();
    expect(emptyAfter).toEqual({});
    expect(emptyAfter).toBe(emptyBefore);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRestoreWalletSecrets(listener);
    listener.mockClear();

    setRestoreWalletSecrets({ recoveryPhrase: ['one'] });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setRestoreWalletSecrets({ recoveryPhrase: ['two'] });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
