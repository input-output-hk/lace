// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module needs only the monolith
// guest-data pair (ADR 38): read the legacy slices, then report the import.

import { request } from '@lace-lib/extension-shell-client';

export const pullMonolithGuestData = async () =>
  request('settings.migrateMonolithGuestData');

export const reportMonolithGuestDataImported = async () =>
  request('settings.migrateMonolithGuestDataDone');
