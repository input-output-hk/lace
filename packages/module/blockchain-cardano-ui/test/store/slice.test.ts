import { cardanoContextActions } from '@lace-contract/cardano-context';
import { syncActions } from '@lace-contract/sync';
import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { actions, reducers, selectors } from '../../src/store/slice';

const accountId = AccountId('reset-target');
const otherId = AccountId('other-account');
const error = 'sync.error.address-discovery-failed';
const result = cardanoContextActions.cardanoContext.setWalletSyncResetResult;
const reduce = reducers.cardanoSyncUi;
const failed = () =>
  reduce(
    reduce(undefined, result({ accountId, status: 'Failed', error })),
    result({ accountId: otherId, status: 'Failed', error }),
  );

describe('reset failure presentation', () => {
  it('starts empty and exposes failure details without owning a sync round', () => {
    expect(reduce(undefined, { type: 'init' })).toEqual({ failedResets: {} });
    const state = failed();
    expect(
      selectors.cardanoSyncUi.selectFailedResets({ cardanoSyncUi: state }),
    ).toBe(state.failedResets);
    expect(state.failedResets).toEqual({
      [accountId]: error,
      [otherId]: error,
    });
  });

  it('uses the generic error if a result has no reason', () => {
    expect(
      reduce(undefined, result({ accountId, status: 'Failed' })).failedResets[
        accountId
      ],
    ).toBe('v2.account-settings.hd-wallet-sync.toast.error');
  });

  it.each([
    actions.cardanoSyncUi.dismissResetFailure({ accountId }),
    cardanoContextActions.cardanoContext.resetWalletSyncState({ accountId }),
    result({ accountId, status: 'Completed' }),
    syncActions.sync.clearPendingSyncsForAccounts({ accountIds: [accountId] }),
    walletsActions.wallets.removeAccount(WalletId('wallet'), accountId),
    walletsActions.wallets.removeWallet(WalletId('wallet'), [accountId]),
  ])('clears only the selected account on $type', action => {
    expect(reduce(failed(), action).failedResets).toEqual({ [otherId]: error });
  });

  it('retains failure through rejected requests and ordinary sync completion', () => {
    const state = failed();
    const requested = reduce(
      state,
      cardanoContextActions.cardanoContext.requestWalletSyncReset({
        accountId,
      }),
    );
    const syncing = reduce(
      requested,
      syncActions.sync.addSyncOperation({
        accountId,
        operation: {
          operationId: 'ordinary-poll',
          status: 'InProgress',
          type: 'Indeterminate',
          startedAt: Timestamp(0),
          description: 'sync.operation.address-discovery',
        },
      }),
    );
    expect(
      reduce(
        syncing,
        syncActions.sync.completeSyncOperation({
          accountId,
          operationId: 'ordinary-poll',
        }),
      ),
    ).toBe(state);
  });

  it('shows another failure after an accepted retry, then clears it on success', () => {
    const retrying = reduce(
      failed(),
      cardanoContextActions.cardanoContext.resetWalletSyncState({ accountId }),
    );
    const retried = reduce(
      retrying,
      result({ accountId, status: 'Failed', error }),
    );
    expect(retried.failedResets[accountId]).toBe(error);
    expect(
      reduce(retried, result({ accountId, status: 'Completed' })).failedResets,
    ).toEqual({ [otherId]: error });
  });
});
