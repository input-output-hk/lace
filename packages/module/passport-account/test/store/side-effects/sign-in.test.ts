import {
  AccountContractMissingError,
  passportActions,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { RecognisedAccount } from '../../../src/flows/sign-in';
import type { FlowEvent } from '../../../src/store/dependencies';
import type { ActionCreators, Selectors } from '@lace-contract/passport';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const commitmentHex = 'ab'.repeat(32);
const recognised: RecognisedAccount = {
  account: {
    address: accountAddress,
    bindingVersion: '0.1.0-lace.1',
    status: 'ready',
  },
  devices: [{ commitmentHex, isLocal: true }],
  localUseCounter: '2',
};

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<RecognisedAccount>> = {
  f: { type: 'done', result: recognised },
};

/** The actions the gate and the flow publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  g: actions.passport.setAccount(recognised.account),
  h: actions.passport.setDevices(recognised.devices),
  i: actions.passport.setLocalUseCounter('2'),
  j: actions.passport.setFlow('ready'),
};

const idleDeviceState = {
  selectAccount$: NEVER,
  selectDevices$: NEVER,
  selectFlow$: NEVER,
  selectLocalUseCounter$: NEVER,
};

type FlowTest = {
  signIn?: string;
  flows: (
    cold: RunHelpers['cold'],
  ) => Observable<FlowEvent<RecognisedAccount>>[];
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    signInFlow: ReturnType<typeof vi.fn>;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with the signIn flow replaced by
 * cold marbles; the other triggers never fire, so their flows are never
 * reached.
 */
const runFlowTest = ({ signIn = 's', flows, assertion }: FlowTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const signInFlow = vi.fn();
    for (const flow$ of flows(cold)) signInFlow.mockReturnValueOnce(flow$);
    return {
      actionObservables: {
        passport: {
          addDevice$: NEVER,
          createAccount$: NEVER,
          removeDevice$: NEVER,
          signIn$: hot(signIn, { s: actions.passport.signIn() }),
        },
      },
      stateObservables: { passport: idleDeviceState },
      dependencies: {
        actions,
        passportFlows: { signIn: signInFlow },
      } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, signInFlow });
      },
    };
  });
};

describe('runPassportFlow: signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enters the ceremony with the trigger, then publishes the recognised account in order', () => {
    runFlowTest({
      flows: cold => [cold('--(f|)', events)],
      assertion: ({ sideEffect$, helpers, signInFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('a-(ghij)', emitted);
        helpers.flush();
        expect(signInFlow).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('publishes the ceremony before the account when the flow settles synchronously', () => {
    runFlowTest({
      flows: cold => [cold('(f|)', events)],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('(aghij)', emitted);
      },
    });
  });

  it('maps a typed flow failure to one setFlowError carrying its code', () => {
    runFlowTest({
      flows: cold => [
        cold(
          '-#',
          events,
          new AccountContractMissingError(
            `No live Account Custody Contract found at ${accountAddress}.`,
          ),
        ),
      ],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-contract-missing',
            message: `No live Account Custody Contract found at ${accountAddress}.`,
          }),
        });
      },
    });
  });

  it('maps an untyped flow failure to setFlowError with the fallback code', () => {
    runFlowTest({
      flows: cold => [cold('-#', events, new Error('indexer down'))],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-sign-in-failed',
            message: 'indexer down',
          }),
        });
      },
    });
  });

  it('drops a signIn dispatched while one is in flight', () => {
    runFlowTest({
      signIn: 's-s',
      flows: cold => [cold('----(f|)', events)],
      assertion: ({ sideEffect$, helpers, signInFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('a---(ghij)', emitted);
        helpers.flush();
        expect(signInFlow).toHaveBeenCalledOnce();
      },
    });
  });

  it('accepts a new signIn after a failed flow', () => {
    runFlowTest({
      signIn: 's---s',
      flows: cold => [
        cold('-#', events, new Error('first attempt lost')),
        cold('-(f|)', events),
      ],
      assertion: ({ sideEffect$, helpers, signInFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('ak--a(ghij)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-sign-in-failed',
            message: 'first attempt lost',
          }),
        });
        helpers.flush();
        expect(signInFlow).toHaveBeenCalledTimes(2);
      },
    });
  });
});
