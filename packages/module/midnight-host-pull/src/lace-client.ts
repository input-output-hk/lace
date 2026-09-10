// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module needs only the host-owned
// Midnight methods (ADR 47): requestSync / getSyncStatus / getState /
// requestSend / getSendResult / requestResetSyncState — plus the active-network
// write-back (ADR 41 `lace.settings`).

import { request } from '@lace-lib/extension-shell-client';

import type { MidnightSendParams } from '@lace-lib/extension-shell-api';

export type MidnightAccountRef = {
  walletId: string;
  accountIndex: number;
  network: string;
};

export const requestMidnightSync = async (ref: MidnightAccountRef) =>
  request('midnight.requestSync', ref);
export const getMidnightSyncStatus = async (ref: MidnightAccountRef) =>
  request('midnight.getSyncStatus', ref);
export const getMidnightState = async (ref: MidnightAccountRef) =>
  request('midnight.getState', ref);
export const requestMidnightSend = async (params: MidnightSendParams) =>
  request('midnight.requestSend', params);
export const getMidnightSendResult = async (ceremonyId: string) =>
  request('midnight.getSendResult', { ceremonyId });
/** Stop the account's host engine session and delete its persisted sync
 * checkpoint (ADR 47) — the host half of "reset sync state". Completes inline;
 * sync restarts on the guest's own cold-engine poke. */
export const requestMidnightResetSyncState = async (ref: MidnightAccountRef) =>
  request('midnight.requestResetSyncState', ref);
/** Record the guest's active Midnight network with the host (ADR 41
 * lace.settings) so the Midnight dapp leg binds and serves that network. It
 * rides as the SDK network id STRING — the identity Midnight accounts and
 * engine sessions are keyed by (ADR 50). */
export const setActiveMidnightNetwork = async (networkId: string) =>
  request('settings.setActiveNetwork', {
    blockchain: 'Midnight',
    networkId,
  });
