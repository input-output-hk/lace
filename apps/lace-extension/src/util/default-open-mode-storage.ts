// SW-side reader for the toolbar action's open-mode preference. The MV3
// service worker cannot read redux-persist before its first await, so this
// preference lives in chrome.storage.local — see ADR 26. Both the SW and
// the views-extension UI hook talk to chrome.storage.local through the
// same key.
//
// The SW deliberately does NOT register a chrome.storage.onChanged listener
// here. That listener fires on every chrome.storage.local write, which in
// Lace includes redux-persist writes — each event resets the SW idle timer
// and prevents the service worker from going dormant. The popup applies the
// new chrome.sidePanel behaviour itself after writing, and the SW reconciles
// the cached value on the next click.

import {
  DEFAULT_OPEN_MODE,
  DEFAULT_OPEN_MODE_STORAGE_KEY,
  isValidDefaultOpenMode,
} from '@lace-contract/views';

import type { DefaultOpenMode } from '@lace-contract/views';

type ChromeStorageArea = {
  get: (key: string) => Promise<Record<string, unknown>>;
};
type ChromeLike = { storage?: { local?: ChromeStorageArea } };

const getLocal = (): ChromeStorageArea | undefined =>
  (globalThis as { chrome?: ChromeLike }).chrome?.storage?.local;

export const readDefaultOpenMode = async (): Promise<DefaultOpenMode> => {
  const local = getLocal();
  if (!local) return DEFAULT_OPEN_MODE;
  const result = await local.get(DEFAULT_OPEN_MODE_STORAGE_KEY);
  const value = result[DEFAULT_OPEN_MODE_STORAGE_KEY];
  return isValidDefaultOpenMode(value) ? value : DEFAULT_OPEN_MODE;
};
