import {
  AccountContractMissingError,
  CeremonyCancelledError,
  passportActions,
  TokenColor,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { ShieldedHoldings } from '../../../src/flows/holdings';
import type { FlowEvent } from '../../../src/store/dependencies';
import type {
  ActionCreators,
  PassportAccountInfo,
  PassportDevice,
  PassportFlow,
  Selectors,
  ShieldedHolding,
} from '@lace-contract/passport';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const knownUseCounter = '2';
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: 'undeployed',
};
const sampledDevices: PassportDevice[] = [
  { commitmentHex: '11'.repeat(32), isLocal: true },
];
const holdings: ShieldedHolding[] = [
  {
    color: TokenColor('00'.repeat(32)),
    value: '5',
    commitment: 'ab'.repeat(32),
    index: 7,
  },
];
const read: ShieldedHoldings = { holdings, skippedEntries: 2 };

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<ShieldedHoldings>> = {
  f: { type: 'done', result: read },
};

/** The actions the gate and the flow publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  h: actions.passport.setShieldedHoldings(holdings),
  j: actions.passport.setFlow('ready'),
  n: actions.passport.setFlowError({
    code: 'no-account',
    message: 'No ready Passport account is available.',
  }),
};

/**
 * The state the trigger is dispatched over, as hot marbles that emit ahead
 * of it: flow letters are r ready, e error, d deploying; account letters
 * are a the account, u none.
 */
type StateMarbles = {
  flow?: string;
  account?: string;
};

type FlowTest = {
  trigger?: string;
  state?: StateMarbles;
  flows?: (cold: RunHelpers['cold']) => Observable<FlowEvent<unknown>>[];
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    flow: ReturnType<typeof vi.fn>;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with the holdings flow replaced
 * by cold marbles; the other triggers never fire.
 */
const runFlowTest = ({
  trigger = '-t',
  state = {},
  flows = () => [],
  assertion,
}: FlowTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const flow = vi.fn((): Observable<FlowEvent<unknown>> => NEVER);
    for (const flow$ of flows(cold)) flow.mockReturnValueOnce(flow$);
    return {
      actionObservables: {
        passport: {
          addDevice$: NEVER,
          createAccount$: NEVER,
          issueGrant$: NEVER,
          installOperations$: NEVER,
          readShieldedHoldings$: hot(trigger, {
            t: actions.passport.readShieldedHoldings(),
          }),
          removeDevice$: NEVER,
          revokeAllGrants$: NEVER,
          revokeGrant$: NEVER,
          signIn$: NEVER,
        },
      },
      stateObservables: {
        passport: {
          selectAccount$: hot<PassportAccountInfo | undefined>(
            state.account ?? 'a',
            { a: account, u: undefined },
          ),
          selectDevices$: hot<PassportDevice[]>('t', { t: sampledDevices }),
          selectFlow$: hot<PassportFlow>(state.flow ?? 'r', {
            r: 'ready',
            e: 'error',
            d: 'deploying',
          }),
          selectLocalUseCounter$: hot('k', { k: knownUseCounter }),
        },
      },
      dependencies: {
        actions,
        passportFlows: { readShieldedHoldings: flow },
      } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, flow });
      },
    };
  });
};

describe('runPassportFlow: readShieldedHoldings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enters the ceremony with the trigger, then publishes the holdings and ready', () => {
    runFlowTest({
      flows: cold => [cold('--(f|)', events)],
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hj)', emitted);
        helpers.flush();
        expect(flow).toHaveBeenCalledExactlyOnceWith(
          {
            account,
            devices: sampledDevices,
            localUseCounter: knownUseCounter,
          },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('publishes an empty roster when the walk found nothing', () => {
    runFlowTest({
      flows: cold => [
        cold('-(f|)', {
          f: { type: 'done', result: { holdings: [], skippedEntries: 3 } },
        }),
      ],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(hj)', {
          ...emitted,
          h: actions.passport.setShieldedHoldings([]),
        });
      },
    });
  });

  it.each([
    [new CeremonyCancelledError()],
    [
      new AccountContractMissingError(
        `No live Account Custody Contract found at ${accountAddress}.`,
      ),
    ],
  ] as const)(
    'maps a typed flow failure to one setFlowError carrying its code: $code',
    failure => {
      runFlowTest({
        flows: cold => [cold('-#', events, failure)],
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

  it('maps an untyped flow failure to setFlowError with the holdings-read-failed code', () => {
    runFlowTest({
      flows: cold => [cold('-#', events, new Error('indexer down'))],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'holdings-read-failed',
            message: 'indexer down',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      state: { account: 'u' },
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flow).not.toHaveBeenCalled();
      },
    });
  });

  it('refuses with no-account while another flow is mid-operation, without calling the flow', () => {
    runFlowTest({
      state: { flow: 'd' },
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flow).not.toHaveBeenCalled();
      },
    });
  });

  it('runs from the error flow a failed call left behind', () => {
    runFlowTest({
      state: { flow: 'e' },
      flows: cold => [cold('-(f|)', events)],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(hj)', emitted);
      },
    });
  });

  it('drops a read dispatched while one is in flight, and accepts the next once it settles', () => {
    runFlowTest({
      trigger: '-t-t-------t',
      flows: cold => [cold('----(f|)', events), cold('(f|)', events)],
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-a---(hj)--(ahj)', emitted);
        helpers.flush();
        expect(flow).toHaveBeenCalledTimes(2);
      },
    });
  });
});
