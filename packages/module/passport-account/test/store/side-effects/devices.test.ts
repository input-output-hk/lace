import {
  AccountContractMissingError,
  CeremonyCancelledError,
  LastDeviceError,
  NotAuthorisedError,
  RemovalTargetNotFoundError,
  passportActions,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { DeviceRoster } from '../../../src/flows/devices';
import type { FlowEvent } from '../../../src/store/dependencies';
import type {
  ActionCreators,
  PassportAccountInfo,
  PassportDevice,
  PassportFlow,
  Selectors,
} from '@lace-contract/passport';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const localCommitment = '11'.repeat(32);
const nextLocalCommitment = '1a'.repeat(32);
const targetCommitment = '22'.repeat(32);
const joiningCommitment = '33'.repeat(32);
const knownUseCounter = '2';
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
};
const localDevice: PassportDevice = {
  commitmentHex: localCommitment,
  isLocal: true,
};
const refreshedLocalDevice: PassportDevice = {
  commitmentHex: nextLocalCommitment,
  isLocal: true,
};
const targetDevice: PassportDevice = {
  commitmentHex: targetCommitment,
  isLocal: false,
};
const sampledDevices = [localDevice, targetDevice];
const enrolled: DeviceRoster = {
  devices: [
    refreshedLocalDevice,
    targetDevice,
    { commitmentHex: joiningCommitment, isLocal: false },
  ],
  localUseCounter: '3',
};
const revoked: DeviceRoster = {
  devices: [refreshedLocalDevice],
  localUseCounter: '3',
};

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<DeviceRoster>> = {
  f: { type: 'done', result: enrolled },
  v: { type: 'done', result: revoked },
};

/** The actions the gate and the flows publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  g: actions.passport.setDevices(enrolled.devices),
  h: actions.passport.setDevices(revoked.devices),
  i: actions.passport.setLocalUseCounter('3'),
  j: actions.passport.setFlow('ready'),
  n: actions.passport.setFlowError({
    code: 'no-account',
    message: 'No ready Passport account is available.',
  }),
};

/**
 * The state the device actions are dispatched over, as hot marbles that
 * emit ahead of the triggers: flow letters are r ready, e error, i idle,
 * c ceremony, d deploying; account letters are a the account, u none;
 * devices letters are t the two-device roster, l the local device alone.
 */
type StateMarbles = {
  flow?: string;
  account?: string;
  devices?: string;
};

type FlowTest = {
  addDevice?: string;
  removeDevice?: string;
  state?: StateMarbles;
  addFlows?: (
    cold: RunHelpers['cold'],
  ) => Observable<FlowEvent<DeviceRoster>>[];
  removeFlows?: (
    cold: RunHelpers['cold'],
  ) => Observable<FlowEvent<DeviceRoster>>[];
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    addDeviceFlow: ReturnType<typeof vi.fn>;
    removeDeviceFlow: ReturnType<typeof vi.fn>;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with the device flows replaced
 * by cold marbles; a flow given no marbles returns an observable which
 * never emits, so it stays silent past its own start, and the account
 * triggers never fire.
 */
const runFlowTest = ({
  addDevice = '',
  removeDevice = '',
  state = {},
  addFlows = () => [],
  removeFlows = () => [],
  assertion,
}: FlowTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const addDeviceFlow = vi.fn(
      (): Observable<FlowEvent<DeviceRoster>> => NEVER,
    );
    for (const flow$ of addFlows(cold))
      addDeviceFlow.mockReturnValueOnce(flow$);
    const removeDeviceFlow = vi.fn(
      (): Observable<FlowEvent<DeviceRoster>> => NEVER,
    );
    for (const flow$ of removeFlows(cold))
      removeDeviceFlow.mockReturnValueOnce(flow$);
    return {
      actionObservables: {
        passport: {
          addDevice$: hot(addDevice, {
            d: actions.passport.addDevice({ commitmentHex: joiningCommitment }),
          }),
          createAccount$: NEVER,
          removeDevice$: hot(removeDevice, {
            r: actions.passport.removeDevice({
              commitmentHex: targetCommitment,
            }),
          }),
          signIn$: NEVER,
        },
      },
      stateObservables: {
        passport: {
          selectAccount$: hot<PassportAccountInfo | undefined>(
            state.account ?? 'a',
            { a: account, u: undefined },
          ),
          selectDevices$: hot<PassportDevice[]>(state.devices ?? 't', {
            t: sampledDevices,
            l: [localDevice],
          }),
          selectFlow$: hot<PassportFlow>(state.flow ?? 'r', {
            r: 'ready',
            e: 'error',
            i: 'idle',
            c: 'ceremony',
            d: 'deploying',
          }),
          selectLocalUseCounter$: hot('k', { k: knownUseCounter }),
        },
      },
      dependencies: {
        actions,
        passportFlows: {
          addDevice: addDeviceFlow,
          removeDevice: removeDeviceFlow,
        },
      } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, addDeviceFlow, removeDeviceFlow });
      },
    };
  });
};

const typedFailures = [
  [new NotAuthorisedError('failed assert: unknown device entry')],
  [
    new AccountContractMissingError(
      `No live Account Custody Contract found at ${accountAddress}.`,
    ),
  ],
  [new CeremonyCancelledError()],
  [new LastDeviceError('failed assert: cannot remove last device')],
  [new RemovalTargetNotFoundError('failed assert: unknown device entry')],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runPassportFlow: addDevice', () => {
  it('enters the ceremony with the trigger, then publishes the roster and the counter in order', () => {
    runFlowTest({
      addDevice: '-d',
      addFlows: cold => [cold('--(f|)', events)],
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(gij)', emitted);
        helpers.flush();
        expect(addDeviceFlow).toHaveBeenCalledExactlyOnceWith(
          {
            commitmentHex: joiningCommitment,
            account,
            devices: sampledDevices,
            localUseCounter: knownUseCounter,
          },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('reports the ceremony in the frame of the trigger, ahead of a result the flow settles synchronously', () => {
    runFlowTest({
      addDevice: '-d',
      addFlows: cold => [cold('(f|)', events)],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-(agij)', emitted);
      },
    });
  });

  it.each(typedFailures)(
    'maps a typed flow failure to one setFlowError carrying its code: $code',
    failure => {
      runFlowTest({
        addDevice: '-d',
        addFlows: cold => [cold('-#', events, failure)],
        assertion: ({ sideEffect$, helpers }) => {
          helpers.expectObservable(sideEffect$).toBe('-ak', {
            ...emitted,
            k: actions.passport.setFlowError({
              code: failure.code,
              message: failure.message,
            }),
          });
        },
      });
    },
  );

  it('maps an untyped flow failure to setFlowError with the device-add-failed code', () => {
    runFlowTest({
      addDevice: '-d',
      addFlows: cold => [cold('-#', events, new Error('node unreachable'))],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'device-add-failed',
            message: 'node unreachable',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      addDevice: '-d',
      state: { account: 'u' },
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(addDeviceFlow).not.toHaveBeenCalled();
      },
    });
  });

  it.each([
    ['idle', 'i'],
    ['ceremony', 'c'],
    ['deploying', 'd'],
  ])(
    'refuses with no-account while the flow is %s, without calling the flow',
    (_flow, letter) => {
      runFlowTest({
        addDevice: '-d',
        state: { flow: letter },
        assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
          helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
          helpers.flush();
          expect(addDeviceFlow).not.toHaveBeenCalled();
        },
      });
    },
  );

  it('runs from the error flow a failed call left behind, with no sign-in in between', () => {
    runFlowTest({
      addDevice: '-d',
      state: { flow: 'e' },
      addFlows: cold => [cold('-(f|)', events)],
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(gij)', emitted);
        helpers.flush();
        expect(addDeviceFlow).toHaveBeenCalledOnce();
      },
    });
  });

  it('accepts a new addDevice after a failed flow', () => {
    runFlowTest({
      addDevice: '-d--d',
      addFlows: cold => [
        cold('-#', events, new Error('first lost')),
        cold('-(f|)', events),
      ],
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-ak-a(gij)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'device-add-failed',
            message: 'first lost',
          }),
        });
        helpers.flush();
        expect(addDeviceFlow).toHaveBeenCalledTimes(2);
      },
    });
  });

  it('samples the state at dispatch time, so a roster change while the call runs is not what the flow reads', () => {
    runFlowTest({
      addDevice: '-d',
      state: { devices: 't-l' },
      addFlows: cold => [cold('---(f|)', events)],
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a--(gij)', emitted);
        helpers.flush();
        expect(addDeviceFlow).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ devices: sampledDevices }),
          expect.anything(),
        );
      },
    });
  });

  it('drops an addDevice dispatched while one is in flight', () => {
    runFlowTest({
      addDevice: '-d-d',
      addFlows: cold => [cold('----(f|)', events)],
      assertion: ({ sideEffect$, helpers, addDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a---(gij)', emitted);
        helpers.flush();
        expect(addDeviceFlow).toHaveBeenCalledOnce();
      },
    });
  });
});

describe('runPassportFlow: removeDevice', () => {
  it('enters the ceremony with the trigger, then publishes the roster and the counter in order', () => {
    runFlowTest({
      removeDevice: '-r',
      removeFlows: cold => [cold('--(v|)', events)],
      assertion: ({ sideEffect$, helpers, removeDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hij)', emitted);
        helpers.flush();
        expect(removeDeviceFlow).toHaveBeenCalledExactlyOnceWith(
          {
            commitmentHex: targetCommitment,
            account,
            devices: sampledDevices,
            localUseCounter: knownUseCounter,
          },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it.each(typedFailures)(
    'maps a typed flow failure to one setFlowError carrying its code: $code',
    failure => {
      runFlowTest({
        removeDevice: '-r',
        removeFlows: cold => [cold('-#', events, failure)],
        assertion: ({ sideEffect$, helpers }) => {
          helpers.expectObservable(sideEffect$).toBe('-ak', {
            ...emitted,
            k: actions.passport.setFlowError({
              code: failure.code,
              message: failure.message,
            }),
          });
        },
      });
    },
  );

  it('maps an untyped flow failure to setFlowError with the device-remove-failed code', () => {
    runFlowTest({
      removeDevice: '-r',
      removeFlows: cold => [cold('-#', events, 'submission lost')],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'device-remove-failed',
            message: 'submission lost',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      removeDevice: '-r',
      state: { account: 'u' },
      assertion: ({ sideEffect$, helpers, removeDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(removeDeviceFlow).not.toHaveBeenCalled();
      },
    });
  });

  it('refuses with no-account while another flow is mid-operation, without calling the flow', () => {
    runFlowTest({
      removeDevice: '-r',
      state: { flow: 'd' },
      assertion: ({ sideEffect$, helpers, removeDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(removeDeviceFlow).not.toHaveBeenCalled();
      },
    });
  });

  it('runs from the error flow a failed call left behind', () => {
    runFlowTest({
      removeDevice: '-r',
      state: { flow: 'e' },
      removeFlows: cold => [cold('-(v|)', events)],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(hij)', emitted);
      },
    });
  });

  it('drops a removeDevice dispatched while one is in flight', () => {
    runFlowTest({
      removeDevice: '-r-r',
      removeFlows: cold => [cold('----(v|)', events)],
      assertion: ({ sideEffect$, helpers, removeDeviceFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a---(hij)', emitted);
        helpers.flush();
        expect(removeDeviceFlow).toHaveBeenCalledOnce();
      },
    });
  });
});
