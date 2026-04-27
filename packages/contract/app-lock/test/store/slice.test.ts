import { HexBytes } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  appLockActions as actions,
  appLockSelectors as selectors,
} from '../../src/index';
import { appLockReducers } from '../../src/store/slice';

import type { AppLockSliceState } from '../../src/store/slice';

const reducer = appLockReducers.appLock;

const preparingState: AppLockSliceState = {
  lockState: { status: 'Preparing' },
  encryptedSentinel: null,
};

const awaitingSetupState: AppLockSliceState = {
  lockState: { status: 'AwaitingSetup' },
  encryptedSentinel: null,
};

const lockedState: AppLockSliceState = {
  lockState: { status: 'Locked' },
  encryptedSentinel: null,
};

const unlockingState: AppLockSliceState = {
  lockState: { status: 'Unlocking' },
  encryptedSentinel: null,
};

const unlockedState: AppLockSliceState = {
  lockState: { status: 'Unlocked' },
  encryptedSentinel: null,
};

describe('appLock slice', () => {
  describe('reducers', () => {
    describe('reset', () => {
      it.each([awaitingSetupState, lockedState, unlockingState, unlockedState])(
        'transitions from $lockState.status to Preparing',
        sourceState => {
          const state = reducer(sourceState, actions.appLock.reset());
          expect(state.lockState.status).toBe('Preparing');
        },
      );

      it('clears encryptedSentinel on reset', () => {
        const stateWithSentinel = {
          ...unlockedState,
          encryptedSentinel: HexBytes('test-sentinel'),
        };
        const state = reducer(stateWithSentinel, actions.appLock.reset());
        expect(state.lockState.status).toBe('Preparing');
        expect(state.encryptedSentinel).toBeNull();
      });
    });

    describe('noSetupRequired', () => {
      it('transitions from preparing to locked', () => {
        const state = reducer(
          preparingState,
          actions.appLock.noSetupRequired(),
        );
        expect(state.lockState.status).toBe('Locked');
      });
    });

    describe('initialSetupRequired', () => {
      it('transitions from preparing to awaiting setup', () => {
        const state = reducer(
          preparingState,
          actions.appLock.initialSetupRequired(),
        );
        expect(state.lockState.status).toBe('AwaitingSetup');
      });
    });

    describe('setupCompleted', () => {
      it('transitions from awaiting setup to unlocked', () => {
        const state = reducer(
          awaitingSetupState,
          actions.appLock.setupCompleted(),
        );
        expect(state.lockState.status).toBe('Unlocked');
      });
    });

    describe('startUnlocking', () => {
      it('transitions from locked to unlocking', () => {
        const state = reducer(lockedState, actions.appLock.startUnlocking());
        expect(state.lockState.status).toBe('Unlocking');
      });
    });

    describe('unlockingSucceeded', () => {
      it('transitions from unlocking to unlocked', () => {
        const state = reducer(
          unlockingState,
          actions.appLock.unlockingSucceeded(),
        );
        expect(state.lockState.status).toBe('Unlocked');
      });
    });

    describe('locked', () => {
      it('transitions from unlocked to locked', () => {
        const state = reducer(unlockedState, actions.appLock.locked());
        expect(state.lockState.status).toBe('Locked');
      });
    });

    describe('setEncryptedSentinel', () => {
      it('sets the encrypted sentinel value', () => {
        const state = reducer(
          lockedState,
          actions.appLock.setEncryptedSentinel(HexBytes('encrypted-value')),
        );
        expect(state.encryptedSentinel).toBe(HexBytes('encrypted-value'));
        expect(state.lockState).toEqual(lockedState.lockState);
      });
    });
  });

  describe('selectors', () => {
    describe('selectLockState', () => {
      it('returns the current lockState', () => {
        expect(
          selectors.appLock.selectLockState({ appLock: lockedState }),
        ).toEqual({
          status: 'Locked',
        });
      });
    });

    describe('isAwaitingSetup', () => {
      it('returns true when awaiting setup', () => {
        expect(
          selectors.appLock.isAwaitingSetup({ appLock: awaitingSetupState }),
        ).toBe(true);
      });

      it('returns false when locked', () => {
        expect(
          selectors.appLock.isAwaitingSetup({ appLock: lockedState }),
        ).toBe(false);
      });
    });

    describe('isUnlocked', () => {
      it('returns true when unlocked', () => {
        expect(selectors.appLock.isUnlocked({ appLock: unlockedState })).toBe(
          true,
        );
      });

      it('returns false when locked', () => {
        expect(selectors.appLock.isUnlocked({ appLock: lockedState })).toBe(
          false,
        );
      });
    });

    describe('selectEncryptedSentinel', () => {
      it('returns null when not set', () => {
        expect(
          selectors.appLock.selectEncryptedSentinel({ appLock: lockedState }),
        ).toBeNull();
      });

      it('returns the sentinel value when set', () => {
        expect(
          selectors.appLock.selectEncryptedSentinel({
            appLock: {
              ...lockedState,
              encryptedSentinel: HexBytes('test-sentinel'),
            },
          }),
        ).toBe(HexBytes('test-sentinel'));
      });
    });
  });
});
