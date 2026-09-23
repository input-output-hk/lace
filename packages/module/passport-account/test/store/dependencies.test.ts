import { RecordUnreadableError } from '@lace-contract/passport';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDependencies } from '../../src/store/dependencies';
import {
  isSealedRecord,
  openRecord,
  sealRecord,
} from '../../src/store/envelope';

import type { DeviceCallInput } from '../../src/flows/devices';
import type { FlowContext } from '../../src/flows/types';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type { FlowEvent } from '../../src/store/dependencies';
import type { SealedRecord } from '../../src/store/envelope';
import type { Observable } from 'rxjs';

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  signIn: vi.fn(),
  addDevice: vi.fn(),
  removeDevice: vi.fn(),
}));

vi.mock('../../src/flows/create-account', () => ({
  createAccount: mocks.createAccount,
}));
vi.mock('../../src/flows/sign-in', () => ({
  signIn: mocks.signIn,
}));
vi.mock('../../src/flows/devices', () => ({
  addDevice: mocks.addDevice,
  removeDevice: mocks.removeDevice,
}));

const record: PassportAccountRecord = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};
const deviceCall: DeviceCallInput = {
  commitmentHex: 'ab'.repeat(32),
  account: {
    address: record.address,
    bindingVersion: record.bindingVersion,
    status: 'ready',
  },
  devices: [],
  localUseCounter: record.localUseCounter,
};

const authoriser = {
  scheme: 'jubjub-schnorr' as const,
  devicePublicKey: vi.fn(),
  deviceCommitment: vi.fn(),
  authorise: vi.fn(),
  storageKey: vi.fn(async () =>
    crypto.subtle.importKey(
      'raw',
      new Uint8Array(32).fill(7),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    ),
  ),
};
const sponsor = { balanceAndSign: vi.fn() };
const prover = { prove: vi.fn(), check: vi.fn() };
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};

const createFlowRunnerDependencies = () => ({
  createKeyValueStorage: vi.fn(() => ({
    getValues: vi.fn(() => of([])),
    setValue: vi.fn(() => of(void 0)),
  })),
  passportAuthoriser: authoriser,
  passportSponsor: sponsor,
  passportProver: prover,
  passportNetwork: network,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const collect = <T>(events$: Observable<FlowEvent<T>>) => {
  const events: FlowEvent<T>[] = [];
  const notifications: string[] = [];
  const subscription = events$.subscribe({
    next: event => {
      events.push(event);
    },
    error: (error: unknown) => {
      notifications.push(`error:${(error as Error).message}`);
    },
    complete: () => {
      notifications.push('complete');
    },
  });
  return { events, notifications, subscription };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('streaming a flow promise as an observable (via passportFlows.createAccount)', () => {
  it('emits each stage synchronously as reported, then done, then completes', async () => {
    const settled = deferred<string>();
    mocks.createAccount.mockImplementation(
      async (_input, { onProgress }: FlowContext) => {
        onProgress('deploying');
        onProgress('activating');
        return settled.promise;
      },
    );
    const { passportFlows } = createDependencies({
      authoriser,
      sponsor,
      prover,
      network,
    });
    const events$ = passportFlows.createAccount(
      { lockAccount: true },
      createFlowRunnerDependencies() as never,
    );

    const { events, notifications } = collect(events$);
    expect(events).toEqual([
      { type: 'progress', stage: 'deploying' },
      { type: 'progress', stage: 'activating' },
    ]);
    expect(notifications).toEqual([]);

    settled.resolve('created');
    await vi.waitFor(() => {
      expect(notifications).toEqual(['complete']);
    });
    expect(events.at(-1)).toEqual({ type: 'done', result: 'created' });
  });

  it('errors with the rejection', async () => {
    mocks.createAccount.mockRejectedValue(new Error('node unreachable'));
    const { passportFlows } = createDependencies({
      authoriser,
      sponsor,
      prover,
      network,
    });
    const events$ = passportFlows.createAccount(
      { lockAccount: true },
      createFlowRunnerDependencies() as never,
    );

    const { events, notifications } = collect(events$);
    await vi.waitFor(() => {
      expect(notifications).toEqual(['error:node unreachable']);
    });
    expect(events).toEqual([]);
  });

  it('invokes the flow once per subscription', () => {
    mocks.createAccount.mockResolvedValue('created');
    const { passportFlows } = createDependencies({
      authoriser,
      sponsor,
      prover,
      network,
    });
    const events$ = passportFlows.createAccount(
      { lockAccount: true },
      createFlowRunnerDependencies() as never,
    );

    expect(mocks.createAccount).not.toHaveBeenCalled();
    events$.subscribe();
    events$.subscribe();
    expect(mocks.createAccount).toHaveBeenCalledTimes(2);
  });

  it('delivers nothing after unsubscribe, even once the promise settles', async () => {
    const settled = deferred<string>();
    let report!: (stage: 'activating') => void;
    mocks.createAccount.mockImplementation(
      async (_input, { onProgress }: FlowContext) => {
        report = onProgress;
        return settled.promise;
      },
    );
    const { passportFlows } = createDependencies({
      authoriser,
      sponsor,
      prover,
      network,
    });
    const events$ = passportFlows.createAccount(
      { lockAccount: true },
      createFlowRunnerDependencies() as never,
    );

    const { events, notifications, subscription } = collect(events$);
    subscription.unsubscribe();
    report('activating');
    settled.resolve('created');
    await settled.promise;
    await Promise.resolve();

    expect(events).toEqual([]);
    expect(notifications).toEqual([]);
  });
});

describe('createDependencies', () => {
  it('maps the four seams onto the contract fields', () => {
    expect(
      createDependencies({ authoriser, sponsor, prover, network }),
    ).toMatchObject({
      passportAuthoriser: authoriser,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    });
  });

  it("wires createAccount to the seams, a progress sink, and a record store sealed by the authoriser's storage key", async () => {
    const storage = {
      getValues: vi.fn(() => of([])),
      setValue: vi.fn(() => of(void 0)),
    };
    const createKeyValueStorage = vi.fn(() => storage);
    const dependencies = {
      createKeyValueStorage,
      passportAuthoriser: authoriser,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    mocks.createAccount.mockResolvedValue('created');
    const { passportFlows } = createDependencies({
      authoriser,
      sponsor,
      prover,
      network,
    });

    const events: unknown[] = [];
    passportFlows
      .createAccount({ lockAccount: true }, dependencies as never)
      .subscribe(event => {
        events.push(event);
      });
    await vi.waitFor(() => {
      expect(events).toEqual([{ type: 'done', result: 'created' }]);
    });

    expect(mocks.createAccount).toHaveBeenCalledExactlyOnceWith(
      { lockAccount: true },
      {
        seams: {
          passportAuthoriser: authoriser,
          passportSponsor: sponsor,
          passportProver: prover,
          passportNetwork: network,
        },
        accountRecords: expect.any(Object) as unknown,
        onProgress: expect.any(Function) as unknown,
      },
    );
    const [, { accountRecords }] = mocks.createAccount.mock
      .calls[0] as unknown as [unknown, FlowContext];
    await expect(accountRecords.exists()).resolves.toBe(false);
    expect(createKeyValueStorage).toHaveBeenCalledWith({
      collectionId: 'passport-account',
    });

    await accountRecords.write(record);
    expect(authoriser.storageKey).toHaveBeenCalled();
    const [, sealed] = storage.setValue.mock.calls[0] as unknown as [
      string,
      SealedRecord,
    ];
    expect(isSealedRecord(sealed)).toBe(true);
    await expect(
      openRecord(await authoriser.storageKey(), sealed),
    ).resolves.toEqual(record);
  });

  it('wires signIn to the seams, a progress sink, and a record store that errors on a sealed record with no storage key', async () => {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32).fill(7),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    const sealed = await sealRecord(key, record);
    const storage = {
      getValues: vi.fn(() => of([sealed])),
      setValue: vi.fn(() => of(void 0)),
    };
    const createKeyValueStorage = vi.fn(() => storage);
    const authoriserWithoutStorageKey = {
      ...authoriser,
      storageKey: undefined,
    };
    const dependencies = {
      createKeyValueStorage,
      passportAuthoriser: authoriserWithoutStorageKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    mocks.signIn.mockResolvedValue('recognised');
    const { passportFlows } = createDependencies({
      authoriser: authoriserWithoutStorageKey,
      sponsor,
      prover,
      network,
    });

    const events: unknown[] = [];
    passportFlows.signIn(dependencies as never).subscribe(event => {
      events.push(event);
    });
    await vi.waitFor(() => {
      expect(events).toEqual([{ type: 'done', result: 'recognised' }]);
    });

    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith({
      seams: {
        passportAuthoriser: authoriserWithoutStorageKey,
        passportSponsor: sponsor,
        passportProver: prover,
        passportNetwork: network,
      },
      accountRecords: expect.any(Object) as unknown,
      onProgress: expect.any(Function) as unknown,
    });
    const [{ accountRecords }] = mocks.signIn.mock.calls[0] as unknown as [
      FlowContext,
    ];
    expect(createKeyValueStorage).toHaveBeenCalledWith({
      collectionId: 'passport-account',
    });
    await expect(accountRecords.read()).rejects.toThrow(RecordUnreadableError);
  });

  it.each([
    ['addDevice', mocks.addDevice],
    ['removeDevice', mocks.removeDevice],
  ] as const)(
    'wires %s to the seams, the call input, and a record store that reads a sealed record with no storage key as absent',
    async (name, flow) => {
      const key = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(32).fill(7),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt'],
      );
      const sealed = await sealRecord(key, record);
      const storage = {
        getValues: vi.fn(() => of([sealed])),
        setValue: vi.fn(() => of(void 0)),
      };
      const createKeyValueStorage = vi.fn(() => storage);
      const authoriserWithoutStorageKey = {
        ...authoriser,
        storageKey: undefined,
      };
      const dependencies = {
        createKeyValueStorage,
        passportAuthoriser: authoriserWithoutStorageKey,
        passportSponsor: sponsor,
        passportProver: prover,
        passportNetwork: network,
      };
      flow.mockResolvedValue('accepted');
      const { passportFlows } = createDependencies({
        authoriser: authoriserWithoutStorageKey,
        sponsor,
        prover,
        network,
      });

      const events: unknown[] = [];
      passportFlows[name](deviceCall, dependencies as never).subscribe(
        event => {
          events.push(event);
        },
      );
      await vi.waitFor(() => {
        expect(events).toEqual([{ type: 'done', result: 'accepted' }]);
      });

      expect(flow).toHaveBeenCalledExactlyOnceWith(deviceCall, {
        seams: {
          passportAuthoriser: authoriserWithoutStorageKey,
          passportSponsor: sponsor,
          passportProver: prover,
          passportNetwork: network,
        },
        accountRecords: expect.any(Object) as unknown,
        onProgress: expect.any(Function) as unknown,
      });
      const [, { accountRecords }] = flow.mock.calls[0] as unknown as [
        unknown,
        FlowContext,
      ];
      expect(createKeyValueStorage).toHaveBeenCalledWith({
        collectionId: 'passport-account',
      });
      await expect(accountRecords.read()).resolves.toBeUndefined();
      await expect(accountRecords.exists()).resolves.toBe(true);
    },
  );
});
