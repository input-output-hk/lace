import { WalletId } from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  migrateV1Actions,
  migrateV1Reducers,
  migrateV1Selectors,
} from '../../src/store/slice';

import type { MigrateV1State } from '../../src/store/slice';

const actions = migrateV1Actions.migrateV1;
const selectors = migrateV1Selectors.migrateV1;
const reducer = migrateV1Reducers.migrateV1;

const walletA = WalletId('wallet-a');
const walletB = WalletId('wallet-b');
const walletC = WalletId('wallet-c');

describe('migrateV1 slice', () => {
  let state: MigrateV1State;

  beforeEach(() => {
    state = reducer(undefined, { type: '@@INIT' });
  });

  describe('initial state', () => {
    it('has isMigrated set to true', () => {
      expect(state.isMigrated).toBe(true);
    });

    it('has passwordMigration status as not-required', () => {
      expect(state.passwordMigration.status).toBe('not-required');
    });

    it('has empty walletsPendingActivation', () => {
      expect(state.passwordMigration.walletsPendingActivation).toEqual([]);
    });
  });

  describe('passwordMigrationDetected', () => {
    it('sets status to pending and populates walletsPendingActivation', () => {
      const newState = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );

      expect(newState.passwordMigration.status).toBe('pending');
      expect(newState.passwordMigration.walletsPendingActivation).toEqual([
        walletA,
        walletB,
      ]);
    });

    it('replaces existing walletsPendingActivation', () => {
      const intermediate = reducer(
        state,
        actions.passwordMigrationDetected([walletA]),
      );
      const newState = reducer(
        intermediate,
        actions.passwordMigrationDetected([walletB, walletC]),
      );

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([
        walletB,
        walletC,
      ]);
    });
  });

  describe('applicationPasswordSet', () => {
    it('transitions status from pending to activating', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      const activating = reducer(pending, actions.applicationPasswordSet());

      expect(activating.passwordMigration.status).toBe('activating');
      expect(activating.passwordMigration.walletsPendingActivation).toEqual([
        walletA,
        walletB,
      ]);
    });

    it('is a no-op when status is not pending', () => {
      const completed = reducer(state, actions.passwordMigrationCompleted());
      const next = reducer(completed, actions.applicationPasswordSet());
      expect(next.passwordMigration.status).toBe('completed');
    });
  });

  describe('walletActivated', () => {
    it('removes the wallet from walletsPendingActivation', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB, walletC]),
      );
      const newState = reducer(pending, actions.walletActivated(walletB));

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([
        walletA,
        walletC,
      ]);
      expect(newState.passwordMigration.status).toBe('pending');
    });

    it('sets status to completed when last wallet is activated', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA]),
      );
      const newState = reducer(pending, actions.walletActivated(walletA));

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([]);
      expect(newState.passwordMigration.status).toBe('completed');
    });

    it('is a no-op for non-existent walletId', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA]),
      );
      const newState = reducer(
        pending,
        actions.walletActivated(WalletId('non-existent')),
      );

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([
        walletA,
      ]);
      expect(newState.passwordMigration.status).toBe('pending');
    });

    it('auto-completes when activating the last of multiple wallets', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      const afterFirst = reducer(pending, actions.walletActivated(walletA));

      expect(afterFirst.passwordMigration.status).toBe('pending');
      expect(afterFirst.passwordMigration.walletsPendingActivation).toEqual([
        walletB,
      ]);

      const afterSecond = reducer(afterFirst, actions.walletActivated(walletB));

      expect(afterSecond.passwordMigration.status).toBe('completed');
      expect(afterSecond.passwordMigration.walletsPendingActivation).toEqual(
        [],
      );
    });
  });

  describe('walletDeleted', () => {
    it('removes the wallet from walletsPendingActivation', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      const newState = reducer(pending, actions.walletDeleted(walletA));

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([
        walletB,
      ]);
      expect(newState.passwordMigration.status).toBe('pending');
    });

    it('sets status to completed when last wallet is deleted', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA]),
      );
      const newState = reducer(pending, actions.walletDeleted(walletA));

      expect(newState.passwordMigration.walletsPendingActivation).toEqual([]);
      expect(newState.passwordMigration.status).toBe('completed');
    });

    it('auto-completes when deleting the last of multiple wallets', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      const afterFirst = reducer(pending, actions.walletDeleted(walletA));
      const afterSecond = reducer(afterFirst, actions.walletDeleted(walletB));

      expect(afterSecond.passwordMigration.status).toBe('completed');
      expect(afterSecond.passwordMigration.walletsPendingActivation).toEqual(
        [],
      );
    });
  });

  describe('passwordMigrationCompleted', () => {
    it('sets status to completed and clears walletsPendingActivation', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      const newState = reducer(pending, actions.passwordMigrationCompleted());

      expect(newState.passwordMigration.status).toBe('completed');
      expect(newState.passwordMigration.walletsPendingActivation).toEqual([]);
    });
  });

  describe('mixed activate and delete operations', () => {
    it('auto-completes when last wallet removed by mix of activate and delete', () => {
      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB, walletC]),
      );
      const afterActivate = reducer(pending, actions.walletActivated(walletA));
      const afterDelete = reducer(
        afterActivate,
        actions.walletDeleted(walletB),
      );

      expect(afterDelete.passwordMigration.status).toBe('pending');

      const afterLast = reducer(afterDelete, actions.walletActivated(walletC));

      expect(afterLast.passwordMigration.status).toBe('completed');
      expect(afterLast.passwordMigration.walletsPendingActivation).toEqual([]);
    });
  });

  describe('selectors', () => {
    it('selectPasswordMigrationStatus returns current status', () => {
      const rootState = { migrateV1: state };
      expect(selectors.selectPasswordMigrationStatus(rootState)).toBe(
        'not-required',
      );

      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA]),
      );
      expect(
        selectors.selectPasswordMigrationStatus({ migrateV1: pending }),
      ).toBe('pending');

      const completed = reducer(state, actions.passwordMigrationCompleted());
      expect(
        selectors.selectPasswordMigrationStatus({ migrateV1: completed }),
      ).toBe('completed');
    });

    it('selectWalletsPendingActivation returns pending wallet ids', () => {
      expect(
        selectors.selectWalletsPendingActivation({ migrateV1: state }),
      ).toEqual([]);

      const pending = reducer(
        state,
        actions.passwordMigrationDetected([walletA, walletB]),
      );
      expect(
        selectors.selectWalletsPendingActivation({ migrateV1: pending }),
      ).toEqual([walletA, walletB]);
    });
  });
});
