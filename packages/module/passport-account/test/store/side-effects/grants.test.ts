import {
  AccountContractMissingError,
  CeremonyCancelledError,
  GrantId,
  GrantLimitReachedError,
  GrantNotFoundError,
  GrantOriginMissingError,
  GrantRevokedError,
  GrantRosterUnsettledError,
  GrantScopeInvalidError,
  GrantSlot,
  NotAuthorisedError,
  passportActions,
  TokenColor,
} from '@lace-contract/passport';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type { GrantRoster, IssuedGrant } from '../../../src/flows/grants';
import type { FlowEvent } from '../../../src/store/dependencies';
import type {
  ActionCreators,
  GrantRecord,
  GrantScopeInput,
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
const remoteCommitment = '22'.repeat(32);
const knownUseCounter = '2';
const grantId = GrantId('ab'.repeat(32));
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: 'undeployed',
};
const localDevice: PassportDevice = {
  commitmentHex: localCommitment,
  isLocal: true,
};
const refreshedLocalDevice: PassportDevice = {
  commitmentHex: nextLocalCommitment,
  isLocal: true,
};
const remoteDevice: PassportDevice = {
  commitmentHex: remoteCommitment,
  isLocal: false,
};
const sampledDevices = [localDevice, remoteDevice];
const refreshedDevices = [refreshedLocalDevice, remoteDevice];
const scope: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: 'cd'.repeat(32) },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};
const grantRecord = (active: boolean): GrantRecord => ({
  id: grantId,
  slot: GrantSlot(0),
  active,
  epoch: 0,
  generation: 0,
  issuedAt: 1,
  scope: {
    operations: ['withdraw-unshielded'],
    read: false,
    objectCommit: '00'.repeat(32),
    perCallCap: '300',
    cap: '450',
    expiresAt: null,
    rpCommit: '00'.repeat(32),
    readPkHash: '00'.repeat(32),
    window: null,
    callerCommit: '00'.repeat(32),
  },
  spentWindow: { start: 0, spent: '0' },
});
const issued: IssuedGrant = {
  grantId,
  grants: [grantRecord(true)],
  devices: refreshedDevices,
  localUseCounter: '3',
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
};
const revoked: GrantRoster = {
  grants: [grantRecord(false)],
  devices: refreshedDevices,
  localUseCounter: '3',
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
};
const rotated: GrantRoster = { ...revoked, encKey: '0c'.repeat(32) };
const rotatedDropping: GrantRoster = {
  ...rotated,
  droppedDevices: ['dd'.repeat(32)],
};
const unsealed: IssuedGrant = { ...issued, unsealedGrantIds: [grantId] };
const revocationPending: GrantRoster = {
  ...rotated,
  revocationPendingGrantIds: [grantId],
};
const cleared: GrantRoster = {
  grants: [],
  devices: refreshedDevices,
  localUseCounter: '3',
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
};

/** The flow events a cold marble may carry, keyed by their marble letter. */
const events: Record<string, FlowEvent<GrantRoster | IssuedGrant>> = {
  f: { type: 'done', result: issued },
  y: { type: 'done', result: unsealed },
  d: { type: 'done', result: revocationPending },
  v: { type: 'done', result: revoked },
  w: { type: 'done', result: rotated },
  k: { type: 'done', result: rotatedDropping },
  x: { type: 'done', result: cleared },
  p: { type: 'progress', stage: 'proving' },
  s: { type: 'progress', stage: 'sponsoring' },
  c: { type: 'progress', stage: 'confirming' },
};

/** The actions the gate and the flows publish, keyed by their marble letter. */
const emitted = {
  a: actions.passport.setFlow('ceremony'),
  p: actions.passport.setFlow('proving'),
  s: actions.passport.setFlow('sponsoring'),
  c: actions.passport.setFlow('confirming'),
  h: actions.passport.setDevices(refreshedDevices),
  i: actions.passport.setLocalUseCounter('3'),
  o: actions.passport.setEncKey('0c'.repeat(32)),
  f: actions.passport.clearEncKey(),
  z: actions.passport.setDroppedDevices(['dd'.repeat(32)]),
  g: actions.passport.setGrants(issued.grants),
  r: actions.passport.setGrants(revoked.grants),
  e: actions.passport.setGrants(cleared.grants),
  u: actions.passport.setUnsealedGrantIds([]),
  q: actions.passport.setUnsealedGrantIds([grantId]),
  b: actions.passport.setRevocationPendingGrantIds([]),
  d: actions.passport.setRevocationPendingGrantIds([grantId]),
  l: actions.passport.setLastIssuedGrantId(grantId),
  j: actions.passport.setFlow('ready'),
  n: actions.passport.setFlowError({
    code: 'no-account',
    message: 'No ready Passport account is available.',
  }),
};

/** The account call input every grant flow is started with. */
const callInput = {
  account,
  devices: sampledDevices,
  localUseCounter: knownUseCounter,
};

/**
 * The state the grant actions are dispatched over, as hot marbles that
 * emit ahead of the triggers: flow letters are r ready, e error, d
 * deploying; account letters are a the account, u none.
 */
type StateMarbles = {
  flow?: string;
  account?: string;
};

type GrantFlowName = 'issueGrant' | 'revokeAllGrants' | 'revokeGrant';

type FlowTest = {
  triggers?: Partial<Record<GrantFlowName, string>>;
  state?: StateMarbles;
  flows?: Partial<
    Record<
      GrantFlowName,
      (cold: RunHelpers['cold']) => Observable<FlowEvent<unknown>>[]
    >
  >;
  assertion: (harness: {
    sideEffect$: Observable<unknown>;
    helpers: RunHelpers;
    flowMocks: Record<GrantFlowName, ReturnType<typeof vi.fn>>;
  }) => void;
};

const GRANT_FLOWS: GrantFlowName[] = [
  'issueGrant',
  'revokeGrant',
  'revokeAllGrants',
];

const triggerOf = {
  issueGrant: actions.passport.issueGrant(scope),
  revokeGrant: actions.passport.revokeGrant({ grantId }),
  revokeAllGrants: actions.passport.revokeAllGrants(),
};

/**
 * Drives the gate on the virtual scheduler with the grant flows replaced
 * by cold marbles; a flow given no marbles returns an observable which
 * never emits, so it stays silent past its own start, and the other
 * triggers never fire.
 */
const runFlowTest = ({
  triggers = {},
  state = {},
  flows = {},
  assertion,
}: FlowTest) => {
  testSideEffect<Selectors, ActionCreators>(runPassportFlow, helpers => {
    const { cold, hot } = helpers;
    const flowMocks = Object.fromEntries(
      GRANT_FLOWS.map(flow => [
        flow,
        vi.fn((): Observable<FlowEvent<unknown>> => NEVER),
      ]),
    ) as Record<GrantFlowName, ReturnType<typeof vi.fn>>;
    for (const flow of GRANT_FLOWS) {
      for (const flow$ of flows[flow]?.(cold) ?? []) {
        flowMocks[flow].mockReturnValueOnce(flow$);
      }
    }
    const trigger$ = <Flow extends GrantFlowName>(flow: Flow) => {
      const marble = triggers[flow];
      return marble === undefined ? NEVER : hot(marble, { t: triggerOf[flow] });
    };
    return {
      actionObservables: {
        passport: {
          addDevice$: NEVER,
          createAccount$: NEVER,
          removeDevice$: NEVER,
          signIn$: NEVER,
          issueGrant$: trigger$('issueGrant'),
          installOperations$: NEVER,
          readShieldedHoldings$: NEVER,
          revokeGrant$: trigger$('revokeGrant'),
          revokeAllGrants$: trigger$('revokeAllGrants'),
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
      dependencies: { actions, passportFlows: flowMocks } as never,
      assertion: sideEffect$ => {
        assertion({ sideEffect$, helpers, flowMocks });
      },
    };
  });
};

const typedFailures = [
  [new GrantScopeInvalidError('shielded spend requires read')],
  [new GrantLimitReachedError()],
  [new GrantNotFoundError('failed assert: unknown grant')],
  [new GrantRevokedError('failed assert: grant not live')],
  [new GrantOriginMissingError()],
  [new GrantRosterUnsettledError()],
  [new NotAuthorisedError('failed assert: invalid signature')],
  [
    new AccountContractMissingError(
      `No live Account Custody Contract found at ${accountAddress}.`,
    ),
  ],
  [new CeremonyCancelledError()],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runPassportFlow: issueGrant', () => {
  it('enters the ceremony with the trigger, then publishes the rosters and the issued id in order', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      flows: { issueGrant: cold => [cold('--(f|)', events)] },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(higublj)', emitted);
        helpers.flush();
        expect(flowMocks.issueGrant).toHaveBeenCalledExactlyOnceWith(
          { scope, ...callInput },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('publishes the read grants the call could not seal to after the roster, ahead of the issued id', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      flows: { issueGrant: cold => [cold('--(y|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(higqblj)', emitted);
      },
    });
  });

  it('maps the proving, sponsoring and confirming stages the flow reports onto the flow state', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      flows: { issueGrant: cold => [cold('-p-s-c-(f|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers
          .expectObservable(sideEffect$)
          .toBe('-ap-s-c-(higublj)', emitted);
      },
    });
  });

  it.each(typedFailures)(
    'forgets the key state and maps a typed flow failure to one setFlowError carrying its code: $code',
    failure => {
      runFlowTest({
        triggers: { issueGrant: '-t' },
        flows: { issueGrant: cold => [cold('-#', events, failure)] },
        assertion: ({ sideEffect$, helpers }) => {
          helpers.expectObservable(sideEffect$).toBe('-a(fubk)', {
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

  it('forgets the key state and maps an untyped flow failure to setFlowError with the grant-issue-failed code', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      flows: {
        issueGrant: cold => [cold('-#', events, new Error('node unreachable'))],
      },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(fubk)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'grant-issue-failed',
            message: 'node unreachable',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      state: { account: 'u' },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flowMocks.issueGrant).not.toHaveBeenCalled();
      },
    });
  });

  it('refuses with no-account while another flow is mid-operation, without calling the flow', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      state: { flow: 'd' },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flowMocks.issueGrant).not.toHaveBeenCalled();
      },
    });
  });

  it('runs from the error flow a failed call left behind', () => {
    runFlowTest({
      triggers: { issueGrant: '-t' },
      state: { flow: 'e' },
      flows: { issueGrant: cold => [cold('-(f|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(higublj)', emitted);
      },
    });
  });

  it('drops an issueGrant dispatched while one is in flight', () => {
    runFlowTest({
      triggers: { issueGrant: '-t-t' },
      flows: { issueGrant: cold => [cold('----(f|)', events)] },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a---(higublj)', emitted);
        helpers.flush();
        expect(flowMocks.issueGrant).toHaveBeenCalledOnce();
      },
    });
  });
});

describe('runPassportFlow: revokeGrant', () => {
  it('enters the ceremony with the trigger, then publishes the rosters in order', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('--(v|)', events)] },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hirubj)', emitted);
        helpers.flush();
        expect(flowMocks.revokeGrant).toHaveBeenCalledExactlyOnceWith(
          { grantId, ...callInput },
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it.each(typedFailures)(
    'forgets the key state and maps a typed flow failure to one setFlowError carrying its code: $code',
    failure => {
      runFlowTest({
        triggers: { revokeGrant: '-t' },
        flows: { revokeGrant: cold => [cold('-#', events, failure)] },
        assertion: ({ sideEffect$, helpers }) => {
          helpers.expectObservable(sideEffect$).toBe('-a(fubk)', {
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

  it('publishes the enc_key a rotating revocation stepped the key to before the roster', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('--(w|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hiorubj)', emitted);
      },
    });
  });

  it('publishes the read grants awaiting a revocation that has not landed after the unsealed ones', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('--(d|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hiorudj)', emitted);
      },
    });
  });

  it('publishes the devices a rotating revocation left without the new key after the enc_key', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('--(k|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hiozrubj)', emitted);
      },
    });
  });

  it('maps the confirming stage the flow reports onto the flow state', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('-c-(v|)', events)] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-ac-(hirubj)', emitted);
      },
    });
  });

  it('forgets the key state and maps an untyped flow failure to setFlowError with the grant-revoke-failed code', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      flows: { revokeGrant: cold => [cold('-#', events, 'submission lost')] },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(fubk)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'grant-revoke-failed',
            message: 'submission lost',
          }),
        });
      },
    });
  });

  it('refuses with no-account when no account is in state, without calling the flow', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t' },
      state: { account: 'u' },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flowMocks.revokeGrant).not.toHaveBeenCalled();
      },
    });
  });
});

describe('runPassportFlow: revokeAllGrants', () => {
  it('enters the ceremony with the trigger, then publishes the emptied rosters in order', () => {
    runFlowTest({
      triggers: { revokeAllGrants: '-t' },
      flows: { revokeAllGrants: cold => [cold('--(x|)', events)] },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-a-(hieubj)', emitted);
        helpers.flush();
        expect(flowMocks.revokeAllGrants).toHaveBeenCalledExactlyOnceWith(
          callInput,
          expect.objectContaining({ actions }),
        );
      },
    });
  });

  it('forgets the key state and maps an untyped flow failure to setFlowError with the grant-revoke-all-failed code', () => {
    runFlowTest({
      triggers: { revokeAllGrants: '-t' },
      flows: {
        revokeAllGrants: cold => [
          cold('-#', events, new Error('node unreachable')),
        ],
      },
      assertion: ({ sideEffect$, helpers }) => {
        helpers.expectObservable(sideEffect$).toBe('-a(fubk)', {
          ...emitted,
          k: actions.passport.setFlowError({
            code: 'grant-revoke-all-failed',
            message: 'node unreachable',
          }),
        });
      },
    });
  });

  it('refuses with no-account while another flow is mid-operation, without calling the flow', () => {
    runFlowTest({
      triggers: { revokeAllGrants: '-t' },
      state: { flow: 'd' },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers.expectObservable(sideEffect$).toBe('-(an)', emitted);
        helpers.flush();
        expect(flowMocks.revokeAllGrants).not.toHaveBeenCalled();
      },
    });
  });

  it('is dropped while a revokeGrant is in flight, and accepted once it settles', () => {
    runFlowTest({
      triggers: { revokeGrant: '-t', revokeAllGrants: '--t----------t' },
      flows: {
        revokeGrant: cold => [cold('---(v|)', events)],
        revokeAllGrants: cold => [cold('(x|)', events)],
      },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers
          .expectObservable(sideEffect$)
          .toBe('-a--(hirubj)-(ahieubj)', emitted);
        helpers.flush();
        expect(flowMocks.revokeGrant).toHaveBeenCalledOnce();
        expect(flowMocks.revokeAllGrants).toHaveBeenCalledOnce();
      },
    });
  });
});
