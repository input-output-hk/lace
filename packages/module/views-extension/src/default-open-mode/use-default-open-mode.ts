// React hook that mirrors `defaultOpenMode` from chrome.storage.local. Reads
// the persisted value on mount, subscribes to chrome.storage.onChanged so
// changes from another extension context (e.g. the SW or another tab)
// propagate, and exposes a setter that writes back to storage.
//
// Lives outside redux because the SW must read the same value before
// redux-persist hydrates — see ADR 26.

import {
  DEFAULT_OPEN_MODE,
  isSidePanelApiAvailable,
} from '@lace-contract/views';
import { useCallback, useEffect, useState } from 'react';

import {
  clampToAvailableMode,
  readDefaultOpenMode,
  subscribeDefaultOpenMode,
  writeDefaultOpenMode,
} from './storage';

import type { DefaultOpenMode } from '@lace-contract/views';

export type UseDefaultOpenModeResult = readonly [
  DefaultOpenMode,
  (next: DefaultOpenMode) => void,
];

// `chrome.sidePanel` availability is determined by the host browser at SW
// boot and cannot change at runtime, so we evaluate it once per render
// rather than memoising via useRef.
export const useDefaultOpenMode = (): UseDefaultOpenModeResult => {
  const [mode, setMode] = useState<DefaultOpenMode>(DEFAULT_OPEN_MODE);

  useEffect(() => {
    let isAborted = false;
    void readDefaultOpenMode().then(initial => {
      if (!isAborted) setMode(initial);
    });
    const unsubscribe = subscribeDefaultOpenMode(next => {
      setMode(next);
    });
    return () => {
      isAborted = true;
      unsubscribe();
    };
  }, []);

  const setDefaultOpenMode = useCallback((next: DefaultOpenMode) => {
    setMode(next);
    void writeDefaultOpenMode(next);
  }, []);

  const effectiveMode = clampToAvailableMode(mode, isSidePanelApiAvailable());
  return [effectiveMode, setDefaultOpenMode] as const;
};
