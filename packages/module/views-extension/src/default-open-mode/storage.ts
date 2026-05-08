// MV3 service workers cannot read redux-persist before they hit their first
// await. The toolbar action's open-mode preference therefore lives directly
// in chrome.storage.local — both the SW and this module's UI hook read/write
// it through the same key. See ADR 26.

import {
  applySidePanelBehavior,
  DEFAULT_OPEN_MODE,
  DEFAULT_OPEN_MODE_STORAGE_KEY,
  isValidDefaultOpenMode,
} from '@lace-contract/views';

import type { DefaultOpenMode } from '@lace-contract/views';

type ChromeStorageChange = { newValue?: unknown; oldValue?: unknown };
type ChromeStorageArea = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};
type ChromeStorageOnChanged = {
  addListener: (
    listener: (
      changes: Record<string, ChromeStorageChange>,
      areaName: string,
    ) => void,
  ) => void;
  removeListener: (
    listener: (
      changes: Record<string, ChromeStorageChange>,
      areaName: string,
    ) => void,
  ) => void;
};
type ChromeLike = {
  storage?: { local?: ChromeStorageArea; onChanged?: ChromeStorageOnChanged };
};

const getChromeStorage = (): ChromeStorageArea | undefined =>
  (globalThis as { chrome?: ChromeLike }).chrome?.storage?.local;

const getChromeOnChanged = (): ChromeStorageOnChanged | undefined =>
  (globalThis as { chrome?: ChromeLike }).chrome?.storage?.onChanged;

export const readDefaultOpenMode = async (): Promise<DefaultOpenMode> => {
  const storage = getChromeStorage();
  if (!storage) return DEFAULT_OPEN_MODE;
  const result = await storage.get(DEFAULT_OPEN_MODE_STORAGE_KEY);
  const value = result[DEFAULT_OPEN_MODE_STORAGE_KEY];
  return isValidDefaultOpenMode(value) ? value : DEFAULT_OPEN_MODE;
};

/**
 * Persists the new mode and immediately tells Chrome how to handle future
 * toolbar-action clicks. Calling `setPanelBehavior` from the popup means
 * the SW does not need a `chrome.storage.onChanged` listener to react to
 * mode changes — that listener would fire on every redux-persist write and
 * keep the SW alive (see ADR 26).
 */
export const writeDefaultOpenMode = async (
  mode: DefaultOpenMode,
): Promise<void> => {
  const storage = getChromeStorage();
  if (storage) {
    await storage.set({ [DEFAULT_OPEN_MODE_STORAGE_KEY]: mode });
  }
  await applySidePanelBehavior(mode);
};

/**
 * Defence in depth for hosts that don't ship `chrome.sidePanel` (older
 * Chromium forks). `settingsPageUI` already hides the entry on those hosts,
 * but if a stale 'sidePanel' value somehow survives, we coerce it to 'tab'
 * so the UI cannot display an option that the runtime can't honour.
 */
export const clampToAvailableMode = (
  mode: DefaultOpenMode,
  isSidePanelAvailable: boolean,
): DefaultOpenMode => (isSidePanelAvailable ? mode : 'tab');

export const subscribeDefaultOpenMode = (
  onChange: (mode: DefaultOpenMode) => void,
): (() => void) => {
  const onChanged = getChromeOnChanged();
  if (!onChanged) return () => {};
  const listener = (
    changes: Record<string, ChromeStorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    const change = changes[DEFAULT_OPEN_MODE_STORAGE_KEY];
    if (!change) return;
    const next = isValidDefaultOpenMode(change.newValue)
      ? change.newValue
      : DEFAULT_OPEN_MODE;
    onChange(next);
  };
  onChanged.addListener(listener);
  return () => {
    onChanged.removeListener(listener);
  };
};
