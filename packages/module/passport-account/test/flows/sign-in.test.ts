import {
  AccountContractMissingError,
  AccountNotFoundError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  RecordUnreadableError,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn } from '../../src/flows/sign-in';

import type {
  AccountRecords,
  FlowContext,
  FlowStage,
} from '../../src/flows/types';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type { PassportAuthoriser } from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
}));

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../src/acc/acc-module', () => ({
  ledger: mocks.ledger,
}));

const accountAddress = 'ac'.repeat(32);
const devicePublicKey = { x: 1n, y: 2n };
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const contractState = { data: 'charged-state' };
const record: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '2',
};

const commitmentFor = (counter: bigint): string =>
  counter.toString(16).padStart(64, '0');

const ledgerStateFor = (liveCounters: bigint[], entries?: string[]) => {
  const localEntries = liveCounters.map(commitmentFor);
  const live = new Set(localEntries);
  const roster = entries ?? localEntries;
  return {
    device_epoch: 1n,
    auth_nonce: 7n,
    devices: {
      member: vi.fn((entry: Uint8Array) =>
        live.has(HexBytes.fromByteArray(entry)),
      ),
      [Symbol.iterator]: (): Iterator<Uint8Array> =>
        roster.map(hex => ByteArray.fromHex(HexBytes(hex)))[Symbol.iterator](),
    },
  };
};

const createAccountRecords = (stored?: PassportAccountRecord) => {
  let current = stored;
  const records: AccountRecords = {
    read: vi.fn(async () => current),
    write: vi.fn(async (next: PassportAccountRecord) => {
      current = next;
    }),
    exists: vi.fn(async () => current !== undefined),
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
    deviceCommitment: vi.fn(
      async (_account: unknown, _epoch: unknown, counter: bigint) =>
        DeviceCommitmentHex(commitmentFor(counter)),
    ),
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
  return { authoriser, withKeySession, accountRecords, stages, context };
};

const queryContractState = vi.fn(async () => contractState);

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockResolvedValue(contractState);
    mocks.createIndexerClient.mockReturnValue({ queryContractState });
    mocks.ledger.mockReturnValue(ledgerStateFor([2n]));
  });

  it('recognises the persisted account from live chain state and returns the RecognisedAccount shape', async () => {
    const { context, stages } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toEqual({
      account: {
        address: accountAddress,
        bindingVersion: record.bindingVersion,
        status: 'ready',
      },
      devices: [{ commitmentHex: commitmentFor(2n), isLocal: true }],
      localUseCounter: '2',
    });
    expect(stages).toEqual([]);
    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(queryContractState).toHaveBeenCalledExactlyOnceWith(accountAddress);
    expect(mocks.ledger).toHaveBeenCalledExactlyOnceWith(contractState.data);
  });

  it('restores every entry of the on-chain device set, with only the local one marked', async () => {
    const remoteA = '11'.repeat(32);
    const remoteB = '22'.repeat(32);
    mocks.ledger.mockReturnValue(
      ledgerStateFor([2n], [remoteA, commitmentFor(2n), remoteB]),
    );
    const { context } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toMatchObject({
      devices: [
        { commitmentHex: remoteA, isLocal: false },
        { commitmentHex: commitmentFor(2n), isLocal: true },
        { commitmentHex: remoteB, isLocal: false },
      ],
    });
  });

  it('marks the local device by its commitment, not by its position in the set', async () => {
    const remoteA = '33'.repeat(32);
    const remoteB = '44'.repeat(32);
    mocks.ledger.mockReturnValue(
      ledgerStateFor([2n], [remoteA, remoteB, commitmentFor(2n)]),
    );
    const { context } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toMatchObject({
      devices: [
        { commitmentHex: remoteA, isLocal: false },
        { commitmentHex: remoteB, isLocal: false },
        { commitmentHex: commitmentFor(2n), isLocal: true },
      ],
    });
  });

  it('restores an advanced counter through the rescan', async () => {
    mocks.ledger.mockReturnValue(ledgerStateFor([5n]));
    const { context, authoriser } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toMatchObject({
      localUseCounter: '5',
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(4);
    expect(authoriser.deviceCommitment).toHaveBeenNthCalledWith(
      1,
      accountAddress,
      1n,
      2n,
    );
  });

  it('writes the healed use counter back to the account record before resolving', async () => {
    mocks.ledger.mockReturnValue(ledgerStateFor([5n]));
    const { context, accountRecords } = createContext({ stored: record });
    let release!: () => void;
    vi.mocked(accountRecords.write).mockImplementation(
      async () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
    );

    const signedIn = signIn(context);
    await vi.waitFor(() => {
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith({
        ...record,
        localUseCounter: '5',
      });
    });
    await expect(
      Promise.race([signedIn, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    release();
    await expect(signedIn).resolves.toMatchObject({ localUseCounter: '5' });
  });

  it('rejects with AccountContractMissingError for a dead or unknown contract', async () => {
    const { context, authoriser, accountRecords } = createContext({
      stored: record,
    });
    queryContractState.mockResolvedValueOnce(null as never);

    await expect(signIn(context)).rejects.toThrow(AccountContractMissingError);
    expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountNotFoundError for a missing record', async () => {
    const { context, authoriser } = createContext();

    await expect(signIn(context)).rejects.toThrow(AccountNotFoundError);
    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('rejects with the failure the record read raises, before the chain is consulted', async () => {
    const { context, accountRecords } = createContext({ stored: record });
    vi.mocked(accountRecords.read).mockRejectedValue(
      new RecordUnreadableError(),
    );

    await expect(signIn(context)).rejects.toThrow(RecordUnreadableError);
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('rejects with the cancelled ceremony before anything is read', async () => {
    const { context, authoriser, accountRecords } = createContext({
      stored: record,
    });
    authoriser.devicePublicKey.mockRejectedValue(new CeremonyCancelledError());

    await expect(signIn(context)).rejects.toThrow(CeremonyCancelledError);
    expect(accountRecords.read).not.toHaveBeenCalled();
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('rejects with a generic chain failure unchanged', async () => {
    const { context } = createContext({ stored: record });
    const failure = new Error('indexer down');
    queryContractState.mockRejectedValueOnce(failure);

    await expect(signIn(context)).rejects.toBe(failure);
  });

  it('runs the whole flow inside one key session when the authoriser exposes one', async () => {
    const { context, authoriser, withKeySession, accountRecords } =
      createContext({ keySession: true, stored: record });
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
      return record;
    });

    await signIn(context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(readInSession).toEqual([true]);
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toMatchObject({
      localUseCounter: '2',
    });
    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('rejects with a failure raised inside the key session', async () => {
    const { context, withKeySession } = createContext({
      keySession: true,
      stored: record,
    });
    queryContractState.mockRejectedValueOnce(new Error('node unreachable'));

    await expect(signIn(context)).rejects.toThrow('node unreachable');
    expect(withKeySession).toHaveBeenCalledOnce();
  });
});
