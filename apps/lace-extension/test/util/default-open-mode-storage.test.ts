import {
  DEFAULT_OPEN_MODE,
  DEFAULT_OPEN_MODE_STORAGE_KEY,
} from '@lace-contract/views';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readDefaultOpenMode } from '../../src/util/default-open-mode-storage';

const stubChromeStorage = (initial: Record<string, unknown> = {}) => {
  const get = vi.fn(async (key: string) =>
    key in initial ? { [key]: initial[key] } : {},
  );
  (globalThis as { chrome?: unknown }).chrome = {
    storage: { local: { get } },
  };
  return { get };
};

const clearChrome = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
};

describe('default-open-mode-storage (SW-side)', () => {
  beforeEach(() => {
    clearChrome();
  });
  afterEach(() => {
    clearChrome();
  });

  describe('readDefaultOpenMode', () => {
    it('returns the persisted value when valid', async () => {
      stubChromeStorage({ [DEFAULT_OPEN_MODE_STORAGE_KEY]: 'tab' });
      await expect(readDefaultOpenMode()).resolves.toBe('tab');
    });

    it('returns the default when the value is missing', async () => {
      stubChromeStorage({});
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });

    it('returns the default when the value is invalid', async () => {
      stubChromeStorage({ [DEFAULT_OPEN_MODE_STORAGE_KEY]: 'something-else' });
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });

    it('returns the default when chrome.storage is unavailable', async () => {
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });
  });
});
