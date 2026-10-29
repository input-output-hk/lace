import {
  AccountExistsError,
  ArtefactIntegrityError,
  AuthorityRetiredError,
  CeremonyCancelledError,
  CreationArtefactMismatchError,
  CreationLockMismatchError,
  DeviceCommitmentHex,
  SponsorExhaustedError,
  UseCounter,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeDevicePublicKey } from '../../src/acc/envelopes';
import { accManifest } from '../../src/acc/manifest';
import { JubjubDevice } from '../../src/acc/signer';
import { createAccount } from '../../src/flows/create-account';

import type { PendingDeployment } from '../../src/acc/deploy';
import type * as AccountCall from '../../src/flows/account-call';
import type {
  AccountRecords,
  FlowContext,
  FlowStage,
  RecordPresence,
} from '../../src/flows/types';
import type { MidnightProviderStage } from '../../src/infra/providers';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type {
  PassportAuthoriser,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  deployAccount: vi.fn(),
  resumeAccountDeployment: vi.fn(),
  createMidnightProviders: vi.fn(),
  readAccountLedger: vi.fn(),
  queryAccountLedger: vi.fn(),
  submitAccountCall: vi.fn(),
}));

vi.mock('../../src/acc/deploy', () => ({
  deployAccount: mocks.deployAccount,
  resumeAccountDeployment: mocks.resumeAccountDeployment,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));
vi.mock('../../src/flows/account-call', async importOriginal => ({
  ...(await importOriginal<typeof AccountCall>()),
  readAccountLedger: mocks.readAccountLedger,
  queryAccountLedger: mocks.queryAccountLedger,
  submitAccountCall: mocks.submitAccountCall,
}));

const accountAddress = 'ac'.repeat(32);
const commitmentHex = 'ab'.repeat(32);
const localKey = new JubjubDevice(9n);
const devicePublicKey = localKey.pk;
const devicePublicKeyHex = encodeDevicePublicKey(devicePublicKey);
const readerPublicKey = new Uint8Array(32).fill(5);
const encPublicKey = new Uint8Array(32).fill(2);
const envelope = new Uint8Array(192).fill(0xd1);
const registration = new Uint8Array(192).fill(0xd2);
const authority = { tag: 'schnorr' as const, value: 'a7'.repeat(32) };
const keyEntries = [envelope, registration].map(entry =>
  HexBytes.fromByteArray(entry),
);
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const providers = { publicDataProvider: 'public-data' };
const indexer = { tag: 'indexer' };
const deploymentProgress: Omit<PendingDeployment, 'keyEntries'> = {
  operations: ['deposit_unshielded', 'deposit_shielded'],
  lockAccount: true,
  verifierKeysDigest: 'f0'.repeat(32),
  saltHex: '07'.repeat(32),
  authorityKey: { tag: 'schnorr', value: 'authority-key' },
  handoverAuthority: authority,
};
const pendingDeployment: PendingDeployment = {
  ...deploymentProgress,
  keyEntries,
};
const expectedRecord = (localUseCounter = '2'): PassportAccountRecord => ({
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter,
});
const expectedPendingRecord = (
  localUseCounter = '0',
): PassportAccountRecord => ({
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter,
  deployment: pendingDeployment,
});
const storedRecord: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};
const storedPendingRecord: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter: '0',
  deployment: pendingDeployment,
};

/** The account's ledger as the indexer serves it, holding these entries. */
const ledgerHolding = (held: Uint8Array[], authNonce: bigint) => ({
  enc_key: encPublicKey,
  auth_nonce: authNonce,
  device_epoch: 0n,
  inbox_count: BigInt(held.length),
  inbox: {
    member: (ordinal: bigint) => ordinal < BigInt(held.length),
    lookup: (ordinal: bigint) => held[Number(ordinal)],
  },
});

const presenceOf = (record?: PassportAccountRecord): RecordPresence => {
  if (record === undefined) return 'absent';
  return record.deployment === undefined ? 'complete' : 'pending';
};

const createAccountRecords = (stored?: PassportAccountRecord) => {
  let record = stored;
  const records: AccountRecords = {
    read: vi.fn(async () => record),
    write: vi.fn(async (next: PassportAccountRecord) => {
      record = next;
    }),
    presence: vi.fn(async () => presenceOf(record)),
  };
  return records;
};

const createContext = ({
  keySession = false,
  stored,
}: { keySession?: boolean; stored?: PassportAccountRecord } = {}) => {
  const withKeySession = vi.fn(async (operation: () => Promise<unknown>) =>
    operation(),
  );
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(async () => devicePublicKey),
    deviceCommitment: vi.fn(async () => DeviceCommitmentHex(commitmentHex)),
    authorise: vi.fn(),
    withKeySession: keySession
      ? (withKeySession as PassportAuthoriser['withKeySession'])
      : undefined,
  };
  const encryptionKey = {
    readerPublicKey: vi.fn(async () => readerPublicKey),
    createKeys: vi.fn<PassportEncryptionKey['createKeys']>(async () => ({
      encKey: encPublicKey,
      envelopes: [envelope],
      registrations: [registration],
      authority,
    })),
    sealToDevice: vi.fn(),
    openInbox: vi.fn(),
    sealGrant: vi.fn(),
  };
  const sponsor = { balanceAndSign: vi.fn() };
  const prover = { prove: vi.fn(), check: vi.fn() };
  const accountRecords = createAccountRecords(stored);
  const stages: FlowStage[] = [];
  const context: FlowContext = {
    seams: {
      passportAuthoriser: authoriser,
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    },
    accountRecords,
    onProgress: stage => {
      stages.push(stage);
    },
    rpId: 'lace.io',
  };
  return {
    authoriser,
    withKeySession,
    encryptionKey,
    sponsor,
    prover,
    accountRecords,
    stages,
    context,
  };
};

type OnDeployed = (
  address: string,
  pending: Omit<PendingDeployment, 'keyEntries'>,
) => Promise<void>;

/** The commitment this device holds after the appends advanced it to `counter`. */
const commitmentAt = (counter: number): string =>
  counter.toString(16).padStart(2, '0').repeat(32);

const readyAccount = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  status: 'ready',
  networkId: 'undeployed',
};

describe('createAccount', () => {
  let activate: ReturnType<typeof vi.fn>;
  let held: Uint8Array[];
  let authNonce: bigint;
  let counter: number;
  const deployedAccount = (isActivated = false) => ({
    address: accountAddress,
    salt: new Uint8Array(32),
    isActivated,
    activate,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    held = [];
    authNonce = 0n;
    counter = 0;
    activate = vi.fn(async () => ({ txId: 'activation-tx' }));
    mocks.createMidnightProviders.mockImplementation(async () => providers);
    mocks.deployAccount.mockImplementation(
      async ({ onDeployed }: { onDeployed: OnDeployed }) => {
        await onDeployed(accountAddress, deploymentProgress);
        return deployedAccount();
      },
    );
    mocks.resumeAccountDeployment.mockImplementation(async () =>
      deployedAccount(),
    );
    mocks.readAccountLedger.mockImplementation(async () => ({
      indexer,
      ledgerState: ledgerHolding(held, authNonce),
    }));
    mocks.queryAccountLedger.mockImplementation(async () => {
      authNonce += 1n;
      return ledgerHolding(held, authNonce);
    });
    mocks.submitAccountCall.mockImplementation(async () => {
      counter += 1;
      return {
        advancedCounter: UseCounter(BigInt(counter)),
        localCommitmentHex: commitmentAt(counter),
      };
    });
  });

  it('resolves the ready account with this device on the entry the key appends left it on, and the enc_key', async () => {
    const { context, authoriser, sponsor, prover } = createContext();

    await expect(
      createAccount({ lockAccount: true }, context),
    ).resolves.toEqual({
      account: readyAccount,
      devices: [{ commitmentHex: commitmentAt(2), isLocal: true }],
      localUseCounter: '2',
      grants: [],
      encKey: HexBytes.fromByteArray(encPublicKey),
    });

    expect(mocks.createMidnightProviders).toHaveBeenCalledExactlyOnceWith({
      network,
      prover,
      sponsor,
      onStage: expect.any(Function) as unknown,
    });
    expect(mocks.deployAccount).toHaveBeenCalledExactlyOnceWith({
      providers,
      authoriser,
      encPublicKey,
      lockAccount: true,
      handoverAuthority: authority,
      sponsorReady: expect.any(Function) as unknown,
      onDeployed: expect.any(Function) as unknown,
    });
    expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
    expect(activate).toHaveBeenCalledOnce();
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
      0n,
      0n,
    );
  });

  it('draws the account keys for this device before the deploy and deploys with their enc_key', async () => {
    const { context, encryptionKey } = createContext();

    await createAccount({ lockAccount: true }, context);

    expect(encryptionKey.readerPublicKey).toHaveBeenCalledExactlyOnceWith(
      'undeployed',
    );
    expect(encryptionKey.createKeys).toHaveBeenCalledExactlyOnceWith(
      'undeployed',
      { devicePublicKey: devicePublicKeyHex },
    );
    expect(encryptionKey.createKeys.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deployAccount.mock.invocationCallOrder[0],
    );
  });

  it('hands the deploy the sponsor readiness to await before building each transaction', async () => {
    const { context, sponsor } = createContext();
    const ready = vi.fn(async () => undefined);
    context.seams.passportSponsor = { ...sponsor, ready };
    mocks.deployAccount.mockImplementation(
      async ({
        onDeployed,
        sponsorReady,
      }: {
        onDeployed: OnDeployed;
        sponsorReady: () => Promise<void>;
      }) => {
        expect(ready).not.toHaveBeenCalled();
        await sponsorReady();
        await onDeployed(accountAddress, deploymentProgress);
        return deployedAccount();
      },
    );

    await createAccount({ lockAccount: true }, context);

    expect(ready).toHaveBeenCalledOnce();
  });

  it('builds at once for a sponsor that needs no setup', async () => {
    const { context } = createContext();
    mocks.deployAccount.mockImplementation(
      async ({
        onDeployed,
        sponsorReady,
      }: {
        onDeployed: OnDeployed;
        sponsorReady: () => Promise<void>;
      }) => {
        await expect(sponsorReady()).resolves.toBeUndefined();
        await onDeployed(accountAddress, deploymentProgress);
        return deployedAccount();
      },
    );

    await expect(
      createAccount({ lockAccount: true }, context),
    ).resolves.toMatchObject({ account: readyAccount });
  });

  it('appends this device envelope and registration once active, one gated call each', async () => {
    const { context } = createContext();

    await createAccount({ lockAccount: true }, context);

    expect(mocks.submitAccountCall).toHaveBeenCalledTimes(2);
    expect(mocks.submitAccountCall).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        circuit: 'append_inbox_with_jubjub',
        args: [envelope],
        localUseCounter: '0',
      }),
      context.seams,
    );
    expect(mocks.submitAccountCall).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        circuit: 'append_inbox_with_jubjub',
        args: [registration],
        localUseCounter: '1',
      }),
      context.seams,
    );
    expect(activate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.submitAccountCall.mock.invocationCallOrder[0],
    );
  });

  it('records the pending deployment with its key entries, keeps it while the entries land, then completes the record', async () => {
    const { context, accountRecords } = createContext();

    await createAccount({ lockAccount: true }, context);

    expect(vi.mocked(accountRecords.write).mock.calls).toEqual([
      [expectedPendingRecord('0')],
      [expectedPendingRecord('1')],
      [expectedPendingRecord('2')],
      [expectedRecord('2')],
    ]);
  });

  it('holds the next wave until the pending record is durable', async () => {
    const { context, accountRecords } = createContext();
    let release!: () => void;
    vi.mocked(accountRecords.write).mockImplementationOnce(
      async () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
    );
    let isRecorded = false;
    mocks.deployAccount.mockImplementation(
      async ({ onDeployed }: { onDeployed: OnDeployed }) => {
        await onDeployed(accountAddress, deploymentProgress);
        isRecorded = true;
        return deployedAccount();
      },
    );

    const created = createAccount({ lockAccount: true }, context);
    await vi.waitFor(() => {
      expect(accountRecords.write).toHaveBeenCalledOnce();
    });
    expect(isRecorded).toBe(false);

    release();
    await created;
    expect(isRecorded).toBe(true);
  });

  it('rejects with a failed key creation before anything is deployed', async () => {
    const { context, encryptionKey, accountRecords, stages } = createContext();
    encryptionKey.createKeys.mockRejectedValue(new CeremonyCancelledError());

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(CeremonyCancelledError);

    expect(stages).toEqual(['deploying']);
    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects when the deployment never reports its progress, since its key entries would go unrecorded', async () => {
    const { context } = createContext();
    mocks.deployAccount.mockImplementation(async () => deployedAccount());

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow('The deployment landed without reporting its progress.');
    expect(activate).not.toHaveBeenCalled();
  });

  it('reports deploying, the stages the providers report, activating, then recording, in order', async () => {
    const { context, stages } = createContext();
    let onStage: ((stage: MidnightProviderStage) => void) | undefined;
    mocks.createMidnightProviders.mockImplementation(
      async ({
        onStage: reportStage,
      }: {
        onStage?: (stage: MidnightProviderStage) => void;
      }) => {
        onStage = reportStage;
        return providers;
      },
    );
    mocks.deployAccount.mockImplementation(
      async ({ onDeployed }: { onDeployed: OnDeployed }) => {
        onStage?.('proving');
        onStage?.('sponsoring');
        await onDeployed(accountAddress, deploymentProgress);
        onStage?.('proving');
        onStage?.('sponsoring');
        return deployedAccount();
      },
    );

    await createAccount({ lockAccount: false }, context);

    expect(stages).toEqual([
      'deploying',
      'proving',
      'sponsoring',
      'proving',
      'sponsoring',
      'activating',
      'recording',
    ]);
  });

  it('writes the completed record before resolving', async () => {
    const { context, accountRecords } = createContext();
    let release!: () => void;
    vi.mocked(accountRecords.write)
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(
        async () =>
          new Promise<void>(resolve => {
            release = resolve;
          }),
      );

    const created = createAccount({ lockAccount: false }, context);
    await vi.waitFor(() => {
      expect(accountRecords.write).toHaveBeenLastCalledWith(expectedRecord());
    });
    await expect(
      Promise.race([created, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    release();
    await expect(created).resolves.toMatchObject({ localUseCounter: '2' });
  });

  it('hands an unlocked deployment the authority the delivered roster key derives and records it as the handover', async () => {
    const { context, accountRecords } = createContext();
    mocks.deployAccount.mockImplementationOnce(
      async ({
        onDeployed,
        handoverAuthority,
      }: {
        onDeployed: OnDeployed;
        handoverAuthority: PendingDeployment['handoverAuthority'];
      }) => {
        await onDeployed(accountAddress, {
          ...deploymentProgress,
          lockAccount: false,
          handoverAuthority,
        });
        return deployedAccount();
      },
    );

    await createAccount({ lockAccount: false }, context);

    expect(mocks.deployAccount).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        lockAccount: false,
        handoverAuthority: authority,
      }),
    );
    expect(accountRecords.write).toHaveBeenNthCalledWith(1, {
      ...expectedPendingRecord(),
      deployment: { ...pendingDeployment, lockAccount: false },
    });
  });

  it.each([true, false])(
    'passes lockAccount %s through to the deployment',
    async lockAccount => {
      const { context } = createContext();

      await createAccount({ lockAccount }, context);

      expect(mocks.deployAccount).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ lockAccount }),
      );
    },
  );

  it('rejects with AccountExistsError over a completed record before any ceremony, read or deploy', async () => {
    const {
      context,
      authoriser,
      withKeySession,
      encryptionKey,
      accountRecords,
    } = createContext({ keySession: true, stored: storedRecord });

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(AccountExistsError);

    expect(accountRecords.presence).toHaveBeenCalledOnce();
    expect(accountRecords.read).not.toHaveBeenCalled();
    expect(withKeySession).not.toHaveBeenCalled();
    expect(authoriser.devicePublicKey).not.toHaveBeenCalled();
    expect(encryptionKey.readerPublicKey).not.toHaveBeenCalled();
    expect(encryptionKey.createKeys).not.toHaveBeenCalled();
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountExistsError over a pending record this authoriser cannot open', async () => {
    const { context, authoriser, accountRecords } = createContext({
      stored: storedPendingRecord,
    });
    vi.mocked(accountRecords.read).mockResolvedValue(undefined);

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(AccountExistsError);

    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(accountRecords.read).toHaveBeenCalledOnce();
    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountExistsError over a record marked pending that opens as completed', async () => {
    const { context, accountRecords } = createContext({
      stored: storedRecord,
    });
    vi.mocked(accountRecords.presence).mockResolvedValue('pending');

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(AccountExistsError);

    expect(accountRecords.read).toHaveBeenCalledOnce();
    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('refuses to resume a pending record read with only the marker of its creation', async () => {
    const { context, accountRecords } = createContext({
      stored: {
        ...storedPendingRecord,
        deployment: { keyEntries },
      },
    });

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow('cannot be resumed');

    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('skips the record read when no record is stored', async () => {
    const { context, accountRecords } = createContext();

    await createAccount({ lockAccount: false }, context);

    expect(accountRecords.presence).toHaveBeenCalledOnce();
    expect(accountRecords.read).not.toHaveBeenCalled();
  });

  describe('over a creation interrupted after the deploy', () => {
    it('resumes the recorded deployment with its recorded keys instead of drawing new ones', async () => {
      const { context, authoriser, encryptionKey, accountRecords } =
        createContext({ stored: storedPendingRecord });

      await expect(
        createAccount({ lockAccount: true }, context),
      ).resolves.toEqual({
        account: readyAccount,
        devices: [{ commitmentHex: commitmentAt(2), isLocal: true }],
        localUseCounter: '2',
        grants: [],
        encKey: HexBytes.fromByteArray(encPublicKey),
      });

      expect(mocks.resumeAccountDeployment).toHaveBeenCalledExactlyOnceWith({
        providers,
        authoriser,
        address: accountAddress,
        pending: pendingDeployment,
        sponsorReady: expect.any(Function) as unknown,
      });
      expect(mocks.deployAccount).not.toHaveBeenCalled();
      expect(encryptionKey.createKeys).not.toHaveBeenCalled();
      expect(activate).toHaveBeenCalledOnce();
      expect(mocks.submitAccountCall).toHaveBeenCalledTimes(2);
      await expect(accountRecords.read()).resolves.toEqual(expectedRecord());
    });

    it('hands the resumed waves the sponsor readiness', async () => {
      const { context, sponsor } = createContext({
        stored: storedPendingRecord,
      });
      const ready = vi.fn(async () => undefined);
      context.seams.passportSponsor = { ...sponsor, ready };
      mocks.resumeAccountDeployment.mockImplementation(
        async ({ sponsorReady }: { sponsorReady: () => Promise<void> }) => {
          await sponsorReady();
          return deployedAccount();
        },
      );

      await createAccount({ lockAccount: true }, context);

      expect(ready).toHaveBeenCalledOnce();
    });

    it('refuses a request under another lock choice than the recorded one before any wave, naming the recorded choice', async () => {
      const unlocked: PassportAccountRecord = {
        ...storedPendingRecord,
        deployment: { ...pendingDeployment, lockAccount: false },
      };
      const { context, accountRecords, stages } = createContext({
        stored: unlocked,
      });

      await expect(
        createAccount({ lockAccount: true }, context),
      ).rejects.toThrow(
        new CreationLockMismatchError(
          'The unfinished Passport account creation was started with lockAccount false; resume it with the same lock choice.',
        ),
      );

      expect(stages).toEqual([]);
      expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
      expect(mocks.resumeAccountDeployment).not.toHaveBeenCalled();
      expect(mocks.deployAccount).not.toHaveBeenCalled();
      expect(mocks.submitAccountCall).not.toHaveBeenCalled();
      expect(accountRecords.write).not.toHaveBeenCalled();
      await expect(accountRecords.read()).resolves.toEqual(unlocked);
    });

    it('rejects with the artefact mismatch unchanged and keeps the pending record', async () => {
      const { context, accountRecords } = createContext({
        stored: storedPendingRecord,
      });
      const failure = new CreationArtefactMismatchError();
      mocks.resumeAccountDeployment.mockRejectedValue(failure);

      await expect(createAccount({ lockAccount: true }, context)).rejects.toBe(
        failure,
      );

      expect(activate).not.toHaveBeenCalled();
      expect(mocks.submitAccountCall).not.toHaveBeenCalled();
      expect(accountRecords.write).not.toHaveBeenCalled();
      await expect(accountRecords.read()).resolves.toEqual(storedPendingRecord);
    });

    it('appends only the key entries the inbox still lacks, from the counter the record kept', async () => {
      const { context, authoriser } = createContext({
        stored: { ...storedPendingRecord, localUseCounter: '1' },
      });
      held = [envelope];
      counter = 1;
      mocks.resumeAccountDeployment.mockImplementation(async () =>
        deployedAccount(true),
      );

      await expect(
        createAccount({ lockAccount: true }, context),
      ).resolves.toMatchObject({ localUseCounter: '2' });

      expect(mocks.submitAccountCall).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          args: [registration],
          localUseCounter: '1',
        }),
        context.seams,
      );
      expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
        accountAddress,
        0n,
        1n,
      );
    });

    it('completes the record alone when the chain holds the account activated with its key entries', async () => {
      const { context, accountRecords, stages } = createContext({
        stored: storedPendingRecord,
      });
      held = [envelope, registration];
      mocks.resumeAccountDeployment.mockImplementation(async () =>
        deployedAccount(true),
      );

      await expect(
        createAccount({ lockAccount: true }, context),
      ).resolves.toEqual({
        account: readyAccount,
        devices: [{ commitmentHex, isLocal: true }],
        localUseCounter: '0',
        grants: [],
        encKey: HexBytes.fromByteArray(encPublicKey),
      });

      expect(stages).toEqual(['deploying']);
      expect(activate).not.toHaveBeenCalled();
      expect(mocks.submitAccountCall).not.toHaveBeenCalled();
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        expectedRecord('0'),
      );
    });

    it('reports deploying, activating and recording around the resumed waves', async () => {
      const { context, stages } = createContext({
        stored: storedPendingRecord,
      });

      await createAccount({ lockAccount: true }, context);

      expect(stages).toEqual(['deploying', 'activating', 'recording']);
    });

    it('rejects with the retired authority unchanged and keeps the pending record', async () => {
      const { context, accountRecords, stages } = createContext({
        stored: storedPendingRecord,
      });
      const failure = new AuthorityRetiredError();
      mocks.resumeAccountDeployment.mockRejectedValue(failure);

      await expect(createAccount({ lockAccount: true }, context)).rejects.toBe(
        failure,
      );

      expect(stages).toEqual(['deploying']);
      expect(activate).not.toHaveBeenCalled();
      expect(accountRecords.write).not.toHaveBeenCalled();
      await expect(accountRecords.read()).resolves.toEqual(storedPendingRecord);
    });

    it('keeps the pending record when the resumed activation fails', async () => {
      const { context, accountRecords } = createContext({
        stored: storedPendingRecord,
      });
      activate.mockRejectedValue(new Error('ttl expired'));

      await expect(
        createAccount({ lockAccount: true }, context),
      ).rejects.toThrow('ttl expired');

      expect(accountRecords.write).not.toHaveBeenCalled();
    });

    it('keeps the pending deployment when an append fails, so the next attempt resumes it', async () => {
      const { context, accountRecords } = createContext({
        stored: storedPendingRecord,
      });
      mocks.submitAccountCall
        .mockImplementationOnce(async () => ({
          advancedCounter: UseCounter(1n),
          localCommitmentHex: commitmentAt(1),
        }))
        .mockRejectedValueOnce(new Error('node unreachable'));

      await expect(
        createAccount({ lockAccount: true }, context),
      ).rejects.toThrow('node unreachable');

      await expect(accountRecords.read()).resolves.toEqual(
        expectedPendingRecord('1'),
      );
    });

    it('reads the record inside the key session', async () => {
      const { context, withKeySession, accountRecords } = createContext({
        keySession: true,
        stored: storedPendingRecord,
      });
      let isSessionOpen = false;
      withKeySession.mockImplementation(async operation => {
        isSessionOpen = true;
        try {
          return await operation();
        } finally {
          isSessionOpen = false;
        }
      });
      const readInSession: boolean[] = [];
      vi.mocked(accountRecords.read).mockImplementation(async () => {
        readInSession.push(isSessionOpen);
        return storedPendingRecord;
      });

      await createAccount({ lockAccount: true }, context);

      expect(readInSession).toEqual([true]);
    });
  });

  it('rejects with the cancelled ceremony before anything is deployed', async () => {
    const { context, authoriser, accountRecords, stages } = createContext();
    authoriser.devicePublicKey.mockRejectedValue(new CeremonyCancelledError());

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(CeremonyCancelledError);

    expect(stages).toEqual([]);
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.deployAccount).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with the artefact integrity failure unchanged', async () => {
    const { context } = createContext();
    const failure = new ArtefactIntegrityError();
    mocks.createMidnightProviders.mockRejectedValue(failure);

    await expect(createAccount({ lockAccount: false }, context)).rejects.toBe(
      failure,
    );
  });

  it('rejects with the exhausted sponsor unchanged', async () => {
    const { context, accountRecords } = createContext();
    const failure = new SponsorExhaustedError();
    mocks.deployAccount.mockRejectedValue(failure);

    await expect(createAccount({ lockAccount: false }, context)).rejects.toBe(
      failure,
    );
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with an activation failure after activating was reported, keeping the pending record', async () => {
    const { context, accountRecords, stages } = createContext();
    activate.mockRejectedValue(new Error('ttl expired'));

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow('ttl expired');

    expect(stages).toEqual(['deploying', 'activating']);
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
      expectedPendingRecord('0'),
    );
  });

  it('runs the whole flow, the key creation included, inside one key session when the authoriser exposes one', async () => {
    const {
      context,
      authoriser,
      withKeySession,
      encryptionKey,
      accountRecords,
    } = createContext({ keySession: true });
    let isSessionOpen = false;
    withKeySession.mockImplementation(async operation => {
      isSessionOpen = true;
      try {
        return await operation();
      } finally {
        isSessionOpen = false;
      }
    });
    const createdInSession: boolean[] = [];
    encryptionKey.createKeys.mockImplementation(async () => {
      createdInSession.push(isSessionOpen);
      return {
        encKey: encPublicKey,
        envelopes: [envelope],
        registrations: [registration],
        authority,
      };
    });
    const writtenInSession: boolean[] = [];
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      writtenInSession.push(isSessionOpen);
    });

    await createAccount({ lockAccount: true }, context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(authoriser.deviceCommitment).toHaveBeenCalledOnce();
    expect(createdInSession).toEqual([true]);
    expect(writtenInSession).toEqual([true, true, true, true]);
  });

  it('names the create-account flow to the key session', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await createAccount({ lockAccount: true }, context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { kind: 'create-account', lockAccount: true },
    );
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(
      createAccount({ lockAccount: false }, context),
    ).resolves.toMatchObject({ localUseCounter: '2' });
    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('rejects with a failure raised inside the key session', async () => {
    const { context, withKeySession, accountRecords } = createContext({
      keySession: true,
    });
    mocks.deployAccount.mockRejectedValue(new Error('node unreachable'));

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow('node unreachable');

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });
});
