// Pure logic for the SW's chrome.action.onClicked handler. Extracted so the
// branches can be unit-tested without booting the SW.
//
// The `sidePanel` permission is declared as required in manifest.json, so
// either:
//   - the host browser recognises it and auto-grants it at install time
//     (Chrome / Edge / Brave / Arc, …) — `chrome.sidePanel` is callable; or
//   - the host browser silently ignores the unknown permission name
//     (older Chromium forks, e.g. Yandex) — `chrome.sidePanel` is undefined.
// We branch on the runtime presence of the API, not on a permission probe.

import type { DefaultOpenMode } from '@lace-contract/views';

export type ActionClickHandlerDeps = {
  // Runtime check for `chrome.sidePanel`. False on hosts that don't ship the
  // API (older Chromium forks).
  isSidePanelApiAvailable: () => boolean;
  // The user's persisted mode preference. The slice forces 'tab' when the
  // API is unavailable; we still gate on `isSidePanelApiAvailable` here as
  // defence in depth.
  getStoredDefaultOpenMode: () => DefaultOpenMode;
  openLaceTab: () => Promise<void>;
  openSidePanel: (windowId: number) => Promise<void>;
  logger: { error: (...args: unknown[]) => void };
};

/**
 * Routes a toolbar-action click:
 *   - host doesn't ship sidePanel, or user chose tab → open a tab.
 *   - otherwise → open the side panel; on failure, fall back to a tab.
 */
export const handleActionClick = async (
  deps: ActionClickHandlerDeps,
  tab: { windowId?: number },
): Promise<void> => {
  const shouldOpenSidePanel =
    deps.isSidePanelApiAvailable() &&
    deps.getStoredDefaultOpenMode() === 'sidePanel';

  if (!shouldOpenSidePanel || tab.windowId === undefined) {
    await deps.openLaceTab();
    return;
  }

  try {
    await deps.openSidePanel(tab.windowId);
  } catch (error) {
    deps.logger.error('Failed to open side panel imperatively', error);
    await deps.openLaceTab();
  }
};
