// The presentation-free half of a sandboxed guest's "default view mode"
// setting — where a toolbar click puts the wallet UI. The host owns the
// selection at rest and the toolbar wiring (ADR 41 `lace.settings`), so all a
// guest holds is this client: the availability gate, the label keys, and typed
// wrappers over the shared `window.lace` request client. The sheet that offers
// the choice belongs to the guest that renders it — React Native in
// apps/lace-extension-guest, DOM in the carbon guest (ADR 53/40).

import { hasLaceCapability, request } from '@lace-lib/extension-shell-client';

import type { TranslationKey } from '@lace-contract/i18n';
import type {
  GetViewModeResult,
  ViewMode,
} from '@lace-lib/extension-shell-api';

/** Whether the host advertises the write. Snapshotted from the ADR 41
 * handshake, so a host without it has no toolbar target to choose — the caller
 * omits the entry rather than leading to a sheet whose Confirm could not
 * land. */
export const canSetViewMode = (): boolean =>
  hasLaceCapability('settings.setViewMode');

/** The label key per mode. Lives beside the client so the two guests cannot
 * drift on what a host-declared mode is called. */
export const VIEW_MODE_LABEL_KEYS: Record<ViewMode, TranslationKey> = {
  sidePanel: 'v2.pages.settings.options.default-view-mode.options-side-panel',
  tab: 'v2.pages.settings.options.default-view-mode.options-tab',
};

/** The host's view-mode record, or undefined when the read did not land (no
 * `window.lace`, an older host, a refusal) — the caller then renders nothing
 * rather than guessing at a selection. */
export const getViewMode = async (): Promise<GetViewModeResult | undefined> => {
  const result = await request('settings.getViewMode');
  return result.ok ? result.value : undefined;
};

/** Record the user's toolbar target with the host; answers whether it landed.
 * Takes effect from the NEXT toolbar click — the host cannot relocate the open
 * view, which would need a user gesture this call does not carry. */
export const setViewMode = async (mode: ViewMode): Promise<boolean> => {
  const result = await request('settings.setViewMode', { mode });
  return result.ok && result.value.recorded;
};
