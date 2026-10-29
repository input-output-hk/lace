import {
  AuthorityRetiredError,
  OperationNotInstallableError,
  passportActions,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { InstalledOperations } from '../../../src/flows/install-operations';
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

const account: PassportAccountInfo = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: 'undeployed',
};
const sampledDevices: PassportDevice[] = [
  { commitmentHex: '11'.repeat(32), isLocal: true },
];
const operations = ['withdraw_unshielded_with_grant_k256'];

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<InstalledOperations>> = {
  f: { type: 'done', result: { operations, alreadyInstalled: [] } },
  s: { type: 'progress', stage: 'sponsoring' },
};

/** The actions the gate and the flow publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  s: actions.passport.setFlow('sponsoring'),
  j: actions.passport.setFlow('ready'),
  n: actions.passport.setFlowError({
    code: 'no-account',
    message: 'No ready Passport account is available.',
  }),
};

type FlowTest = {
  account?: string;
  flows?: (cold: RunHelpers['cold']) => Observable<FlowEvent<unknown>>[];
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    flow: ReturnType<typeof vi.fn>;
  }) => void;
};

/**
 * Drives the gate on the virtual scheduler with the install flow replaced
 * by cold marbles; the other triggers never fire. Account letters are a
 * the account, u none.
 */
const runFlowTest = ({
  account: accountMarble = 'a',
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
          installOperations$: hot('-t', {
            t: actions.passport.installOperations({ operations }),
          }),
          issueGrant$: NEVER,
          readShieldedHoldings$: NEVER,
          removeDevice$: NEVER,
          revokeAllGrants$: NEVER,
          revokeGrant$: NEVER,
          signIn$: NEVER,
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
          selectLocalUseCounter$: hot('k', { k: '2' }),
        },
      },
      dependencies: {
        actions,
        passportFlows: { installOperations: flow },
      } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, flow });
      },
    };
  });
};

describe('runPassportFlow: installOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the install for the account in state with the operations the action names, then publishes ready alone', () => {
    runFlowTest({
      flows: cold => [cold('-s-(f|)', events)],
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-as-j', emitted);
        helpers.flush();
        expect(flow).toHaveBeenCalledExactlyOnceWith(
          { account, operations },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it.each([
    [new OperationNotInstallableError('Already installed on the account.')],
    [new AuthorityRetiredError('The account is locked.')],
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

  it('maps an untyped flow failure to setFlowError with the operations-install-failed code', () => {
    runFlowTest({
      flows: cold => [cold('-#', events, new Error('indexer down'))],
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-ak', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'operations-install-failed',
            message: 'indexer down',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      account: 'u',
      assertion: ({ sideEffect$, helpers, flow }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flow).not.toHaveBeenCalled();
      },
    });
  });
});
