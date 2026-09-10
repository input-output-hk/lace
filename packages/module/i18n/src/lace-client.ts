// Typed method wrapper over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). The i18n module needs only the
// `settings.setLanguage` write — the guest recording its active UI language so
// the host renders its trusted surfaces in the matching bundled locale.

import { request } from '@lace-lib/extension-shell-client';

/** Record the guest's active UI language with the host (ADR 41 lace.settings). */
export const setLanguage = async (language: string) =>
  request('settings.setLanguage', { language });
