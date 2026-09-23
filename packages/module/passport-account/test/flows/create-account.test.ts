import {
  AccountExistsError,
  ArtefactIntegrityError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  SponsorExhaustedError,
} from '@lace-contract/passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { accManifest } from '../../src/acc/manifest';
import { createAccount } from '../../src/flows/create-account';

import type {
  AccountRecords,
  FlowContext,
  FlowStage,
} from '../../src/flows/types';
import type { MidnightProviderStage } from '../../src/infra/providers';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type { PassportAuthoriser } from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  deployAccount: vi.fn(),
  generateEncKeyPair: vi.fn(),
  createMidnightProviders: vi.fn(),
}));

vi.mock('../../src/acc/deploy', () => ({
  deployAccount: mocks.deployAccount,
}));
vi.mock('../../src/acc/enc-keys', () => ({
  generateEncKeyPair: mocks.generateEncKeyPair,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));

const accountAddress = 'ac'.repeat(32);
const commitmentHex = 'ab'.repeat(32);
const devicePublicKey = { x: 1n, y: 2n };
const encKeyPair = {
  publicKey: new Uint8Array(32).fill(1),
  secretKey: new Uint8Array(32).fill(2),
};
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const providers = { publicDataProvider: 'public-data' };
const expectedRecord: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: accManifest.bindingVersion,
  localUseCounter: '0',
};
const storedRecord: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const createAccountRecords = (stored?: PassportAccountRecord) => {
  let record = stored;
  const records: AccountRecords = {
    read: vi.fn(async () => record),
    write: vi.fn(async (next: PassportAccountRecord) => {
      record = next;
    }),
    exists: vi.fn(async () => record !== undefined),
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
  const sponsor = { balanceAndSign: vi.fn() };
  const prover = { prove: vi.fn(), check: vi.fn() };
  const accountRecords = createAccountRecords(stored);
  const stages: FlowStage[] = [];
  const context: FlowContext = {
    seams: {
      passportAuthoriser: authoriser,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
    },
    accountRecords,
    onProgress: stage => {
      stages.push(stage);
    },
  };
  return {
    authoriser,
    withKeySession,
    sponsor,
    prover,
    accountRecords,
    stages,
    context,
  };
};

describe('createAccount', () => {
  let activate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    activate = vi.fn(async () => ({ txId: 'activation-tx' }));
    mocks.generateEncKeyPair.mockReturnValue(encKeyPair);
    mocks.createMidnightProviders.mockImplementation(async () => providers);
    mocks.deployAccount.mockImplementation(async () => ({
      address: accountAddress,
      salt: new Uint8Array(32),
      activate,
    }));
  });

  it('resolves the ready account with the initial device marked local and counter 0', async () => {
    const { context, authoriser, sponsor, prover } = createContext();

    await expect(
      createAccount({ lockAccount: true }, context),
    ).resolves.toEqual({
      account: {
        address: accountAddress,
        bindingVersion: accManifest.bindingVersion,
        status: 'ready',
      },
      devices: [{ commitmentHex, isLocal: true }],
      localUseCounter: '0',
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
      encKeyPair,
      lockAccount: true,
    });
    expect(activate).toHaveBeenCalledOnce();
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
      0n,
      0n,
    );
  });

  it('reports deploying, the stages the providers report, then activating, in order', async () => {
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
    mocks.deployAccount.mockImplementation(async () => {
      onStage?.('proving');
      onStage?.('sponsoring');
      onStage?.('proving');
      onStage?.('sponsoring');
      return { address: accountAddress, salt: new Uint8Array(32), activate };
    });

    await createAccount({ lockAccount: false }, context);

    expect(stages).toEqual([
      'deploying',
      'proving',
      'sponsoring',
      'proving',
      'sponsoring',
      'activating',
    ]);
  });

  it('writes the record with the manifest binding version before resolving', async () => {
    const { context, accountRecords } = createContext();
    let release!: () => void;
    vi.mocked(accountRecords.write).mockImplementation(
      async () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
    );

    const created = createAccount({ lockAccount: false }, context);
    await vi.waitFor(() => {
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        expectedRecord,
      );
    });
    await expect(
      Promise.race([created, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    release();
    await expect(created).resolves.toMatchObject({ localUseCounter: '0' });
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

  it('rejects with AccountExistsError over an existing record before any ceremony runs', async () => {
    const { context, authoriser, accountRecords } = createContext({
      stored: storedRecord,
    });

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow(AccountExistsError);

    expect(authoriser.devicePublicKey).not.toHaveBeenCalled();
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
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

  it('rejects with an activation failure after activating was reported', async () => {
    const { context, accountRecords, stages } = createContext();
    activate.mockRejectedValue(new Error('ttl expired'));

    await expect(
      createAccount({ lockAccount: false }, context),
    ).rejects.toThrow('ttl expired');

    expect(stages).toEqual(['deploying', 'activating']);
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('runs the whole flow inside one key session when the authoriser exposes one', async () => {
    const { context, authoriser, withKeySession, accountRecords } =
      createContext({ keySession: true });
    let isSessionOpen = false;
    withKeySession.mockImplementation(async operation => {
      isSessionOpen = true;
      try {
        return await operation();
      } finally {
        isSessionOpen = false;
      }
    });
    const writtenInSession: boolean[] = [];
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      writtenInSession.push(isSessionOpen);
    });

    await createAccount({ lockAccount: true }, context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(authoriser.deviceCommitment).toHaveBeenCalledOnce();
    expect(writtenInSession).toEqual([true]);
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(
      createAccount({ lockAccount: false }, context),
    ).resolves.toMatchObject({ localUseCounter: '0' });
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
