import { describe, expect, it } from 'vitest';

import {
  nightDesignationIndexActions,
  nightDesignationIndexReducers,
  nightDesignationIndexSelectors,
} from '../../../src/store/night-designation-index';

import type {
  NightDesignationIndexSliceState,
  NightDesignationSnapshot,
} from '../../../src/store/night-designation-index';
import type { AccountId } from '@lace-contract/wallet-repo';

const accountId = 'test-account' as AccountId;
const otherAccountId = 'other-account' as AccountId;

const snapshot: NightDesignationSnapshot = {
  scriptStakeCredentialRegistered: true,
  registration: {
    txId: 'ab'.repeat(32),
    outputIndex: 1,
    dustPubkeyHex: 'ef'.repeat(32),
  },
};

const reducer = nightDesignationIndexReducers.nightDesignationIndex;
const {
  refreshCompleted,
  refreshFailed,
  refreshRequested,
  settlingEnded,
  settlingStarted,
} = nightDesignationIndexActions.nightDesignationIndex;

const settlingTxId = '12'.repeat(32);

describe('nightDesignationIndex slice', () => {
  it('starts with no accounts indexed', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({ byAccount: {} });
  });

  it('marks the account as refreshing on refreshRequested', () => {
    const state = reducer(undefined, refreshRequested({ accountId }));

    expect(state.byAccount[accountId]).toEqual({
      refreshing: true,
      failed: false,
    });
  });

  it('stores the snapshot and clears both flags on refreshCompleted', () => {
    const state = reducer(
      reducer(undefined, refreshRequested({ accountId })),
      refreshCompleted({ accountId, snapshot }),
    );

    expect(state.byAccount[accountId]).toEqual({
      snapshot,
      refreshing: false,
      failed: false,
    });
  });

  it('keeps the previous snapshot visible while a re-read is in flight', () => {
    const state = reducer(
      reducer(undefined, refreshCompleted({ accountId, snapshot })),
      refreshRequested({ accountId }),
    );

    expect(state.byAccount[accountId]).toEqual({
      snapshot,
      refreshing: true,
      failed: false,
    });
  });

  it('keeps the previous snapshot and flags the entry on refreshFailed', () => {
    const state = reducer(
      reducer(undefined, refreshCompleted({ accountId, snapshot })),
      refreshFailed({ accountId }),
    );

    expect(state.byAccount[accountId]).toEqual({
      snapshot,
      refreshing: false,
      failed: true,
    });
  });

  it('clears a previous failure when the next read succeeds', () => {
    const state = reducer(
      reducer(undefined, refreshFailed({ accountId })),
      refreshCompleted({ accountId, snapshot }),
    );

    expect(state.byAccount[accountId]).toEqual({
      snapshot,
      refreshing: false,
      failed: false,
    });
  });

  it('indexes an account with no designation without a registration', () => {
    const state = reducer(
      undefined,
      refreshCompleted({
        accountId,
        snapshot: { scriptStakeCredentialRegistered: false },
      }),
    );

    expect(state.byAccount[accountId]?.snapshot).toEqual({
      scriptStakeCredentialRegistered: false,
    });
  });

  it('keys entries per account', () => {
    const state = reducer(
      reducer(undefined, refreshCompleted({ accountId, snapshot })),
      refreshFailed({ accountId: otherAccountId }),
    );

    expect(state.byAccount[accountId]?.snapshot).toEqual(snapshot);
    expect(state.byAccount[otherAccountId]).toEqual({
      refreshing: false,
      failed: true,
    });
  });

  describe('a submitted designation the chain has not shown yet', () => {
    it('marks the entry settling on settlingStarted, keeping the last read', () => {
      const state = reducer(
        reducer(undefined, refreshCompleted({ accountId, snapshot })),
        settlingStarted({ accountId, txId: settlingTxId }),
      );

      expect(state.byAccount[accountId]).toEqual({
        snapshot,
        refreshing: false,
        failed: false,
        settling: { txId: settlingTxId },
      });
    });

    it('marks an account with no entry yet settling', () => {
      const state = reducer(
        undefined,
        settlingStarted({ accountId, txId: settlingTxId }),
      );

      expect(state.byAccount[accountId]).toEqual({
        refreshing: false,
        failed: false,
        settling: { txId: settlingTxId },
      });
    });

    it('stays settling through a completed read', () => {
      const state = reducer(
        reducer(undefined, settlingStarted({ accountId, txId: settlingTxId })),
        refreshCompleted({
          accountId,
          snapshot: { scriptStakeCredentialRegistered: true },
        }),
      );

      expect(state.byAccount[accountId]).toEqual({
        snapshot: { scriptStakeCredentialRegistered: true },
        refreshing: false,
        failed: false,
        settling: { txId: settlingTxId },
      });
    });

    it('stays settling through a requested read', () => {
      const state = reducer(
        reducer(undefined, settlingStarted({ accountId, txId: settlingTxId })),
        refreshRequested({ accountId }),
      );

      expect(state.byAccount[accountId]?.settling).toEqual({
        txId: settlingTxId,
      });
    });

    it('stays settling through a failed read', () => {
      const state = reducer(
        reducer(undefined, settlingStarted({ accountId, txId: settlingTxId })),
        refreshFailed({ accountId }),
      );

      expect(state.byAccount[accountId]?.settling).toEqual({
        txId: settlingTxId,
      });
    });

    it('replaces the transaction it waits on when a second one is submitted', () => {
      const state = reducer(
        reducer(undefined, settlingStarted({ accountId, txId: settlingTxId })),
        settlingStarted({ accountId, txId: '34'.repeat(32) }),
      );

      expect(state.byAccount[accountId]?.settling).toEqual({
        txId: '34'.repeat(32),
      });
    });

    it('clears the flag on settlingEnded', () => {
      const state = reducer(
        reducer(
          reducer(undefined, refreshCompleted({ accountId, snapshot })),
          settlingStarted({ accountId, txId: settlingTxId }),
        ),
        settlingEnded({ accountId }),
      );

      expect(state.byAccount[accountId]).toEqual({
        snapshot,
        refreshing: false,
        failed: false,
      });
    });

    it('leaves an account it never indexed untouched on settlingEnded', () => {
      const state = reducer(undefined, settlingEnded({ accountId }));

      expect(state.byAccount[accountId]).toBeUndefined();
    });

    it('settles one account without settling another', () => {
      const state = reducer(
        reducer(undefined, settlingStarted({ accountId, txId: settlingTxId })),
        refreshCompleted({ accountId: otherAccountId, snapshot }),
      );

      expect(state.byAccount[accountId]?.settling).toEqual({
        txId: settlingTxId,
      });
      expect(state.byAccount[otherAccountId]?.settling).toBeUndefined();
    });
  });

  it('exposes the index through selectIndexByAccount', () => {
    const byAccount = {
      [accountId]: { snapshot, refreshing: false, failed: false },
    };

    expect(
      nightDesignationIndexSelectors.nightDesignationIndex.selectIndexByAccount(
        { nightDesignationIndex: { byAccount } } as {
          nightDesignationIndex: NightDesignationIndexSliceState;
        },
      ),
    ).toBe(byAccount);
  });
});
