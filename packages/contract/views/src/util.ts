import { REQUIRED_SYNC_PERCENTAGE } from './const';

import type { View, ViewType } from './types';

export const isViewOfType =
  <T extends ViewType>(viewType: T) =>
  (view: Readonly<View>): view is Omit<View, 'type'> & { type: T } =>
    view.type === viewType;

export const areViewsEqual = (view1: View, view2: View) =>
  view1.id === view2.id &&
  view1.location === view2.location &&
  view1.type === view2.type;

export const isSynced = (
  currentSyncPercentage?: number,
  desiredSyncPercentage = REQUIRED_SYNC_PERCENTAGE,
) => currentSyncPercentage && currentSyncPercentage >= desiredSyncPercentage;

/**
 * Detects whether the chrome.sidePanel API is currently callable. Because
 * `sidePanel` is declared as a required permission, hosts that recognise the
 * permission auto-grant it at install time and the namespace is defined.
 * Hosts that don't recognise the permission name (older Chromium forks, e.g.
 * Yandex) silently ignore it and leave the namespace undefined. Use this to
 * decide whether to target the side panel from runtime code (dapp connector,
 * SW action handler, settings UI visibility).
 */
export const isSidePanelApiAvailable = (): boolean => {
  const c = (
    globalThis as { chrome?: { sidePanel?: { setPanelBehavior?: unknown } } }
  ).chrome;
  return typeof c?.sidePanel?.setPanelBehavior === 'function';
};

/** User's preferred target for the toolbar action: side panel or regular tab. */
export type DefaultOpenMode = 'sidePanel' | 'tab';

/**
 * Storage key (chrome.storage.local) and default for the user's preferred
 * toolbar-action target. Lives outside redux because the MV3 service worker
 * must read it before redux-persist hydrates — see ADR 26.
 */
export const DEFAULT_OPEN_MODE_STORAGE_KEY = 'lace.defaultOpenMode';
export const DEFAULT_OPEN_MODE: DefaultOpenMode = 'sidePanel';

export const isValidDefaultOpenMode = (
  value: unknown,
): value is DefaultOpenMode => value === 'sidePanel' || value === 'tab';

/**
 * Tells Chrome whether toolbar-action clicks should open the side panel
 * declaratively (no SW wake) or fall through to `chrome.action.onClicked`.
 * No-op on hosts without `chrome.sidePanel`. Returns the in-flight Promise
 * so callers can attach error logging; not awaiting is safe — Chrome accepts
 * the new behaviour for future clicks regardless of when this resolves.
 */
export const applySidePanelBehavior = (
  mode: DefaultOpenMode,
): Promise<void> | undefined => {
  const sidePanel = (
    globalThis as {
      chrome?: {
        sidePanel?: {
          setPanelBehavior?: (b: {
            openPanelOnActionClick: boolean;
          }) => Promise<void>;
        };
      };
    }
  ).chrome?.sidePanel;
  if (typeof sidePanel?.setPanelBehavior !== 'function') return undefined;
  return sidePanel.setPanelBehavior({
    openPanelOnActionClick: mode === 'sidePanel',
  });
};
