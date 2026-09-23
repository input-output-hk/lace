import {
  DeviceCommitmentHex,
  UseCounter,
  passportActions,
} from '@lace-contract/passport';
import { passportReducers } from '@lace-contract/passport/src/store/slice';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { BehaviorSubject, map, NEVER, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { accManifest } from '../../../src/acc/manifest';
import { createDependencies } from '../../../src/store/dependencies';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { DeviceRoster } from '../../../src/flows/devices';
import type { FlowAccountState } from '../../../src/flows/types';
import type { FlowEvent } from '../../../src/store/dependencies';
import type {
  ActionCreators,
  PassportAccountInfo,
  PassportDevice,
  PassportFlow,
  PassportSliceState,
  Selectors,
} from '@lace-contract/passport';
import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';
import type { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import type { RunHelpers } from 'rxjs/testing';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  createMidnightProviders: vi.fn(),
  connectAccountHandle: vi.fn(),
  executeGatedCall: vi.fn(),
  deployAccount: vi.fn(),
  generateEncKeyPair: vi.fn(),
  resolveUseCounter: vi.fn(),
}));

vi.mock('../../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../../src/acc/acc-module', () => ({
  ledger: mocks.ledger,
}));
vi.mock('../../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));
vi.mock('../../../src/acc/gated-call', () => ({
  connectAccountHandle: mocks.connectAccountHandle,
  executeGatedCall: mocks.executeGatedCall,
}));
vi.mock('../../../src/acc/deploy', () => ({
  deployAccount: mocks.deployAccount,
}));
vi.mock('../../../src/acc/enc-keys', () => ({
  generateEncKeyPair: mocks.generateEncKeyPair,
}));
vi.mock('../../../src/acc/use-counter', () => ({
  resolveUseCounter: mocks.resolveUseCounter,
}));

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const localCommitment = '11'.repeat(32);
const targetCommitment = '22'.repeat(32);
const joiningCommitment = '33'.repeat(32);
const knownUseCounter = '2';
const advancedUseCounter = '3';
const failureMessage = 'node unreachable';
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  status: 'ready',
};
const localDevice: PassportDevice = {
  commitmentHex: localCommitment,
  isLocal: true,
};
const targetDevice: PassportDevice = {
  commitmentHex: targetCommitment,
  isLocal: false,
};
const record = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter: knownUseCounter,
};

type TriggerAction =
  | ReturnType<typeof actions.passport.addDevice>
  | ReturnType<typeof actions.passport.createAccount>
  | ReturnType<typeof actions.passport.removeDevice>
  | ReturnType<typeof actions.passport.signIn>;

/**
 * The state a flow starts from here: an account recognised on this
 * device, its roster and counter restored, and the flow settled.
 */
const settledStart = [
  actions.passport.setAccount(account),
  actions.passport.setDevices([localDevice, targetDevice]),
  actions.passport.setLocalUseCounter(knownUseCounter),
  actions.passport.setFlow('ready'),
].reduce(
  (state, action) => passportReducers.passport(state, action),
  passportReducers.passport(undefined, actions.passport.reset()),
);

const isSettling = (action: Action): boolean =>
  actions.passport.setFlowError.match(action) ||
  (actions.passport.setFlow.match(action) && action.payload === 'ready');

const createHarness = (withStoredRecord = true) => {
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(async () => ({ x: 1n, y: 2n })),
    deviceCommitment: vi.fn(async () => DeviceCommitmentHex(localCommitment)),
    authorise: vi.fn(),
  };
  const storage = {
    getValues: vi.fn(() => of(withStoredRecord ? [record] : [])),
    setValue: vi.fn(() => of(void 0)),
  };
  const queryContractState = vi.fn(async () => ({ data: 'charged-state' }));
  mocks.createIndexerClient.mockReturnValue({ queryContractState });

  const addDevice$ = new Subject<TriggerAction>();
  const createAccount$ = new Subject<TriggerAction>();
  const removeDevice$ = new Subject<TriggerAction>();
  const signIn$ = new Subject<TriggerAction>();
  const triggers: Record<string, Subject<TriggerAction>> = {
    [actions.passport.addDevice.type]: addDevice$,
    [actions.passport.createAccount.type]: createAccount$,
    [actions.passport.removeDevice.type]: removeDevice$,
    [actions.passport.signIn.type]: signIn$,
  };

  let state = settledStart;
  const state$ = new BehaviorSubject<PassportSliceState>(state);
  let settled = 0;
  const apply = (action: Action): void => {
    state = passportReducers.passport(state, action);
    if (isSettling(action)) settled += 1;
    state$.next(state);
  };

  const subscription = runPassportFlow(
    {
      passport: { addDevice$, createAccount$, removeDevice$, signIn$ },
    } as never,
    {
      passport: {
        selectAccount$: state$.pipe(map(({ account: stored }) => stored)),
        selectDevices$: state$.pipe(map(({ devices }) => devices)),
        selectFlow$: state$.pipe(map(({ flow }) => flow)),
        selectLocalUseCounter$: state$.pipe(
          map(({ localUseCounter }) => localUseCounter),
        ),
      },
    } as never,
    {
      actions,
      createKeyValueStorage: vi.fn(() => storage),
      ...createDependencies({
        authoriser,
        network,
        prover: { prove: vi.fn(), check: vi.fn() },
        sponsor: { balanceAndSign: vi.fn() },
      }),
    } as never,
  ).subscribe(apply);

  return {
    queryContractState,
    state: () => state,
    dispatch: (action: TriggerAction): void => {
      apply(action);
      triggers[action.type].next(action);
    },
    waitForSettled: async (count: number) =>
      vi.waitFor(() => {
        expect(settled).toBe(count);
      }),
    stop: () => {
      subscription.unsubscribe();
    },
  };
};

type Harness = ReturnType<typeof createHarness>;

/** A never-settling chain read, so the flow stays in flight. */
const hang = async <T>(): Promise<T> => new Promise<T>(() => {});

type FlowCase = {
  flow: string;
  code: string;
  /** createAccount refuses over a stored record, so its cases run without one. */
  withStoredRecord?: false;
  trigger: () => TriggerAction;
  failOnce: (harness: Harness) => void;
  /** Hangs the flow, returning the assertion that it got that far. */
  holdInFlight: (harness: Harness) => () => void;
};

const flowCases: FlowCase[] = [
  {
    flow: 'createAccount',
    code: 'account-create-failed',
    withStoredRecord: false,
    trigger: () => actions.passport.createAccount({ lockAccount: false }),
    failOnce: () => {
      mocks.deployAccount.mockRejectedValueOnce(new Error(failureMessage));
    },
    holdInFlight: () => {
      mocks.deployAccount.mockReturnValue(hang());
      return () => {
        expect(mocks.deployAccount).toHaveBeenCalled();
      };
    },
  },
  {
    flow: 'signIn',
    code: 'account-sign-in-failed',
    trigger: () => actions.passport.signIn(),
    failOnce: ({ queryContractState }) => {
      queryContractState.mockRejectedValueOnce(new Error(failureMessage));
    },
    holdInFlight: ({ queryContractState }) => {
      queryContractState.mockReturnValue(hang());
      return () => {
        expect(queryContractState).toHaveBeenCalled();
      };
    },
  },
  {
    flow: 'addDevice',
    code: 'device-add-failed',
    trigger: () =>
      actions.passport.addDevice({ commitmentHex: joiningCommitment }),
    failOnce: () => {
      mocks.executeGatedCall.mockRejectedValueOnce(new Error(failureMessage));
    },
    holdInFlight: () => {
      mocks.executeGatedCall.mockReturnValue(hang());
      return () => {
        expect(mocks.executeGatedCall).toHaveBeenCalled();
      };
    },
  },
  {
    flow: 'removeDevice',
    code: 'device-remove-failed',
    trigger: () =>
      actions.passport.removeDevice({ commitmentHex: targetCommitment }),
    failOnce: () => {
      mocks.executeGatedCall.mockRejectedValueOnce(new Error(failureMessage));
    },
    holdInFlight: () => {
      mocks.executeGatedCall.mockReturnValue(hang());
      return () => {
        expect(mocks.executeGatedCall).toHaveBeenCalled();
      };
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ledger.mockReturnValue({
    devices: [ByteArray.fromHex(HexBytes(localCommitment))],
  });
  mocks.resolveUseCounter.mockResolvedValue({
    useCounter: UseCounter(BigInt(knownUseCounter)),
    commitmentHex: localCommitment,
  });
  mocks.createMidnightProviders.mockResolvedValue({ tag: 'providers' });
  mocks.connectAccountHandle.mockResolvedValue({ callTx: {} });
  mocks.executeGatedCall.mockResolvedValue(
    UseCounter(BigInt(advancedUseCounter)),
  );
  mocks.generateEncKeyPair.mockReturnValue({
    publicKey: new Uint8Array(32).fill(1),
    secretKey: new Uint8Array(32).fill(2),
  });
  mocks.deployAccount.mockResolvedValue({
    address: accountAddress,
    salt: new Uint8Array(32),
    activate: vi.fn(async () => ({ txId: 'activation-tx' })),
  });
});

describe.each(flowCases)(
  'the $flow flow',
  ({ code, trigger, failOnce, holdInFlight, withStoredRecord }) => {
    it('leaves the flow ready with no error, from a settled start', async () => {
      const harness = createHarness(withStoredRecord ?? true);

      harness.dispatch(trigger());
      await harness.waitForSettled(1);

      expect(harness.state().flow).toBe('ready');
      expect(harness.state().flowError).toBeUndefined();
      harness.stop();
    });

    it('leaves the flow in error with the code its failure carries', async () => {
      const harness = createHarness(withStoredRecord ?? true);
      failOnce(harness);

      harness.dispatch(trigger());
      await harness.waitForSettled(1);

      expect(harness.state().flow).toBe('error');
      expect(harness.state().flowError).toEqual({
        code,
        message: failureMessage,
      });
      harness.stop();
    });

    it('leaves the flow ready with no error when retried after a failure', async () => {
      const harness = createHarness(withStoredRecord ?? true);
      failOnce(harness);

      harness.dispatch(trigger());
      await harness.waitForSettled(1);
      harness.dispatch(trigger());
      await harness.waitForSettled(2);

      expect(harness.state().flow).toBe('ready');
      expect(harness.state().flowError).toBeUndefined();
      harness.stop();
    });

    it('changes nothing when any trigger is dropped while it is in flight', async () => {
      const harness = createHarness(withStoredRecord ?? true);
      const inFlight = holdInFlight(harness);

      harness.dispatch(trigger());
      await vi.waitFor(inFlight);
      const held = harness.state();

      for (const dropped of flowCases) harness.dispatch(dropped.trigger());
      await Promise.resolve();

      expect(harness.state()).toBe(held);
      harness.stop();
    });
  },
);

type FlowName = 'addDevice' | 'createAccount' | 'removeDevice' | 'signIn';

const FLOW_NAMES: FlowName[] = [
  'addDevice',
  'createAccount',
  'removeDevice',
  'signIn',
];

/** The trigger each flow runs behind, as the letter t in its marble. */
const triggerOf = {
  addDevice: actions.passport.addDevice({ commitmentHex: joiningCommitment }),
  createAccount: actions.passport.createAccount({ lockAccount: false }),
  removeDevice: actions.passport.removeDevice({
    commitmentHex: targetCommitment,
  }),
  signIn: actions.passport.signIn(),
};

const sampledDevices = [localDevice, targetDevice];
const roster: DeviceRoster = {
  devices: sampledDevices,
  localUseCounter: advancedUseCounter,
};
const accountState: FlowAccountState = { account, ...roster };

/**
 * The flow events a cold marble may carry, keyed by their marble letter:
 * f settles an account flow, v a device flow, over the same roster so the
 * two settle into the same published actions.
 */
const events: Record<string, FlowEvent<unknown>> = {
  b: { type: 'progress', stage: 'deploying' },
  c: { type: 'progress', stage: 'proving' },
  d: { type: 'progress', stage: 'sponsoring' },
  e: { type: 'progress', stage: 'activating' },
  f: { type: 'done', result: accountState },
  v: { type: 'done', result: roster },
};

/** The actions the gate and the flows publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  b: actions.passport.setFlow('deploying'),
  c: actions.passport.setFlow('proving'),
  d: actions.passport.setFlow('sponsoring'),
  e: actions.passport.setFlow('activating'),
  g: actions.passport.setAccount(account),
  h: actions.passport.setDevices(sampledDevices),
  i: actions.passport.setLocalUseCounter(advancedUseCounter),
  j: actions.passport.setFlow('ready'),
  n: actions.passport.setFlowError({
    code: 'no-account',
    message: 'No ready Passport account is available.',
  }),
};

type FlowStream = ColdObservable<FlowEvent<unknown>>;
type FlowStreams = Partial<Record<FlowName, FlowStream[]>>;

type GateTest = {
  /** Trigger marbles per flow, t being that flow's trigger; a flow left out never triggers. */
  triggers: Partial<Record<FlowName, string>>;
  /** Event streams each mocked flow returns in call order; a flow left out never emits. */
  flows?: Partial<Record<FlowName, (cold: RunHelpers['cold']) => FlowStream[]>>;
  /** Marble of the account the device calls sample: a the account, u none. */
  account?: string;
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    flowMocks: Record<FlowName, ReturnType<typeof vi.fn>>;
    flowStreams: FlowStreams;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with all four flows replaced by
 * cold marbles and the device state settled at frame 0, so a device
 * trigger from frame 1 on samples a ready account over the two-device
 * roster.
 */
const runGateTest = ({
  triggers,
  flows = {},
  account: accountMarble = 'a',
  assertion,
}: GateTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const flowMocks = Object.fromEntries(
      FLOW_NAMES.map(flow => [
        flow,
        vi.fn((): Observable<FlowEvent<unknown>> => NEVER),
      ]),
    ) as Record<FlowName, ReturnType<typeof vi.fn>>;
    const flowStreams: FlowStreams = {};
    for (const flow of FLOW_NAMES) {
      const streams = flows[flow]?.(cold) ?? [];
      flowStreams[flow] = streams;
      for (const stream$ of streams)
        flowMocks[flow].mockReturnValueOnce(stream$);
    }
    const trigger$ = <Flow extends FlowName>(flow: Flow) => {
      const marble = triggers[flow];
      return marble === undefined ? NEVER : hot(marble, { t: triggerOf[flow] });
    };
    return {
      actionObservables: {
        passport: {
          addDevice$: trigger$('addDevice'),
          createAccount$: trigger$('createAccount'),
          removeDevice$: trigger$('removeDevice'),
          signIn$: trigger$('signIn'),
        },
      },
      stateObservables: {
        passport: {
          selectAccount$: hot<PassportAccountInfo | undefined>(accountMarble, {
            a: account,
            u: undefined,
          }),
          selectDevices$: hot<PassportDevice[]>('t', { t: sampledDevices }),
          selectFlow$: hot<PassportFlow>('r', { r: 'ready' }),
          selectLocalUseCounter$: hot('k', { k: knownUseCounter }),
        },
      },
      dependencies: { actions, passportFlows: flowMocks } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, flowMocks, flowStreams });
      },
    };
  });
};

/**
 * One flow in flight from frame 1 to frame 6, the other three dispatched
 * meanwhile, then the next flow accepted at frame 12. An account flow
 * settles as (ghij) over frames 6 to 11; a device flow as (hij) over
 * frames 6 to 10.
 */
const runningFlows: {
  running: FlowName;
  next: FlowName;
  triggers: Record<FlowName, string>;
  flow: string;
  expected: string;
}[] = [
  {
    running: 'createAccount',
    next: 'signIn',
    triggers: {
      createAccount: '-t',
      signIn: '--t---------t',
      addDevice: '---t',
      removeDevice: '----t',
    },
    flow: '-----(f|)',
    expected: '-a----(ghij)a',
  },
  {
    running: 'signIn',
    next: 'addDevice',
    triggers: {
      signIn: '-t',
      addDevice: '--t---------t',
      removeDevice: '---t',
      createAccount: '----t',
    },
    flow: '-----(f|)',
    expected: '-a----(ghij)a',
  },
  {
    running: 'addDevice',
    next: 'removeDevice',
    triggers: {
      addDevice: '-t',
      removeDevice: '--t---------t',
      createAccount: '---t',
      signIn: '----t',
    },
    flow: '-----(v|)',
    expected: '-a----(hij)-a',
  },
  {
    running: 'removeDevice',
    next: 'createAccount',
    triggers: {
      removeDevice: '-t',
      createAccount: '--t---------t',
      signIn: '---t',
      addDevice: '----t',
    },
    flow: '-----(v|)',
    expected: '-a----(hij)-a',
  },
];

describe('runPassportFlow: the gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(runningFlows)(
    'emits nothing for the other flows dispatched while $running is in flight, then accepts $next once it settles',
    ({ running, next, triggers, flow, expected }) => {
      runGateTest({
        triggers,
        flows: {
          [running]: (cold: RunHelpers['cold']) => [cold(flow, events)],
        },
        assertion: ({ sideEffect$, helpers, flowMocks }) => {
          helpers.expectObservable(sideEffect$).toBe(expected, emitted);
          helpers.flush();
          expect(flowMocks[running]).toHaveBeenCalledOnce();
          expect(flowMocks[next]).toHaveBeenCalledOnce();
          for (const dropped of FLOW_NAMES.filter(
            name => name !== running && name !== next,
          )) {
            expect(flowMocks[dropped]).not.toHaveBeenCalled();
          }
        },
      });
    },
  );

  it('re-enters the ceremony in the frame of each accepted trigger and maps every stage once, in order, still dropping a trigger dispatched between stages', () => {
    runGateTest({
      triggers: {
        signIn: '-t',
        createAccount: '---------t',
        removeDevice: '-------------t',
      },
      flows: {
        signIn: cold => [cold('--(f|)', events)],
        createAccount: cold => [cold('-b-c-d-e-(f|)', events)],
      },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers
          .expectObservable(sideEffect$)
          .toBe('-a-(ghij)ab-c-d-e-(ghij)', emitted);
        helpers.flush();
        expect(flowMocks.removeDevice).not.toHaveBeenCalled();
      },
    });
  });

  it('settles a failed flow with one setFlowError and accepts the next trigger on the following frame, having dropped one in flight', () => {
    runGateTest({
      triggers: { createAccount: '-t', signIn: '--t', removeDevice: '----t' },
      flows: {
        createAccount: cold => [cold('--#', events, new Error('deploy lost'))],
        removeDevice: cold => [cold('(v|)', events)],
      },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-k(ahij)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-create-failed',
            message: 'deploy lost',
          }),
        });
        helpers.flush();
        expect(flowMocks.signIn).not.toHaveBeenCalled();
        expect(flowMocks.removeDevice).toHaveBeenCalledOnce();
      },
    });
  });

  it('refuses a device call over no account without ever subscribing its flow', () => {
    runGateTest({
      triggers: { addDevice: '-t' },
      flows: { addDevice: cold => [cold('(v|)', events)] },
      account: 'u',
      assertion: ({ sideEffect$, helpers, flowMocks, flowStreams }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers
          .expectSubscriptions(flowStreams.addDevice?.[0]?.subscriptions ?? [])
          .toBe([]);
        helpers.flush();
        expect(flowMocks.addDevice).not.toHaveBeenCalled();
      },
    });
  });

  it('drops a device call dispatched while a flow is in flight ahead of its guard, so no refusal is reported either', () => {
    runGateTest({
      triggers: { signIn: '-t', addDevice: '--t' },
      flows: { signIn: cold => [cold('---(f|)', events)] },
      account: 'u',
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a--(ghij)', emitted);
        helpers.flush();
        expect(flowMocks.addDevice).not.toHaveBeenCalled();
      },
    });
  });

  it('delivers nothing past an unsubscribe mid-flow and releases the running flow with it', () => {
    runGateTest({
      triggers: { createAccount: '-t', signIn: '---t' },
      flows: { createAccount: cold => [cold('-b---c-(f|)', events)] },
      assertion: ({ sideEffect$, helpers, flowMocks, flowStreams }) => {
        helpers.expectObservable(sideEffect$, '^----!').toBe('-ab', emitted);
        helpers
          .expectSubscriptions(
            flowStreams.createAccount?.[0]?.subscriptions ?? [],
          )
          .toBe('-^---!');
        helpers.flush();
        expect(flowMocks.signIn).not.toHaveBeenCalled();
      },
    });
  });
});
