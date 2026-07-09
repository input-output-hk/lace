import { HexBytes } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { PAUSE_NETWORK_POLLING_FEATURE_FLAG } from '../../src/const';
import {
  appLockActions as actions,
  appLockSelectors as selectors,
} from '../../src/index';
import { appLockReducers, initialState } from '../../src/store/slice';

import type { AppLockSliceState, LockState } from '../../src/store/slice';
import type { FeatureFlagKey } from '@lace-contract/feature';

const featuresWith = (flagKeys: FeatureFlagKey[]) => ({
  loaded: { modules: [], featureFlags: flagKeys.map(key => ({ key })) },
});

const featuresEmpty = featuresWith([]);
const featuresWithFlag = featuresWith([PAUSE_NETWORK_POLLING_FEATURE_FLAG]);

const stateFor = (lockState: LockState, features = featuresEmpty) => ({
  appLock: { lockState, encryptedSentinel: null } as AppLockSliceState,
  features,
});

const reducer = appLockReducers.appLock;

const preparingState: AppLockSliceState = {
  ...initialState,
  lockState: { status: 'Preparing' },
};

const awaitingSetupState: AppLockSliceState = {
  ...initialState,
  lockState: { status: 'AwaitingSetup' },
};

const lockedState: AppLockSliceState = {
  ...initialState,
  lockState: { status: 'Locked' },
};

const unlockingState: AppLockSliceState = {
  ...initialState,
  lockState: { status: 'Unlocking' },
};

const unlockedState: AppLockSliceState = {
  ...initialState,
  lockState: { status: 'Unlocked' },
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

    describe('isWalletActive', () => {
      const lockStates: LockState['status'][] = [
        'Preparing',
        'AwaitingSetup',
        'Locked',
        'Unlocking',
        'Unlocked',
      ];

      describe('when PAUSE_NETWORK_POLLING_WHILE_LOCKED is absent', () => {
        it.each(lockStates)('returns true for %s', status => {
          expect(
            selectors.appLock.isWalletActive(
              stateFor({ status } as LockState, featuresEmpty),
            ),
          ).toBe(true);
        });
      });

      describe('when PAUSE_NETWORK_POLLING_WHILE_LOCKED is present', () => {
        it.each(['AwaitingSetup', 'Unlocked'] as const)(
          'returns true for %s',
          status => {
            expect(
              selectors.appLock.isWalletActive(
                stateFor({ status } as LockState, featuresWithFlag),
              ),
            ).toBe(true);
          },
        );

        it.each(['Preparing', 'Locked', 'Unlocking'] as const)(
          'returns false for %s',
          status => {
            expect(
              selectors.appLock.isWalletActive(
                stateFor({ status } as LockState, featuresWithFlag),
              ),
            ).toBe(false);
          },
        );
      });

      it('flips from false to true when the flag is removed while locked', () => {
        const lockedWithFlag = stateFor(
          { status: 'Locked' } as LockState,
          featuresWithFlag,
        );
        const lockedWithoutFlag = stateFor(
          { status: 'Locked' } as LockState,
          featuresEmpty,
        );
        expect(selectors.appLock.isWalletActive(lockedWithFlag)).toBe(false);
        expect(selectors.appLock.isWalletActive(lockedWithoutFlag)).toBe(true);
      });
    });
  });
});
