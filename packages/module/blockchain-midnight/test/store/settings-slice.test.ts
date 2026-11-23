import { DEFAULT_NETWORKS_CONFIG } from '@lace-contract/midnight-context';
import { describe, expect, it } from 'vitest';

import { midnightActions, midnightReducers } from '../../src/store/slice';

import type { AccountId } from '@lace-contract/wallet-repo';
const actions = midnightActions.midnight;
const reducer = midnightReducers.midnightSettingsDrawer;
const request = {
  networkId: 'preview' as const,
  config: DEFAULT_NETWORKS_CONFIG.preview,
};
const saving = () =>
  reducer(
    reducer(undefined, actions.openSettings()),
    actions.confirmSettings(request),
  );
describe('Midnight settings confirmation', () => {
  it('retains the proposed settings until explicitly confirmed', () => {
    const pendingDust = { account: ['1'] };
    const confirmation = reducer(
      saving(),
      actions.dustResetConfirmationRequired(pendingDust),
    );
    expect(confirmation).toEqual({
      status: 'ConfirmDustReset',
      ...request,
      pendingDust,
    });
    expect(reducer(confirmation, actions.confirmDustReset())).toEqual({
      status: 'Saving',
      ...request,
      authorizedPendingDustNullifiers: pendingDust,
    });
    expect(reducer(confirmation, actions.cancelDustReset())).toEqual({
      status: 'Open',
    });
    expect(reducer(confirmation, actions.closeSettings())).toEqual({
      status: 'Closed',
    });
  });
  it('identifies an unreadable account and clears the diagnostic on the next attempt', () => {
    const failed = reducer(
      saving(),
      actions.snapshotUnreadable('affected' as AccountId),
    );
    expect(failed).toEqual({
      status: 'Open',
      hasSaveFailed: true,
      unreadableSnapshotAccountId: 'affected',
    });
    expect(reducer(failed, actions.confirmSettings(request))).toEqual({
      status: 'Saving',
      ...request,
    });
    expect(reducer(failed, actions.closeSettings())).toEqual({
      status: 'Closed',
    });
  });
  it('keeps the sheet open on failure and closes only on success', () => {
    expect(reducer(saving(), actions.savingFailed())).toEqual({
      status: 'Open',
      hasSaveFailed: true,
    });
    expect(reducer(saving(), actions.savingCompleted())).toEqual({
      status: 'Closed',
    });
    expect(reducer(undefined, actions.confirmDustReset())).toEqual({
      status: 'Closed',
    });
  });
});
