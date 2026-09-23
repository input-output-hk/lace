import {
  AccountExistsError,
  passportActions,
  SponsorExhaustedError,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { accManifest } from '../../../src/acc/manifest';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { CreatedAccount } from '../../../src/flows/create-account';
import type { FlowEvent } from '../../../src/store/dependencies';
import type { ActionCreators, Selectors } from '@lace-contract/passport';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const actions = { ...passportActions };

const accountAddress = 'ac'.repeat(32);
const commitmentHex = 'ab'.repeat(32);
const created: CreatedAccount = {
  account: {
    address: accountAddress,
    bindingVersion: accManifest.bindingVersion,
    status: 'ready',
  },
  devices: [{ commitmentHex, isLocal: true }],
  localUseCounter: '0',
};

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<CreatedAccount>> = {
  b: { type: 'progress', stage: 'deploying' },
  c: { type: 'progress', stage: 'proving' },
  d: { type: 'progress', stage: 'sponsoring' },
  e: { type: 'progress', stage: 'activating' },
  f: { type: 'done', result: created },
};

/** The actions the gate and the flow publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  b: actions.passport.setFlow('deploying'),
  c: actions.passport.setFlow('proving'),
  d: actions.passport.setFlow('sponsoring'),
  e: actions.passport.setFlow('activating'),
  g: actions.passport.setAccount(created.account),
  h: actions.passport.setDevices(created.devices),
  i: actions.passport.setLocalUseCounter('0'),
  j: actions.passport.setFlow('ready'),
};

const idleDeviceState = {
  selectAccount$: NEVER,
  selectDevices$: NEVER,
  selectFlow$: NEVER,
  selectLocalUseCounter$: NEVER,
};

type FlowTest = {
  createAccount?: string;
  flows: (cold: RunHelpers['cold']) => Observable<FlowEvent<CreatedAccount>>[];
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    createAccountFlow: ReturnType<typeof vi.fn>;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with the createAccount flow
 * replaced by cold marbles; the other triggers never fire, so their flows
 * are never reached.
 */
const runFlowTest = ({ createAccount = 'a', flows, assertion }: FlowTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const createAccountFlow = vi.fn();
    for (const flow$ of flows(cold))
      createAccountFlow.mockReturnValueOnce(flow$);
    return {
      actionObservables: {
        passport: {
          addDevice$: NEVER,
          createAccount$: hot(createAccount, {
            a: actions.passport.createAccount({ lockAccount: true }),
          }),
          removeDevice$: NEVER,
          signIn$: NEVER,
        },
      },
      stateObservables: { passport: idleDeviceState },
      dependencies: {
        actions,
        passportFlows: { createAccount: createAccountFlow },
      } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, createAccountFlow });
      },
    };
  });
};

describe('runPassportFlow: createAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enters the ceremony with the trigger, then publishes each stage and the ready account in order', () => {
    runFlowTest({
      flows: cold => [cold('-b-c-d-e-(f|)', events)],
      assertion: ({ sideEffect$, helpers, createAccountFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('ab-c-d-e-(ghij)', emitted);
        helpers.flush();
        expect(createAccountFlow).toHaveBeenCalledExactlyOnceWith(
          { lockAccount: true },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('publishes the ceremony before a stage the flow reports synchronously', () => {
    runFlowTest({
      flows: cold => [cold('(bf|)', events)],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('(abghij)', emitted);
      },
    });
  });

  it('maps a typed flow failure to one setFlowError carrying its code', () => {
    runFlowTest({
      flows: cold => [cold('-b-#', events, new SponsorExhaustedError())],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('ab-k', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'sponsor-exhausted',
            message: 'The fee sponsor could not cover this transaction.',
          }),
        });
      },
    });
  });

  it('maps an untyped flow failure to setFlowError with the fallback code', () => {
    runFlowTest({
      flows: cold => [cold('-b-e-#', events, new Error('ttl expired'))],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('ab-e-k', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-create-failed',
            message: 'ttl expired',
          }),
        });
      },
    });
  });

  it('settles in error within the ceremony frame when the flow refuses at once', () => {
    runFlowTest({
      flows: cold => [cold('#', events, new AccountExistsError())],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('(ak)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-exists',
            message:
              'A Passport account already exists on this device; sign in instead.',
          }),
        });
      },
    });
  });

  it('drops a createAccount dispatched while one is in flight', () => {
    runFlowTest({
      createAccount: 'a-a',
      flows: cold => [cold('----(f|)', events)],
      assertion: ({ sideEffect$, helpers, createAccountFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('a---(ghij)', emitted);
        helpers.flush();
        expect(createAccountFlow).toHaveBeenCalledOnce();
      },
    });
  });

  it('accepts a new createAccount after a failed flow', () => {
    runFlowTest({
      createAccount: 'a---a',
      flows: cold => [
        cold('-#', events, new Error('first attempt lost')),
        cold('-(f|)', events),
      ],
      assertion: ({ sideEffect$, helpers, createAccountFlow }) => {
        helpers.expectObservable(sideEffect$).toBe('ak--a(ghij)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'account-create-failed',
            message: 'first attempt lost',
          }),
        });
        helpers.flush();
        expect(createAccountFlow).toHaveBeenCalledTimes(2);
      },
    });
  });
});
