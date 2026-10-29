import {
  GrantId,
  RecordUnreadableError,
  TokenColor,
} from '@lace-contract/passport';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDependencies } from '../../src/store/dependencies';
import {
  isSealedRecord,
  openRecord,
  sealRecord,
} from '../../src/store/envelope';

import type { DeviceCallInput } from '../../src/flows/devices';
import type { IssueGrantInput, RevokeGrantInput } from '../../src/flows/grants';
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
  issueGrant: vi.fn(),
  revokeGrant: vi.fn(),
  revokeAllGrants: vi.fn(),
  readShieldedHoldings: vi.fn(),
  installOperations: vi.fn(),
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
vi.mock('../../src/flows/grants', () => ({
  issueGrant: mocks.issueGrant,
  revokeGrant: mocks.revokeGrant,
  revokeAllGrants: mocks.revokeAllGrants,
}));
vi.mock('../../src/flows/holdings', () => ({
  readShieldedHoldings: mocks.readShieldedHoldings,
}));
vi.mock('../../src/flows/install-operations', () => ({
  installOperations: mocks.installOperations,
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
    networkId: 'undeployed',
  },
  devices: [],
  localUseCounter: record.localUseCounter,
};
/** An input every grant flow accepts: the account with a scope and a grant id. */
const grantCall: IssueGrantInput & RevokeGrantInput = {
  account: deviceCall.account,
  devices: [],
  localUseCounter: record.localUseCounter,
  grantId: GrantId('ab'.repeat(32)),
  scope: {
    grantee: { scheme: 'jubjub-schnorr', publicKey: 'cd'.repeat(32) },
    operations: ['withdraw-unshielded'],
    color: TokenColor('00'.repeat(32)),
    recipient: { kind: 'any' },
    maxCoinValue: '300',
    perCallCap: '300',
    cap: '450',
    expiresAt: null,
  },
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
const encryptionKey = {
  readerPublicKey: vi.fn(),
  createKeys: vi.fn(),
  sealToDevice: vi.fn(),
  openInbox: vi.fn(),
  sealGrant: vi.fn(),
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
  passportEncryptionKey: encryptionKey,
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
      encryptionKey,
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
      encryptionKey,
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
      encryptionKey,
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
      encryptionKey,
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
  it('maps the five seams onto the contract fields', () => {
    expect(
      createDependencies({
        authoriser,
        encryptionKey,
        sponsor,
        prover,
        network,
      }),
    ).toMatchObject({
      passportAuthoriser: authoriser,
      passportEncryptionKey: encryptionKey,
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
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    mocks.createAccount.mockResolvedValue('created');
    const { passportFlows } = createDependencies({
      authoriser,
      encryptionKey,
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
          passportEncryptionKey: encryptionKey,
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
    await expect(accountRecords.presence()).resolves.toBe('absent');
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

  it('wires the flows to an injected record store instead of the platform storage', async () => {
    const createKeyValueStorage = vi.fn();
    const accountRecordStore = {
      read: vi.fn(() => of(record)),
      write: vi.fn(() => of(void 0)),
      presence: vi.fn(() => of('complete' as const)),
    };
    const dependencies = {
      createKeyValueStorage,
      passportAuthoriser: authoriser,
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    mocks.signIn.mockResolvedValue('recognised');
    const { passportFlows } = createDependencies({
      authoriser,
      encryptionKey,
      sponsor,
      prover,
      network,
      accountRecordStore,
    });

    const events: unknown[] = [];
    passportFlows.signIn(dependencies as never).subscribe(event => {
      events.push(event);
    });
    await vi.waitFor(() => {
      expect(events).toEqual([{ type: 'done', result: 'recognised' }]);
    });

    const [{ accountRecords }] = mocks.signIn.mock.calls[0] as unknown as [
      FlowContext,
    ];
    await expect(accountRecords.read()).resolves.toEqual(record);
    await expect(accountRecords.presence()).resolves.toBe('complete');
    await accountRecords.write(record);
    expect(accountRecordStore.write).toHaveBeenCalledExactlyOnceWith(record);
    expect(createKeyValueStorage).not.toHaveBeenCalled();
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
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    mocks.signIn.mockResolvedValue('recognised');
    const { passportFlows } = createDependencies({
      authoriser: authoriserWithoutStorageKey,
      encryptionKey,
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
        passportEncryptionKey: encryptionKey,
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
        passportEncryptionKey: encryptionKey,
        passportSponsor: sponsor,
        passportProver: prover,
        passportNetwork: network,
      };
      flow.mockResolvedValue('accepted');
      const { passportFlows } = createDependencies({
        authoriser: authoriserWithoutStorageKey,
        encryptionKey,
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
          passportEncryptionKey: encryptionKey,
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
      await expect(accountRecords.presence()).resolves.toBe('complete');
    },
  );

  it.each([
    ['issueGrant', mocks.issueGrant],
    ['revokeGrant', mocks.revokeGrant],
    ['revokeAllGrants', mocks.revokeAllGrants],
  ] as const)(
    'wires %s to the seams, the call input, the relying party id, and a record store that errors on a sealed record with no storage key',
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
        passportEncryptionKey: encryptionKey,
        passportSponsor: sponsor,
        passportProver: prover,
        passportNetwork: network,
      };
      flow.mockResolvedValue('accepted');
      const { passportFlows } = createDependencies({
        authoriser: authoriserWithoutStorageKey,
        encryptionKey,
        sponsor,
        prover,
        network,
        rpId: 'lace.io',
      });

      const events: unknown[] = [];
      passportFlows[name](grantCall, dependencies as never).subscribe(event => {
        events.push(event);
      });
      await vi.waitFor(() => {
        expect(events).toEqual([{ type: 'done', result: 'accepted' }]);
      });

      expect(flow).toHaveBeenCalledExactlyOnceWith(grantCall, {
        seams: {
          passportAuthoriser: authoriserWithoutStorageKey,
          passportEncryptionKey: encryptionKey,
          passportSponsor: sponsor,
          passportProver: prover,
          passportNetwork: network,
        },
        accountRecords: expect.any(Object) as unknown,
        onProgress: expect.any(Function) as unknown,
        rpId: 'lace.io',
      });
      const [, { accountRecords }] = flow.mock.calls[0] as unknown as [
        unknown,
        FlowContext,
      ];
      await expect(accountRecords.read()).rejects.toThrow(
        RecordUnreadableError,
      );
    },
  );

  it('wires readShieldedHoldings to the seams, the account, and a record store that reads a sealed record with no storage key as absent', async () => {
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
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    };
    const walked = { holdings: [], skippedEntries: 0 };
    mocks.readShieldedHoldings.mockResolvedValue(walked);
    const { passportFlows } = createDependencies({
      authoriser: authoriserWithoutStorageKey,
      encryptionKey,
      sponsor,
      prover,
      network,
      rpId: 'lace.io',
    });

    const events: unknown[] = [];
    passportFlows
      .readShieldedHoldings(
        { account: deviceCall.account },
        dependencies as never,
      )
      .subscribe(event => {
        events.push(event);
      });
    await vi.waitFor(() => {
      expect(events).toEqual([{ type: 'done', result: walked }]);
    });

    expect(mocks.readShieldedHoldings).toHaveBeenCalledExactlyOnceWith(
      { account: deviceCall.account },
      {
        seams: {
          passportAuthoriser: authoriserWithoutStorageKey,
          passportEncryptionKey: encryptionKey,
          passportSponsor: sponsor,
          passportProver: prover,
          passportNetwork: network,
        },
        accountRecords: expect.any(Object) as unknown,
        onProgress: expect.any(Function) as unknown,
        rpId: 'lace.io',
      },
    );
    const [, { accountRecords }] = mocks.readShieldedHoldings.mock
      .calls[0] as unknown as [unknown, FlowContext];
    await expect(accountRecords.read()).resolves.toBeUndefined();
  });

  it('wires installOperations to the seams, the account and the operations it installs', async () => {
    const operations = ['withdraw_unshielded_with_grant_k256'];
    const installed = { operations };
    mocks.installOperations.mockResolvedValue(installed);
    const { passportFlows } = createDependencies({
      authoriser,
      encryptionKey,
      sponsor,
      prover,
      network,
      rpId: 'lace.io',
    });

    const { events } = collect(
      passportFlows.installOperations(
        { account: deviceCall.account, operations },
        createFlowRunnerDependencies() as never,
      ),
    );
    await vi.waitFor(() => {
      expect(events).toEqual([{ type: 'done', result: installed }]);
    });

    expect(mocks.installOperations).toHaveBeenCalledExactlyOnceWith(
      { account: deviceCall.account, operations },
      {
        seams: {
          passportAuthoriser: authoriser,
          passportEncryptionKey: encryptionKey,
          passportSponsor: sponsor,
          passportProver: prover,
          passportNetwork: network,
        },
        accountRecords: expect.any(Object) as unknown,
        onProgress: expect.any(Function) as unknown,
        rpId: 'lace.io',
      },
    );
  });

  it('leaves the relying party id undefined where the page has no hostname to default to', async () => {
    mocks.signIn.mockResolvedValue('recognised');
    const { passportFlows } = createDependencies({
      authoriser,
      encryptionKey,
      sponsor,
      prover,
      network,
    });

    passportFlows.signIn(createFlowRunnerDependencies() as never).subscribe();
    await vi.waitFor(() => {
      expect(mocks.signIn).toHaveBeenCalledOnce();
    });

    expect(mocks.signIn).toHaveBeenCalledWith(
      expect.objectContaining({ rpId: undefined }),
    );
  });
});
