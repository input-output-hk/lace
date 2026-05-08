import {
  DEFAULT_OPEN_MODE,
  DEFAULT_OPEN_MODE_STORAGE_KEY,
} from '@lace-contract/views';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clampToAvailableMode,
  readDefaultOpenMode,
  subscribeDefaultOpenMode,
  writeDefaultOpenMode,
} from '../../src/default-open-mode/storage';

type StorageChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;

const stubChromeStorage = (initial: Record<string, unknown> = {}) => {
  const store = { ...initial };
  const listeners = new Set<StorageChangeListener>();
  const get = vi.fn(async (key: string) =>
    key in store ? { [key]: store[key] } : {},
  );
  const set = vi.fn(async (items: Record<string, unknown>) => {
    const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> =
      {};
    for (const [key, newValue] of Object.entries(items)) {
      changes[key] = { newValue, oldValue: store[key] };
      store[key] = newValue;
    }
    listeners.forEach(l => {
      l(changes, 'local');
    });
  });
  const fireExternalChange = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    listeners.forEach(l => {
      l(changes, areaName);
    });
  };
  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: { get, set },
      onChanged: {
        addListener: (l: StorageChangeListener) => listeners.add(l),
        removeListener: (l: StorageChangeListener) => listeners.delete(l),
      },
    },
  };
  return { get, set, fireExternalChange, listeners };
};

const clearChrome = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
};

describe('default-open-mode/storage', () => {
  beforeEach(() => {
    clearChrome();
  });
  afterEach(() => {
    clearChrome();
  });

  describe('readDefaultOpenMode', () => {
    it('returns the persisted value when present and valid', async () => {
      stubChromeStorage({ [DEFAULT_OPEN_MODE_STORAGE_KEY]: 'tab' });
      await expect(readDefaultOpenMode()).resolves.toBe('tab');
    });

    it('returns the default when the value is missing', async () => {
      stubChromeStorage({});
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });

    it('returns the default when the value is invalid (forward-compat)', async () => {
      stubChromeStorage({ [DEFAULT_OPEN_MODE_STORAGE_KEY]: 'unknown-mode' });
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });

    it('returns the default when chrome.storage is unavailable', async () => {
      await expect(readDefaultOpenMode()).resolves.toBe(DEFAULT_OPEN_MODE);
    });
  });

  describe('writeDefaultOpenMode', () => {
    it('persists the value under the shared storage key', async () => {
      const { set } = stubChromeStorage();
      await writeDefaultOpenMode('tab');
      expect(set).toHaveBeenCalledWith({
        [DEFAULT_OPEN_MODE_STORAGE_KEY]: 'tab',
      });
    });

    it('updates chrome.sidePanel.setPanelBehavior when the API is available', async () => {
      const setPanelBehavior = vi.fn(async () => {});
      stubChromeStorage();
      (globalThis as { chrome?: { sidePanel?: unknown } }).chrome!.sidePanel = {
        setPanelBehavior,
      };
      await writeDefaultOpenMode('tab');
      expect(setPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: false,
      });
      await writeDefaultOpenMode('sidePanel');
      expect(setPanelBehavior).toHaveBeenLastCalledWith({
        openPanelOnActionClick: true,
      });
    });

    it('is a no-op when chrome.storage is unavailable', async () => {
      await expect(writeDefaultOpenMode('tab')).resolves.toBeUndefined();
    });
  });

  describe('subscribeDefaultOpenMode', () => {
    it('notifies subscribers of valid changes from another context', () => {
      const { fireExternalChange } = stubChromeStorage();
      const onChange = vi.fn();
      subscribeDefaultOpenMode(onChange);

      fireExternalChange(
        { [DEFAULT_OPEN_MODE_STORAGE_KEY]: { newValue: 'tab' } },
        'local',
      );

      expect(onChange).toHaveBeenCalledWith('tab');
    });

    it('falls back to the default when the new value is invalid', () => {
      const { fireExternalChange } = stubChromeStorage();
      const onChange = vi.fn();
      subscribeDefaultOpenMode(onChange);

      fireExternalChange(
        { [DEFAULT_OPEN_MODE_STORAGE_KEY]: { newValue: 42 } },
        'local',
      );

      expect(onChange).toHaveBeenCalledWith(DEFAULT_OPEN_MODE);
    });

    it('ignores changes from other storage areas', () => {
      const { fireExternalChange } = stubChromeStorage();
      const onChange = vi.fn();
      subscribeDefaultOpenMode(onChange);

      fireExternalChange(
        { [DEFAULT_OPEN_MODE_STORAGE_KEY]: { newValue: 'tab' } },
        'sync',
      );

      expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores changes for unrelated keys', () => {
      const { fireExternalChange } = stubChromeStorage();
      const onChange = vi.fn();
      subscribeDefaultOpenMode(onChange);

      fireExternalChange({ otherKey: { newValue: 'tab' } }, 'local');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('removes the listener when unsubscribe is called', () => {
      const { fireExternalChange, listeners } = stubChromeStorage();
      const onChange = vi.fn();
      const unsubscribe = subscribeDefaultOpenMode(onChange);
      expect(listeners.size).toBe(1);

      unsubscribe();
      expect(listeners.size).toBe(0);

      fireExternalChange(
        { [DEFAULT_OPEN_MODE_STORAGE_KEY]: { newValue: 'tab' } },
        'local',
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it('returns a noop unsubscribe when chrome.storage is unavailable', () => {
      const unsubscribe = subscribeDefaultOpenMode(vi.fn());
      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('clampToAvailableMode', () => {
    it('returns the requested mode when sidePanel API is available', () => {
      expect(clampToAvailableMode('sidePanel', true)).toBe('sidePanel');
      expect(clampToAvailableMode('tab', true)).toBe('tab');
    });

    it('forces tab when sidePanel API is unavailable, regardless of input', () => {
      expect(clampToAvailableMode('sidePanel', false)).toBe('tab');
      expect(clampToAvailableMode('tab', false)).toBe('tab');
    });
  });
});
