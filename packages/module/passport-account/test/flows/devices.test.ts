import {
  AccountContractMissingError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  LastDeviceError,
  NotAuthorisedError,
  RemovalTargetNotFoundError,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addDevice, removeDevice } from '../../src/flows/devices';

import type { DeviceCallInput } from '../../src/flows/devices';
import type {
  AccountRecords,
  FlowContext,
  FlowStage,
} from '../../src/flows/types';
import type {
  PassportAccountInfo,
  PassportAuthoriser,
  PassportDevice,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  createMidnightProviders: vi.fn(),
  connectAccountHandle: vi.fn(),
  executeGatedCall: vi.fn(),
}));

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../src/acc/acc-module', () => ({
  ledger: mocks.ledger,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));
vi.mock('../../src/acc/gated-call', () => ({
  connectAccountHandle: mocks.connectAccountHandle,
  executeGatedCall: mocks.executeGatedCall,
}));

const accountAddress = 'ac'.repeat(32);
const localCommitment = '11'.repeat(32);
const nextLocalCommitment = '1a'.repeat(32);
const targetCommitment = '22'.repeat(32);
const joiningCommitment = '33'.repeat(32);
const deviceEpoch = 4n;
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
};
const localDevice: PassportDevice = {
  commitmentHex: localCommitment,
  isLocal: true,
};
const refreshedLocalDevice: PassportDevice = {
  commitmentHex: nextLocalCommitment,
  isLocal: true,
};
const targetDevice: PassportDevice = {
  commitmentHex: targetCommitment,
  isLocal: false,
};
const contractState = { data: 'charged-state' };
const decodedLedgerState = {
  tag: 'decoded-ledger-state',
  device_epoch: deviceEpoch,
};
const providers = { tag: 'midnight-providers' };
const handle = { callTx: {} };
const advancedRecord = {
  address: accountAddress,
  bindingVersion: account.bindingVersion,
  localUseCounter: '3',
};

const callInput = (
  overrides: Partial<DeviceCallInput> = {},
): DeviceCallInput => ({
  commitmentHex: targetCommitment,
  account,
  devices: [localDevice, targetDevice],
  localUseCounter: '2',
  ...overrides,
});

const createAccountRecords = (): AccountRecords => ({
  read: vi.fn(async () => undefined),
  write: vi.fn(async () => {}),
  exists: vi.fn(async () => true),
});

const createContext = ({
  keySession = false,
}: { keySession?: boolean } = {}) => {
  const withKeySession = vi.fn(async (operation: () => Promise<unknown>) =>
    operation(),
  );
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(),
    deviceCommitment: vi.fn(async () =>
      DeviceCommitmentHex(nextLocalCommitment),
    ),
    authorise: vi.fn(),
    withKeySession: keySession
      ? (withKeySession as PassportAuthoriser['withKeySession'])
      : undefined,
  };
  const sponsor = { balanceAndSign: vi.fn() };
  const prover = { prove: vi.fn(), check: vi.fn() };
  const accountRecords = createAccountRecords();
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

const queryContractState = vi.fn(async () => contractState);

beforeEach(() => {
  vi.clearAllMocks();
  queryContractState.mockResolvedValue(contractState);
  mocks.createIndexerClient.mockReturnValue({ queryContractState });
  mocks.ledger.mockReturnValue(decodedLedgerState);
  mocks.createMidnightProviders.mockResolvedValue(providers);
  mocks.connectAccountHandle.mockResolvedValue(handle);
  mocks.executeGatedCall.mockResolvedValue(UseCounter(3n));
});

describe('addDevice', () => {
  it('submits add_device_with_jubjub with the entry bytes and returns the roster with the enrolled device appended as remote', async () => {
    const { context, authoriser, prover, sponsor, stages } = createContext();

    await expect(
      addDevice(callInput({ devices: [localDevice] }), context),
    ).resolves.toEqual({
      devices: [refreshedLocalDevice, targetDevice],
      localUseCounter: '3',
    });

    expect(stages).toEqual([]);
    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(queryContractState).toHaveBeenCalledExactlyOnceWith(accountAddress);
    expect(mocks.ledger).toHaveBeenCalledExactlyOnceWith(contractState.data);
    expect(mocks.createMidnightProviders).toHaveBeenCalledExactlyOnceWith({
      network,
      prover,
      sponsor,
    });
    expect(mocks.connectAccountHandle).toHaveBeenCalledExactlyOnceWith(
      providers,
      accountAddress,
    );
    expect(mocks.executeGatedCall).toHaveBeenCalledExactlyOnceWith({
      handle,
      authoriser,
      circuit: 'add_device_with_jubjub',
      args: [ByteArray.fromHex(HexBytes(targetCommitment))],
      address: accountAddress,
      ledgerState: decodedLedgerState,
      knownUseCounter: 2n,
    });
  });

  it('leaves the local row on the successor of the consumed entry, computed with the device_epoch read before the call', async () => {
    const { context, authoriser } = createContext();
    mocks.executeGatedCall.mockImplementation(async () => {
      mocks.ledger.mockReturnValue({
        ...decodedLedgerState,
        device_epoch: deviceEpoch + 1n,
      });
      return UseCounter(3n);
    });

    await expect(
      addDevice(callInput({ commitmentHex: joiningCommitment }), context),
    ).resolves.toMatchObject({
      devices: [
        refreshedLocalDevice,
        targetDevice,
        { commitmentHex: joiningCommitment, isLocal: false },
      ],
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
      deviceEpoch,
      3n,
    );
    expect(queryContractState).toHaveBeenCalledOnce();
  });

  it('writes the advanced counter to the record before resolving', async () => {
    const { context, accountRecords } = createContext();
    let release!: () => void;
    vi.mocked(accountRecords.write).mockImplementation(
      async () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
    );

    const enrolled = addDevice(callInput(), context);
    await vi.waitFor(() => {
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        advancedRecord,
      );
    });
    await expect(
      Promise.race([enrolled, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    release();
    await expect(enrolled).resolves.toMatchObject({ localUseCounter: '3' });
  });

  it('rescans from zero when no local counter is known', async () => {
    const { context } = createContext();

    await addDevice(callInput({ localUseCounter: undefined }), context);

    expect(mocks.executeGatedCall).toHaveBeenCalledWith(
      expect.objectContaining({ knownUseCounter: undefined }),
    );
  });

  it('rejects with AccountContractMissingError for a dead or unknown contract', async () => {
    const { context, accountRecords } = createContext();
    queryContractState.mockResolvedValueOnce(null as never);

    await expect(addDevice(callInput(), context)).rejects.toThrow(
      AccountContractMissingError,
    );
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with NotAuthorisedError for an unknown-entry abort, since only the caller check raises it on the add circuit', async () => {
    const { context, accountRecords } = createContext();
    const abortMessage = 'failed assert: unknown device entry';
    mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));

    const enrolled = addDevice(callInput(), context);
    await expect(enrolled).rejects.toThrow(NotAuthorisedError);
    await expect(enrolled).rejects.toThrow(abortMessage);
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it.each([
    'failed assert: invalid signature',
    'failed assert: device key has small order',
  ])(
    'rejects with NotAuthorisedError for the abort "%s"',
    async abortMessage => {
      const { context } = createContext();
      mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));

      const enrolled = addDevice(callInput(), context);
      await expect(enrolled).rejects.toThrow(NotAuthorisedError);
      await expect(enrolled).rejects.toThrow(abortMessage);
    },
  );

  it('rejects with an untyped failure unchanged and leaves the record unwritten', async () => {
    const { context, accountRecords } = createContext();
    const failure = new Error('node unreachable');
    mocks.executeGatedCall.mockRejectedValue(failure);

    await expect(addDevice(callInput(), context)).rejects.toBe(failure);
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with a failing on-chain status unchanged and leaves the record unwritten', async () => {
    const { context, accountRecords } = createContext();
    const statusFailure = new Error(
      'Call to add_device_with_jubjub failed: "FailEntirely"',
    );
    mocks.executeGatedCall.mockRejectedValue(statusFailure);

    await expect(addDevice(callInput(), context)).rejects.toBe(statusFailure);
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with the cancelled ceremony unchanged', async () => {
    const { context } = createContext();
    const cancelled = new CeremonyCancelledError();
    mocks.executeGatedCall.mockRejectedValue(cancelled);

    await expect(addDevice(callInput(), context)).rejects.toBe(cancelled);
  });

  it('runs the whole call inside one key session when the authoriser exposes one', async () => {
    const { context, withKeySession, accountRecords } = createContext({
      keySession: true,
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
    const inSession: boolean[] = [];
    mocks.executeGatedCall.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return UseCounter(3n);
    });
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      inSession.push(isSessionOpen);
    });

    await addDevice(callInput(), context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(inSession).toEqual([true, true]);
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(addDevice(callInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });
    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('rejects with a failure raised inside the key session', async () => {
    const { context, withKeySession, accountRecords } = createContext({
      keySession: true,
    });
    mocks.executeGatedCall.mockRejectedValue(new Error('node unreachable'));

    await expect(addDevice(callInput(), context)).rejects.toThrow(
      'node unreachable',
    );
    expect(withKeySession).toHaveBeenCalledOnce();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });
});

describe('removeDevice', () => {
  it('submits remove_device_with_jubjub and drops the revoked device', async () => {
    const { context, authoriser, accountRecords } = createContext();

    await expect(removeDevice(callInput(), context)).resolves.toEqual({
      devices: [refreshedLocalDevice],
      localUseCounter: '3',
    });

    expect(mocks.executeGatedCall).toHaveBeenCalledExactlyOnceWith({
      handle,
      authoriser,
      circuit: 'remove_device_with_jubjub',
      args: [ByteArray.fromHex(HexBytes(targetCommitment))],
      address: accountAddress,
      ledgerState: decodedLedgerState,
      knownUseCounter: 2n,
    });
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
      advancedRecord,
    );
  });

  it('leaves the local row on the successor of the consumed entry', async () => {
    const { context, authoriser } = createContext();

    await expect(removeDevice(callInput(), context)).resolves.toMatchObject({
      devices: [refreshedLocalDevice],
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
      deviceEpoch,
      3n,
    );
  });

  it('does not resurrect the local device when it is the revoked one', async () => {
    const { context } = createContext();

    await expect(
      removeDevice(callInput({ commitmentHex: localCommitment }), context),
    ).resolves.toMatchObject({ devices: [targetDevice] });
  });

  it.each([
    [
      'LastDeviceError',
      'failed assert: cannot remove the authorising device',
      LastDeviceError,
    ],
    [
      'LastDeviceError',
      'failed assert: cannot remove last device',
      LastDeviceError,
    ],
    [
      'NotAuthorisedError',
      'failed assert: invalid signature',
      NotAuthorisedError,
    ],
    [
      'NotAuthorisedError',
      'failed assert: device key has small order',
      NotAuthorisedError,
    ],
    [
      'RemovalTargetNotFoundError',
      'failed assert: unknown device entry',
      RemovalTargetNotFoundError,
    ],
  ])(
    'rejects with %s for the abort "%s"',
    async (_className, abortMessage, errorClass) => {
      const { context, accountRecords } = createContext();
      mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));

      const revoked = removeDevice(callInput(), context);
      await expect(revoked).rejects.toThrow(errorClass);
      await expect(revoked).rejects.toThrow(abortMessage);
      expect(accountRecords.write).not.toHaveBeenCalled();
    },
  );

  it('rejects with an untyped failure unchanged', async () => {
    const { context, accountRecords } = createContext();
    mocks.executeGatedCall.mockRejectedValue('submission lost');

    await expect(removeDevice(callInput(), context)).rejects.toBe(
      'submission lost',
    );
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('runs the whole call inside one key session when the authoriser exposes one', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await expect(removeDevice(callInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });
    expect(withKeySession).toHaveBeenCalledOnce();
    expect(mocks.executeGatedCall).toHaveBeenCalledOnce();
  });

  it('rejects with a typed abort raised inside the key session', async () => {
    const { context, withKeySession } = createContext({ keySession: true });
    mocks.executeGatedCall.mockRejectedValue(
      new Error('failed assert: cannot remove last device'),
    );

    await expect(removeDevice(callInput(), context)).rejects.toThrow(
      LastDeviceError,
    );
    expect(withKeySession).toHaveBeenCalledOnce();
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(removeDevice(callInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });
    expect(withKeySession).not.toHaveBeenCalled();
  });
});
