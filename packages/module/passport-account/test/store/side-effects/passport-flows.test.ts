import {
  DeviceCommitmentHex,
  GrantId,
  GrantSlot,
  TokenColor,
  UseCounter,
  passportActions,
} from '@lace-contract/passport';
import { passportReducers } from '@lace-contract/passport/src/store/slice';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { jubjub } from '@noble/curves/misc.js';
import { BehaviorSubject, map, NEVER, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../src/augmentations';
import { devEncryptionKey } from '../../../src/acc/dev-encryption-key';
import { encodeDevicePublicKey } from '../../../src/acc/envelopes';
import { GRANTEE_WITHDRAWAL_CIRCUITS } from '../../../src/acc/grant-circuits';
import { deriveGrantId, originHash } from '../../../src/acc/grants';
import { accManifest } from '../../../src/acc/manifest';
import { JubjubDevice } from '../../../src/acc/signer';
import { createDependencies } from '../../../src/store/dependencies';
import { runPassportFlow } from '../../../src/store/side-effects/passport-flows';

import type * as AccModule from '../../../src/acc/acc-module';
import type { DeviceRoster } from '../../../src/flows/devices';
import type { GrantRoster, IssuedGrant } from '../../../src/flows/grants';
import type { RecognisedAccount } from '../../../src/flows/sign-in';
import type { FlowEvent } from '../../../src/store/dependencies';
import type {
  ActionCreators,
  GrantRecord,
  GrantScopeInput,
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

/** The grantee withdrawals of both schemes, as an account deployed here holds them. */
const INSTALLED_WITHDRAWALS = Object.values(GRANTEE_WITHDRAWAL_CIRCUITS).flat();

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  readGrants: vi.fn(),
  createMidnightProviders: vi.fn(),
  connectAccountHandle: vi.fn(),
  executeGatedCall: vi.fn(),
  deployAccount: vi.fn(),
  resolveUseCounter: vi.fn(),
}));

vi.mock('../../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../../src/acc/acc-module', async importOriginal => ({
  ...(await importOriginal<typeof AccModule>()),
  ledger: mocks.ledger,
}));
vi.mock('../../../src/acc/read-grants', () => ({
  readGrants: mocks.readGrants,
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
  readMaintenanceAuthority: async () => ({
    committee: [],
    threshold: 1,
    counter: 0n,
  }),
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
const devSeed = new Uint8Array(64).fill(1);
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
  networkId: 'undeployed',
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
const rpId = 'lace.io';
const localKey = new JubjubDevice(77n);
/**
 * The live entry the key this device registered derives, so a rotation
 * resolves this device's registration at once rather than scanning past it.
 */
const localRegisteredEntry = HexBytes.fromByteArray(
  localKey.entryAt(ByteArray.fromHex(HexBytes(accountAddress)), 1n, 0n),
);
const grantee = new JubjubDevice(55n);
const scope: GrantScopeInput = {
  grantee: {
    scheme: 'jubjub-schnorr',
    publicKey: HexBytes.fromByteArray(
      jubjub.Point.fromAffine(grantee.pk).toBytes(),
    ),
  },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};
const heldGrantId = GrantId('ab'.repeat(32));
const grantRecord = (id: GrantId, active = true): GrantRecord => ({
  id,
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

/** The id the issue flow derives for the grantee's first slot under this host. */
const issuedGrantId = deriveGrantId({
  contractAddress: ByteArray.fromHex(HexBytes(accountAddress)),
  granteePublicKey: { scheme: 'jubjub-schnorr', point: grantee.pk },
  originHash: await originHash(rpId),
  slot: GrantSlot(0),
});

type TriggerAction =
  | ReturnType<typeof actions.passport.addDevice>
  | ReturnType<typeof actions.passport.createAccount>
  | ReturnType<typeof actions.passport.issueGrant>
  | ReturnType<typeof actions.passport.removeDevice>
  | ReturnType<typeof actions.passport.revokeAllGrants>
  | ReturnType<typeof actions.passport.revokeGrant>
  | ReturnType<typeof actions.passport.signIn>;

/** What the chain reads as before and after the accepted gated call. */
type ChainRoster = { before: GrantRecord[]; after: GrantRecord[] };

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

const createHarness = (withStoredRecord = true, roster?: ChainRoster) => {
  if (roster) {
    let current = roster.before;
    mocks.readGrants.mockImplementation(() => current);
    mocks.executeGatedCall.mockImplementation(async () => {
      current = roster.after;
      return UseCounter(BigInt(advancedUseCounter));
    });
  }
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(async () => localKey.pk),
    deviceCommitment: vi.fn(async () => DeviceCommitmentHex(localCommitment)),
    authorise: vi.fn(),
  };
  const storage = {
    getValues: vi.fn(() => of(withStoredRecord ? [record] : [])),
    setValue: vi.fn(() => of(void 0)),
  };
  const queryContractState = vi.fn(async () => ({
    data: 'charged-state',
    operations: () => INSTALLED_WITHDRAWALS,
  }));
  mocks.createIndexerClient.mockReturnValue({
    queryContractState,
    enumerateContractActions: vi.fn(async () => []),
  });

  const addDevice$ = new Subject<TriggerAction>();
  const createAccount$ = new Subject<TriggerAction>();
  const issueGrant$ = new Subject<TriggerAction>();
  const removeDevice$ = new Subject<TriggerAction>();
  const revokeAllGrants$ = new Subject<TriggerAction>();
  const revokeGrant$ = new Subject<TriggerAction>();
  const signIn$ = new Subject<TriggerAction>();
  const triggers: Record<string, Subject<TriggerAction>> = {
    [actions.passport.addDevice.type]: addDevice$,
    [actions.passport.createAccount.type]: createAccount$,
    [actions.passport.issueGrant.type]: issueGrant$,
    [actions.passport.removeDevice.type]: removeDevice$,
    [actions.passport.revokeAllGrants.type]: revokeAllGrants$,
    [actions.passport.revokeGrant.type]: revokeGrant$,
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
      passport: {
        addDevice$,
        createAccount$,
        issueGrant$,
        installOperations$: NEVER,
        readShieldedHoldings$: NEVER,
        removeDevice$,
        revokeAllGrants$,
        revokeGrant$,
        signIn$,
      },
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
        encryptionKey: devEncryptionKey(devSeed),
        network,
        prover: { prove: vi.fn(), check: vi.fn() },
        sponsor: { balanceAndSign: vi.fn() },
        rpId,
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
  /** What the chain reads as around a grant call, so its roster settles. */
  roster?: () => ChainRoster;
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
  {
    flow: 'issueGrant',
    code: 'grant-issue-failed',
    roster: () => ({ before: [], after: [grantRecord(issuedGrantId)] }),
    trigger: () => actions.passport.issueGrant(scope),
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
    flow: 'revokeGrant',
    code: 'grant-revoke-failed',
    roster: () => ({
      before: [grantRecord(heldGrantId)],
      after: [grantRecord(heldGrantId, false)],
    }),
    trigger: () => actions.passport.revokeGrant({ grantId: heldGrantId }),
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
    flow: 'revokeAllGrants',
    code: 'grant-revoke-all-failed',
    roster: () => ({ before: [grantRecord(heldGrantId)], after: [] }),
    trigger: () => actions.passport.revokeAllGrants(),
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

/** The ledger's device set: membership by entry bytes, and every entry in order. */
const deviceSet = (commitments: string[]) => ({
  member: (entry: Uint8Array) =>
    commitments.includes(HexBytes.fromByteArray(entry)),
  [Symbol.iterator]: function* () {
    for (const commitment of commitments) {
      yield ByteArray.fromHex(HexBytes(commitment));
    }
  },
});

beforeEach(async () => {
  vi.clearAllMocks();
  const keys = await devEncryptionKey(devSeed).createKeys(network.networkId, {
    devicePublicKey: encodeDevicePublicKey(localKey.pk),
  });
  const inbox = [...keys.envelopes, ...keys.registrations];
  let authNonce = 0n;
  mocks.ledger.mockImplementation(() => ({
    enc_key: keys.encKey,
    device_epoch: 1n,
    auth_nonce: (authNonce += 1n),
    booted: true,
    devices: deviceSet([
      localCommitment,
      targetCommitment,
      localRegisteredEntry,
    ]),
    inbox_count: BigInt(inbox.length),
    inbox: {
      member: (ordinal: bigint) => ordinal < BigInt(inbox.length),
      lookup: (ordinal: bigint) => inbox[Number(ordinal)],
    },
  }));
  mocks.readGrants.mockReturnValue([]);
  mocks.resolveUseCounter.mockResolvedValue({
    useCounter: UseCounter(BigInt(knownUseCounter)),
    commitmentHex: localCommitment,
  });
  mocks.createMidnightProviders.mockResolvedValue({ tag: 'providers' });
  mocks.connectAccountHandle.mockResolvedValue({ callTx: {} });
  mocks.executeGatedCall.mockResolvedValue(
    UseCounter(BigInt(advancedUseCounter)),
  );
  mocks.deployAccount.mockImplementation(
    async ({
      onDeployed,
    }: {
      onDeployed: (address: string, pending: unknown) => Promise<void>;
    }) => {
      await onDeployed(accountAddress, {
        operations: [],
        lockAccount: false,
        saltHex: '00'.repeat(32),
        authorityKey: { tag: 'schnorr', value: '00'.repeat(32) },
        handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
      });
      return {
        address: accountAddress,
        salt: new Uint8Array(32),
        isActivated: false,
        activate: vi.fn(async () => ({ txId: 'activation-tx' })),
      };
    },
  );
});

describe.each(flowCases)(
  'the $flow flow',
  ({ code, roster, trigger, failOnce, holdInFlight, withStoredRecord }) => {
    it('leaves the flow ready with no error, from a settled start', async () => {
      const harness = createHarness(withStoredRecord ?? true, roster?.());

      harness.dispatch(trigger());
      await harness.waitForSettled(1);

      expect(harness.state().flow).toBe('ready');
      expect(harness.state().flowError).toBeUndefined();
      harness.stop();
    });

    it('leaves the flow in error with the code its failure carries', async () => {
      const harness = createHarness(withStoredRecord ?? true, roster?.());
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
      const harness = createHarness(withStoredRecord ?? true, roster?.());
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
      const harness = createHarness(withStoredRecord ?? true, roster?.());
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

type FlowName =
  | 'addDevice'
  | 'createAccount'
  | 'issueGrant'
  | 'removeDevice'
  | 'revokeAllGrants'
  | 'revokeGrant'
  | 'signIn';

const FLOW_NAMES: FlowName[] = [
  'addDevice',
  'createAccount',
  'issueGrant',
  'removeDevice',
  'revokeAllGrants',
  'revokeGrant',
  'signIn',
];

/** The trigger each flow runs behind, as the letter t in its marble. */
const triggerOf = {
  addDevice: actions.passport.addDevice({ commitmentHex: joiningCommitment }),
  createAccount: actions.passport.createAccount({ lockAccount: false }),
  issueGrant: actions.passport.issueGrant(scope),
  removeDevice: actions.passport.removeDevice({
    commitmentHex: targetCommitment,
  }),
  revokeAllGrants: actions.passport.revokeAllGrants(),
  revokeGrant: actions.passport.revokeGrant({ grantId: heldGrantId }),
  signIn: actions.passport.signIn(),
};

const sampledDevices = [localDevice, targetDevice];
const roster: DeviceRoster = {
  devices: sampledDevices,
  localUseCounter: advancedUseCounter,
};
const grants = [grantRecord(heldGrantId)];
const grantRoster: GrantRoster = {
  ...roster,
  grants,
  unsealedGrantIds: [],
  revocationPendingGrantIds: [],
};
const issuedGrant: IssuedGrant = { ...grantRoster, grantId: heldGrantId };
const accountState: RecognisedAccount = {
  account,
  ...roster,
  grants,
  encKey: '0a'.repeat(32),
  unsealedGrantIds: [],
};

/**
 * The flow events a cold marble may carry, keyed by their marble letter:
 * f settles an account flow, v a device flow, w a revoke flow and x the
 * issue flow, over the same rosters so each settles into the same
 * published actions.
 */
const events: Record<string, FlowEvent<unknown>> = {
  b: { type: 'progress', stage: 'deploying' },
  c: { type: 'progress', stage: 'proving' },
  d: { type: 'progress', stage: 'sponsoring' },
  e: { type: 'progress', stage: 'activating' },
  f: { type: 'done', result: accountState },
  v: { type: 'done', result: roster },
  w: { type: 'done', result: grantRoster },
  x: { type: 'done', result: issuedGrant },
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
  o: actions.passport.setEncKey('0a'.repeat(32)),
  m: actions.passport.setGrants(grants),
  u: actions.passport.setUnsealedGrantIds([]),
  q: actions.passport.setRevocationPendingGrantIds([]),
  l: actions.passport.setLastIssuedGrantId(heldGrantId),
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
          issueGrant$: trigger$('issueGrant'),
          installOperations$: NEVER,
          readShieldedHoldings$: NEVER,
          removeDevice$: trigger$('removeDevice'),
          revokeAllGrants$: trigger$('revokeAllGrants'),
          revokeGrant$: trigger$('revokeGrant'),
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
 * One flow in flight from frame 1 to frame 6, the others dispatched
 * meanwhile, then the next flow accepted once the running one settled.
 * A creation settles as (ghiomj) over frames 6 to 13, a sign-in as
 * (ghiomuqj) over frames 6 to 15 and the issue flow as (himuqlj) over
 * frames 6 to 13; a device flow as (hij) over frames 6 to 10 and a revoke
 * flow as (himuqj) over frames 6 to 12.
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
      signIn: '--t-----------t',
      addDevice: '---t',
      removeDevice: '----t',
      issueGrant: '---t',
      revokeGrant: '----t',
      revokeAllGrants: '-----t',
    },
    flow: '-----(f|)',
    expected: '-a----(ghiomj)a',
  },
  {
    running: 'signIn',
    next: 'addDevice',
    triggers: {
      signIn: '-t',
      addDevice: '--t-------------t',
      removeDevice: '---t',
      createAccount: '----t',
      issueGrant: '---t',
      revokeGrant: '----t',
      revokeAllGrants: '-----t',
    },
    flow: '-----(f|)',
    expected: '-a----(ghiomuqj)a',
  },
  {
    running: 'addDevice',
    next: 'removeDevice',
    triggers: {
      addDevice: '-t',
      removeDevice: '--t---------t',
      createAccount: '---t',
      signIn: '----t',
      issueGrant: '---t',
      revokeGrant: '----t',
      revokeAllGrants: '-----t',
    },
    flow: '-----(v|)',
    expected: '-a----(hij)-a',
  },
  {
    running: 'removeDevice',
    next: 'issueGrant',
    triggers: {
      removeDevice: '-t',
      issueGrant: '--t---------t',
      signIn: '---t',
      addDevice: '----t',
      createAccount: '---t',
      revokeGrant: '----t',
      revokeAllGrants: '-----t',
    },
    flow: '-----(v|)',
    expected: '-a----(hij)-a',
  },
  {
    running: 'issueGrant',
    next: 'revokeGrant',
    triggers: {
      issueGrant: '-t',
      revokeGrant: '--t------------t',
      revokeAllGrants: '---t',
      createAccount: '----t',
      signIn: '---t',
      addDevice: '----t',
      removeDevice: '-----t',
    },
    flow: '-----(x|)',
    expected: '-a----(himuqlj)a',
  },
  {
    running: 'revokeGrant',
    next: 'revokeAllGrants',
    triggers: {
      revokeGrant: '-t',
      revokeAllGrants: '--t-----------t',
      issueGrant: '---t',
      createAccount: '----t',
      signIn: '---t',
      addDevice: '----t',
      removeDevice: '-----t',
    },
    flow: '-----(w|)',
    expected: '-a----(himuqj)a',
  },
  {
    running: 'revokeAllGrants',
    next: 'createAccount',
    triggers: {
      revokeAllGrants: '-t',
      createAccount: '--t-----------t',
      issueGrant: '---t',
      revokeGrant: '----t',
      signIn: '---t',
      addDevice: '----t',
      removeDevice: '-----t',
    },
    flow: '-----(w|)',
    expected: '-a----(himuqj)a',
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
        createAccount: '-------------t',
        removeDevice: '----------------t',
      },
      flows: {
        signIn: cold => [cold('--(f|)', events)],
        createAccount: cold => [cold('-b-c-d-e-(f|)', events)],
      },
      assertion: ({ sideEffect$, helpers, flowMocks }) => {
        helpers
          .expectObservable(sideEffect$)
          .toBe('-a-(ghiomuqj)ab-c-d-e-(ghiomj)', emitted);
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
        helpers.expectObservable(sideEffect$).toBe('-a--(ghiomuqj)', emitted);
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
