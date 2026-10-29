import { describe, expect, it, vi } from 'vitest';

import { restrictStorageToTrustedContexts } from '../../src/sw-script/storage-access';

import type { StorageAccessDeps } from '../../src/sw-script/storage-access';

const createLogger = () => ({ warn: vi.fn() });

describe('restrictStorageToTrustedContexts', () => {
  it('restricts chrome.storage.local to trusted contexts', async () => {
    const setAccessLevel = vi.fn(async () => {});
    const logger = createLogger();

    await restrictStorageToTrustedContexts({
      storage: { setAccessLevel },
      logger,
    });

    expect(setAccessLevel).toHaveBeenCalledExactlyOnceWith({
      accessLevel: 'TRUSTED_CONTEXTS',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('resolves with a warning when the browser refuses the restriction', async () => {
    const refusal = new Error(
      'This StorageArea is not available for setting access level',
    );
    const logger = createLogger();

    await restrictStorageToTrustedContexts({
      storage: { setAccessLevel: vi.fn(async () => Promise.reject(refusal)) },
      logger,
    });

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      refusal,
    );
  });

  it('resolves with a warning when the browser lacks setAccessLevel', async () => {
    const logger = createLogger();

    await restrictStorageToTrustedContexts({
      storage: {} as StorageAccessDeps['storage'],
      logger,
    });

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      expect.any(TypeError),
    );
  });
});
