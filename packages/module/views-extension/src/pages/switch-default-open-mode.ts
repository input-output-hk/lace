// Pure orchestration for switching the default open mode from inside a view
// (tab or side panel). Extracted for unit testing — the React component just
// wires the deps.
//
// User-gesture rule (Chrome): `chrome.sidePanel.open()` rejects unless called
// synchronously during a user gesture. Callers MUST keep `openSidePanel` a
// synchronous wrapper around `chrome.sidePanel.open` and invoke this helper
// directly from the click handler — no `await` before it.
//
// Self-close is intentionally NOT performed here. The page → SW messenger
// debounces dispatches by ~10ms before flushing, so a synchronous
// `window.close()` after `persistMode` would drop the message. The component
// observes the dispatched preference round-tripping back via its existing
// reactive selector and closes itself then.

import type { DefaultOpenMode } from '@lace-contract/views';

export type SwitchDefaultOpenModeDeps = {
  // Synchronous side-panel open. Must call `chrome.sidePanel.open` without
  // any preceding await/.then to keep the user-gesture token.
  openSidePanel: (windowId: number) => void;
  openTab: () => void;
  // Cached at component mount via `windows.getCurrent()`. Undefined on the
  // first render before the lookup resolves; we treat that as "abort the
  // switch" rather than guessing.
  windowId: number | undefined;
  persistMode: (mode: DefaultOpenMode) => void;
  logger: { error: (...args: unknown[]) => void };
};

/**
 * @returns true when the switch was initiated (caller should arm self-close
 *   on the new preference value), false when aborted.
 */
export const switchDefaultOpenMode = (
  deps: SwitchDefaultOpenModeDeps,
  selectedMode: DefaultOpenMode,
): boolean => {
  if (selectedMode === 'sidePanel') {
    if (deps.windowId === undefined) {
      deps.logger.error(
        'Cannot switch to side panel: current window ID is not yet available',
      );
      return false;
    }
    deps.openSidePanel(deps.windowId);
  } else {
    deps.openTab();
  }
  deps.persistMode(selectedMode);
  return true;
};
