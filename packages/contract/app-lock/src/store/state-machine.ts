import { createStateMachine } from '@lace-lib/util-store';

import type { EventOf, StateObject } from '@lace-lib/util-store';

export type LockState = StateObject<
  'AwaitingSetup' | 'Locked' | 'Preparing' | 'Unlocked' | 'Unlocking'
>;

export type LockStateMachineEvent = EventOf<typeof lockStateMachine>;

export const lockStateMachine = createStateMachine(
  'lockState',
  { status: 'Preparing' } as LockState,
  {
    _crossState: {
      reset: () => ({ status: 'Preparing' }),
    },
    Preparing: {
      noSetupRequired: () => ({ status: 'Locked' }),
      initialSetupRequired: () => ({ status: 'AwaitingSetup' }),
    },
    AwaitingSetup: {
      setupCompleted: () => ({ status: 'Unlocked' }),
    },
    Locked: {
      startUnlocking: () => ({ status: 'Unlocking' }),
    },
    Unlocking: {
      unlockingSucceeded: () => ({ status: 'Unlocked' }),
    },
    Unlocked: {
      locked: () => ({ status: 'Locked' }),
    },
  },
);
