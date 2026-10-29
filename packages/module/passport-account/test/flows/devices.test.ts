import {
  AccAddress,
  AccountContractMissingError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  DeviceReaderInvalidError,
  LastDeviceError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
  NotAuthorisedError,
  ReadUnavailableError,
  RemovalTargetNotFoundError,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  encodeDevicePublicKey,
  sealDeviceEnvelope,
} from '../../src/acc/envelopes';
import { JubjubDevice } from '../../src/acc/signer';
import { addDevice, removeDevice } from '../../src/flows/devices';

import { issuedGrant } from './issued-grant';

import type * as AccModule from '../../src/acc/acc-module';
import type { DeviceCallInput } from '../../src/flows/devices';
import type * as Rotation from '../../src/flows/rotation';
import type {
  AccountRecords,
  FlowContext,
  FlowStage,
  PassportAccountRecord,
} from '../../src/flows/types';
import type {
  GrantRecord,
  PassportAccountInfo,
  PassportAuthoriser,
  PassportDevice,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  readGrants: vi.fn(),
  createMidnightProviders: vi.fn(),
  connectAccountHandle: vi.fn(),
  executeGatedCall: vi.fn(),
  rotateEncKey: vi.fn(),
  sealViews: vi.fn(),
  assertMaintenanceSigner: vi.fn(),
  assertHoldsRosterAuthority: vi.fn(),
  followRosterAuthority: vi.fn(),
}));

vi.mock('../../src/infra/indexer', () => ({
  createIndexerClient: mocks.createIndexerClient,
}));
vi.mock('../../src/acc/acc-module', async importOriginal => ({
  ...(await importOriginal<typeof AccModule>()),
  ledger: mocks.ledger,
}));
vi.mock('../../src/acc/read-grants', () => ({
  readGrants: mocks.readGrants,
}));
vi.mock('../../src/infra/providers', () => ({
  createMidnightProviders: mocks.createMidnightProviders,
}));
vi.mock('../../src/acc/gated-call', () => ({
  connectAccountHandle: mocks.connectAccountHandle,
  executeGatedCall: mocks.executeGatedCall,
}));
vi.mock('../../src/flows/maintenance', () => ({
  assertMaintenanceSigner: mocks.assertMaintenanceSigner,
  assertHoldsRosterAuthority: mocks.assertHoldsRosterAuthority,
  followRosterAuthority: mocks.followRosterAuthority,
}));
vi.mock('../../src/flows/rotation', async importOriginal => ({
  ...(await importOriginal<typeof Rotation>()),
  rotateEncKey: mocks.rotateEncKey,
  sealViews: mocks.sealViews,
}));

const accountAddress = 'ac'.repeat(32);
const localCommitment = '11'.repeat(32);
const nextLocalCommitment = '1a'.repeat(32);
const targetCommitment = '22'.repeat(32);
const deviceEpoch = 4n;
const localKey = new JubjubDevice(31n);
const joiningKey = new JubjubDevice(37n);
const grantee = new JubjubDevice(41n);
const joiningCommitment = HexBytes.fromByteArray(
  joiningKey.entryAt(
    ByteArray.fromHex(HexBytes(accountAddress)),
    deviceEpoch,
    0n,
  ),
);
const readerPublicKey = x25519.getPublicKey(x25519.utils.randomSecretKey());
const self = {
  readerPublicKey: HexBytes.fromByteArray(readerPublicKey),
  devicePublicKey: encodeDevicePublicKey(localKey.pk),
};
const joiningReader = {
  readerPublicKey: HexBytes.fromByteArray(
    x25519.getPublicKey(x25519.utils.randomSecretKey()),
  ),
  devicePublicKey: encodeDevicePublicKey(joiningKey.pk),
};
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
const targetDevice: PassportDevice = {
  commitmentHex: targetCommitment,
  isLocal: false,
};
const joiningDevice: PassportDevice = {
  commitmentHex: joiningCommitment,
  isLocal: false,
};
const contractState = { data: 'charged-state' };
const rotatedAuthority = { tag: 'schnorr' as const, value: '7a'.repeat(32) };
const encKey = new Uint8Array(32).fill(2);
const rotatedKey = new Uint8Array(32).fill(3);
const envelope = await sealDeviceEnvelope(readerPublicKey, {
  secret: new Uint8Array(32).fill(5),
  rosterKey: new Uint8Array(32).fill(6),
});
const registration = Uint8Array.from({ length: 192 }, (_, index) =>
  index === 0 ? 0xd2 : 1,
);
const inbox = [envelope, registration];
const providers = { tag: 'midnight-providers' };
const handle = { callTx: {} };
const advancedRecord: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: account.bindingVersion,
  localUseCounter: '3',
};
const delivery = {
  envelope: new Uint8Array(192).fill(0xd1),
  registration: new Uint8Array(192).fill(0xd2),
};

const chain = { authNonce: 0n, liveEntries: [] as string[] };

/** The account's ledger as the indexer serves it, the auth nonce advancing per read. */
const ledgerState = () => ({
  device_epoch: deviceEpoch,
  auth_nonce: (chain.authNonce += 1n),
  enc_key: encKey,
  inbox_count: BigInt(inbox.length),
  inbox: {
    member: (ordinal: bigint) => ordinal < BigInt(inbox.length),
    lookup: (ordinal: bigint) => inbox[Number(ordinal)],
  },
  devices: {
    member: (entry: Uint8Array) =>
      chain.liveEntries.includes(HexBytes.fromByteArray(entry)),
    [Symbol.iterator]: () =>
      chain.liveEntries
        .map(entry => ByteArray.fromHex(HexBytes(entry)))
        [Symbol.iterator](),
  },
});

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
  presence: vi.fn(async () => 'complete' as const),
});

const createContext = ({
  keySession = false,
}: { keySession?: boolean } = {}) => {
  const withKeySession = vi.fn(async (operation: () => Promise<unknown>) =>
    operation(),
  );
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(async () => localKey.pk),
    deviceCommitment: vi.fn(async () =>
      DeviceCommitmentHex(nextLocalCommitment),
    ),
    authorise: vi.fn(),
    withKeySession: keySession
      ? (withKeySession as PassportAuthoriser['withKeySession'])
      : undefined,
  };
  const encryptionKey = {
    readerPublicKey: vi.fn(async () => readerPublicKey),
    createKeys: vi.fn(),
    sealToDevice: vi.fn<PassportEncryptionKey['sealToDevice']>(
      async () => delivery,
    ),
    openInbox: vi.fn<PassportEncryptionKey['openInbox']>(async () => [
      { kind: 'device', device: self },
    ]),
    sealGrant: vi.fn(),
    reencryptInbox: vi.fn(),
    sealView: vi.fn(),
  };
  const sponsor = { balanceAndSign: vi.fn() };
  const prover = { prove: vi.fn(), check: vi.fn() };
  const accountRecords = createAccountRecords();
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

const queryContractState = vi.fn(async () => contractState);

beforeEach(() => {
  vi.clearAllMocks();
  chain.authNonce = 0n;
  chain.liveEntries = [localCommitment, targetCommitment, joiningCommitment];
  queryContractState.mockResolvedValue(contractState);
  mocks.createIndexerClient.mockReturnValue({ queryContractState });
  mocks.ledger.mockImplementation(ledgerState);
  mocks.readGrants.mockReturnValue([]);
  mocks.createMidnightProviders.mockResolvedValue(providers);
  mocks.connectAccountHandle.mockResolvedValue(handle);
  mocks.executeGatedCall.mockResolvedValue(UseCounter(3n));
  mocks.rotateEncKey.mockResolvedValue({
    encKey: rotatedKey,
    dropped: [],
    authority: rotatedAuthority,
    keyring: {
      account: AccAddress(accountAddress),
      encKey: rotatedKey,
      envelopes: [delivery.envelope],
    },
  });
  mocks.sealViews.mockResolvedValue({ sealed: [], unsealed: [], entries: [] });
  mocks.assertMaintenanceSigner.mockResolvedValue(undefined);
  mocks.assertHoldsRosterAuthority.mockResolvedValue(undefined);
  mocks.followRosterAuthority.mockResolvedValue(undefined);
});

/** The keyring this device holds over the ledger the mocked chain serves. */
const chainKeyring = {
  account: AccAddress(accountAddress),
  encKey,
  envelopes: [envelope],
};

const gatedCall = (circuit: string, args: unknown[]): unknown =>
  expect.objectContaining({ circuit, args, address: accountAddress });

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
    expect(mocks.createMidnightProviders).toHaveBeenCalledExactlyOnceWith({
      network,
      prover,
      sponsor,
      onStage: expect.any(Function) as unknown,
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
      ledgerState: expect.objectContaining({ auth_nonce: 1n }) as unknown,
      knownUseCounter: 2n,
    });
  });

  it('opens no account key when no joining keys are named', async () => {
    const { context, encryptionKey } = createContext();

    await addDevice(callInput(), context);

    expect(encryptionKey.readerPublicKey).not.toHaveBeenCalled();
    expect(encryptionKey.sealToDevice).not.toHaveBeenCalled();
  });

  it('leaves the local row on the successor of the consumed entry, computed with the device_epoch read before the call', async () => {
    const { context, authoriser } = createContext();
    mocks.executeGatedCall.mockImplementation(async () => {
      mocks.ledger.mockImplementation(() => ({
        ...ledgerState(),
        device_epoch: deviceEpoch + 1n,
      }));
      return UseCounter(3n);
    });

    await expect(
      addDevice(callInput({ commitmentHex: joiningCommitment }), context),
    ).resolves.toMatchObject({
      devices: [refreshedLocalDevice, targetDevice, joiningDevice],
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      accountAddress,
      deviceEpoch,
      3n,
    );
  });

  it('keeps the grant bookkeeping the stored record carries when it writes the advanced counter, and no roster', async () => {
    const { context, accountRecords } = createContext();
    const issued = await issuedGrant({
      address: accountAddress,
      origin: 'lace.io',
      grantee,
      slot: 2,
    });
    mocks.readGrants.mockReturnValue([issued.onChain()]);
    const grants = { [issued.id]: issued.stored };
    vi.mocked(accountRecords.read).mockResolvedValue({
      ...advancedRecord,
      localUseCounter: '2',
      grants,
    });

    await addDevice(callInput(), context);

    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith({
      ...advancedRecord,
      grants,
    });
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
    vi.mocked(accountRecords.read).mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return undefined;
    });
    mocks.executeGatedCall.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return UseCounter(3n);
    });
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      inSession.push(isSessionOpen);
    });

    await addDevice(callInput(), context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(inSession).toEqual([true, true, true]);
  });

  it('names the add-device flow, the target commitment and the account to the key session', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await addDevice(callInput(), context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        kind: 'add-device',
        commitmentHex: targetCommitment,
        account: AccAddress(accountAddress),
      },
    );
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(addDevice(callInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });
    expect(withKeySession).not.toHaveBeenCalled();
  });

  describe('with the joining device keys', () => {
    const joining = () =>
      callInput({ commitmentHex: joiningCommitment, devices: [localDevice] });

    it('delivers the live account keys to the joining reader as two recorded appends ahead of the enrolment', async () => {
      const { context, encryptionKey, stages } = createContext();

      await expect(
        addDevice({ ...joining(), reader: joiningReader }, context),
      ).resolves.toEqual({
        devices: [refreshedLocalDevice, joiningDevice],
        localUseCounter: '3',
      });

      expect(encryptionKey.sealToDevice).toHaveBeenCalledExactlyOnceWith(
        network.networkId,
        {
          account: AccAddress(accountAddress),
          encKey,
          envelopes: [envelope],
        },
        { ...joiningReader, epoch: deviceEpoch, counter: 0n },
      );
      expect(mocks.executeGatedCall).toHaveBeenCalledTimes(3);
      expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
        1,
        gatedCall('append_inbox_with_jubjub', [delivery.envelope]),
      );
      expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
        2,
        gatedCall('append_inbox_with_jubjub', [delivery.registration]),
      );
      expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
        3,
        gatedCall('add_device_with_jubjub', [
          ByteArray.fromHex(HexBytes(joiningCommitment)),
        ]),
      );
      expect(
        encryptionKey.sealToDevice.mock.invocationCallOrder[0],
      ).toBeLessThan(mocks.executeGatedCall.mock.invocationCallOrder[0]);
      expect(stages).toEqual(['recording']);
    });

    it('leaves the appended keys in place when the enrolment then fails', async () => {
      const { context, accountRecords } = createContext();
      const failure = new Error('node unreachable');
      mocks.executeGatedCall
        .mockResolvedValueOnce(UseCounter(3n))
        .mockResolvedValueOnce(UseCounter(4n))
        .mockRejectedValueOnce(failure);

      await expect(
        addDevice({ ...joining(), reader: joiningReader }, context),
      ).rejects.toBe(failure);

      expect(mocks.executeGatedCall).toHaveBeenCalledTimes(3);
      expect(accountRecords.write).toHaveBeenLastCalledWith({
        ...advancedRecord,
        localUseCounter: '4',
      });
    });

    it('writes no roster into the record', async () => {
      const { context, accountRecords } = createContext();
      vi.mocked(accountRecords.read).mockResolvedValue(advancedRecord);

      await addDevice({ ...joining(), reader: joiningReader }, context);

      for (const [written] of vi.mocked(accountRecords.write).mock.calls) {
        expect(written).not.toHaveProperty('readers');
      }
    });

    it('names the joining keys to the key session', async () => {
      const { context, withKeySession } = createContext({ keySession: true });

      await addDevice({ ...joining(), reader: joiningReader }, context);

      expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
        expect.any(Function),
        {
          kind: 'add-device',
          commitmentHex: joiningCommitment,
          account: AccAddress(accountAddress),
          reader: joiningReader,
        },
      );
    });

    describe('while a read grant is live', () => {
      const liveRead = (active = true, read = true) =>
        [
          { id: 'aa'.repeat(32), active, scope: { read } },
        ] as unknown as GrantRecord[];

      it('rotates the keys first with a fresh roster key and hands the joining device the rotated key, then re-seals the read grants', async () => {
        const { context, encryptionKey, withKeySession } = createContext({
          keySession: true,
        });
        mocks.readGrants.mockReturnValue(liveRead());
        mocks.rotateEncKey.mockResolvedValueOnce({
          encKey: rotatedKey,
          dropped: [targetCommitment],
          authority: rotatedAuthority,
          keyring: {
            account: AccAddress(accountAddress),
            encKey: rotatedKey,
            envelopes: [delivery.envelope],
          },
        });

        await expect(
          addDevice({ ...joining(), reader: joiningReader }, context),
        ).resolves.toMatchObject({
          encKey: HexBytes.fromByteArray(rotatedKey),
          droppedDevices: [targetCommitment],
        });

        expect(mocks.rotateEncKey).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            devices: [localCommitment, targetCommitment, joiningCommitment],
            rotateRoster: true,
          }),
        );
        expect(encryptionKey.sealToDevice).toHaveBeenCalledWith(
          network.networkId,
          {
            account: AccAddress(accountAddress),
            encKey: rotatedKey,
            envelopes: [delivery.envelope],
          },
          { ...joiningReader, epoch: deviceEpoch, counter: 0n },
        );
        expect(mocks.rotateEncKey.mock.invocationCallOrder[0]).toBeLessThan(
          encryptionKey.sealToDevice.mock.invocationCallOrder[0],
        );
        expect(
          encryptionKey.sealToDevice.mock.invocationCallOrder[0],
        ).toBeLessThan(mocks.sealViews.mock.invocationCallOrder[0]);
        expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
          expect.any(Function),
          expect.objectContaining({
            kind: 'add-device',
            devices: [localCommitment, targetCommitment, joiningCommitment],
          }),
        );
      });

      it('moves the maintenance authority after the rotation, in the key session, before the keys are handed over and the device enrolled', async () => {
        const { context, withKeySession, encryptionKey } = createContext({
          keySession: true,
        });
        mocks.readGrants.mockReturnValue(liveRead());
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
        mocks.followRosterAuthority.mockImplementation(async () => {
          inSession.push(isSessionOpen);
        });

        await addDevice({ ...joining(), reader: joiningReader }, context);

        expect(mocks.assertMaintenanceSigner).toHaveBeenCalledExactlyOnceWith({
          address: accountAddress,
          indexer: expect.objectContaining({ queryContractState }) as unknown,
          encryptionKey,
        });
        expect(
          mocks.assertMaintenanceSigner.mock.invocationCallOrder[0],
        ).toBeLessThan(withKeySession.mock.invocationCallOrder[0]);
        expect(mocks.followRosterAuthority).toHaveBeenCalledExactlyOnceWith({
          address: accountAddress,
          seams: context.seams,
          keyring: chainKeyring,
          authority: rotatedAuthority,
          onProgress: context.onProgress,
        });
        expect(inSession).toEqual([true]);
        const [followed] = mocks.followRosterAuthority.mock.invocationCallOrder;
        expect(mocks.rotateEncKey.mock.invocationCallOrder[0]).toBeLessThan(
          followed,
        );
        expect(followed).toBeLessThan(
          encryptionKey.sealToDevice.mock.invocationCallOrder[0],
        );
        expect(followed).toBeLessThan(
          mocks.executeGatedCall.mock.invocationCallOrder[0],
        );
        expect(mocks.executeGatedCall).toHaveBeenLastCalledWith(
          gatedCall('add_device_with_jubjub', [
            ByteArray.fromHex(HexBytes(joiningCommitment)),
          ]),
        );
      });

      it('checks in the key session, before the rotation, that this device holds the authority, refusing with nothing submitted when it does not', async () => {
        const { context, withKeySession, encryptionKey } = createContext({
          keySession: true,
        });
        mocks.readGrants.mockReturnValue(liveRead());
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
        mocks.assertHoldsRosterAuthority.mockImplementation(async () => {
          inSession.push(isSessionOpen);
          throw new MaintenanceAuthorityMismatchError();
        });

        await expect(
          addDevice({ ...joining(), reader: joiningReader }, context),
        ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);

        expect(
          mocks.assertHoldsRosterAuthority,
        ).toHaveBeenCalledExactlyOnceWith({
          address: accountAddress,
          seams: context.seams,
          indexer: expect.objectContaining({ queryContractState }) as unknown,
          keyring: chainKeyring,
        });
        expect(inSession).toEqual([true]);
        expect(withKeySession).toHaveBeenCalledOnce();
        expect(mocks.rotateEncKey).not.toHaveBeenCalled();
        expect(mocks.followRosterAuthority).not.toHaveBeenCalled();
        expect(encryptionKey.sealToDevice).not.toHaveBeenCalled();
        expect(mocks.executeGatedCall).not.toHaveBeenCalled();
      });

      it('refuses before any prompt when the encryption key cannot move a live authority', async () => {
        const { context, withKeySession } = createContext({
          keySession: true,
        });
        mocks.readGrants.mockReturnValue(liveRead());
        mocks.assertMaintenanceSigner.mockRejectedValue(
          new MaintenanceUpdateRefusedError(),
        );

        await expect(
          addDevice({ ...joining(), reader: joiningReader }, context),
        ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);
        expect(withKeySession).not.toHaveBeenCalled();
        expect(mocks.rotateEncKey).not.toHaveBeenCalled();
      });

      it.each([
        ['a revoked read grant', liveRead(false, true)],
        ['a live spend grant', liveRead(true, false)],
      ])(
        'hands over the live keys without rotating for %s',
        async (_case, grants) => {
          const { context, withKeySession } = createContext({
            keySession: true,
          });
          mocks.readGrants.mockReturnValue(grants);

          await expect(
            addDevice({ ...joining(), reader: joiningReader }, context),
          ).resolves.not.toHaveProperty('encKey');

          expect(mocks.rotateEncKey).not.toHaveBeenCalled();
          expect(mocks.assertMaintenanceSigner).not.toHaveBeenCalled();
          expect(mocks.assertHoldsRosterAuthority).not.toHaveBeenCalled();
          expect(mocks.followRosterAuthority).not.toHaveBeenCalled();
          expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
            expect.any(Function),
            expect.not.objectContaining({
              devices: expect.anything() as unknown,
            }) as unknown,
          );
        },
      );

      it('does not rotate for an enrolment that hands over no keys', async () => {
        const { context } = createContext();
        mocks.readGrants.mockReturnValue(liveRead());

        await addDevice(joining(), context);

        expect(mocks.rotateEncKey).not.toHaveBeenCalled();
      });

      it('refuses with ReadUnavailableError before any prompt when the key cannot rotate', async () => {
        const { context, encryptionKey, withKeySession } = createContext({
          keySession: true,
        });
        mocks.readGrants.mockReturnValue(liveRead());
        Object.assign(encryptionKey, {
          reencryptInbox: undefined,
          sealView: undefined,
        });

        await expect(
          addDevice({ ...joining(), reader: joiningReader }, context),
        ).rejects.toBeInstanceOf(ReadUnavailableError);
        expect(withKeySession).not.toHaveBeenCalled();
      });
    });

    it.each([
      [
        'a device key whose first entry is not the commitment',
        {
          ...joiningReader,
          devicePublicKey: encodeDevicePublicKey(localKey.pk),
        },
      ],
      [
        'a reader key of small order',
        {
          ...joiningReader,
          readerPublicKey: '00'.repeat(32),
        },
      ],
      [
        'a device key that is no point',
        {
          ...joiningReader,
          devicePublicKey: 'ff'.repeat(32),
        },
      ],
    ])(
      'refuses %s with DeviceReaderInvalidError before any prompt',
      async (_case, reader) => {
        const { context, withKeySession, accountRecords } = createContext({
          keySession: true,
        });

        await expect(
          addDevice({ ...joining(), reader }, context),
        ).rejects.toBeInstanceOf(DeviceReaderInvalidError);
        expect(withKeySession).not.toHaveBeenCalled();
        expect(mocks.executeGatedCall).not.toHaveBeenCalled();
        expect(accountRecords.write).not.toHaveBeenCalled();
      },
    );
  });
});

describe('removeDevice', () => {
  it('rotates the account keys with a fresh roster key, then submits remove_device_with_jubjub and drops the revoked device', async () => {
    const { context, authoriser, encryptionKey } = createContext();

    await expect(removeDevice(callInput(), context)).resolves.toEqual({
      devices: [refreshedLocalDevice],
      localUseCounter: '3',
      encKey: HexBytes.fromByteArray(rotatedKey),
      droppedDevices: [],
    });

    expect(mocks.rotateEncKey).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        account,
        encryptionKey,
        local: { readerPublicKey, devicePublicKey: self.devicePublicKey },
        networkId: network.networkId,
        devices: [localCommitment, joiningCommitment],
        rotateRoster: true,
        target: targetCommitment,
      }),
    );
    expect(mocks.executeGatedCall).toHaveBeenCalledExactlyOnceWith({
      handle,
      authoriser,
      circuit: 'remove_device_with_jubjub',
      args: [ByteArray.fromHex(HexBytes(targetCommitment))],
      address: accountAddress,
      ledgerState: expect.objectContaining({ auth_nonce: 1n }) as unknown,
      knownUseCounter: 2n,
    });
    expect(mocks.rotateEncKey.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.executeGatedCall.mock.invocationCallOrder[0],
    );
  });

  it('moves the maintenance authority after the rotation and before the removal, signed over the keyring the chain then holds', async () => {
    const { context, encryptionKey, withKeySession } = createContext({
      keySession: true,
    });

    await removeDevice(callInput(), context);

    expect(mocks.assertMaintenanceSigner).toHaveBeenCalledExactlyOnceWith({
      address: accountAddress,
      indexer: expect.objectContaining({ queryContractState }) as unknown,
      encryptionKey,
    });
    expect(
      mocks.assertMaintenanceSigner.mock.invocationCallOrder[0],
    ).toBeLessThan(withKeySession.mock.invocationCallOrder[0]);
    expect(mocks.followRosterAuthority).toHaveBeenCalledExactlyOnceWith({
      address: accountAddress,
      seams: context.seams,
      keyring: chainKeyring,
      authority: rotatedAuthority,
      onProgress: context.onProgress,
    });
    const [followed] = mocks.followRosterAuthority.mock.invocationCallOrder;
    expect(
      mocks.assertHoldsRosterAuthority.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.rotateEncKey.mock.invocationCallOrder[0]);
    expect(mocks.rotateEncKey.mock.invocationCallOrder[0]).toBeLessThan(
      followed,
    );
    expect(followed).toBeLessThan(mocks.sealViews.mock.invocationCallOrder[0]);
    expect(followed).toBeLessThan(
      mocks.executeGatedCall.mock.invocationCallOrder[0],
    );
  });

  it('refuses before any prompt when the encryption key cannot move a live authority', async () => {
    const { context, withKeySession } = createContext({ keySession: true });
    mocks.assertMaintenanceSigner.mockRejectedValue(
      new MaintenanceUpdateRefusedError(),
    );

    await expect(removeDevice(callInput(), context)).rejects.toBeInstanceOf(
      MaintenanceUpdateRefusedError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.rotateEncKey).not.toHaveBeenCalled();
  });

  it('refuses in the key session, before the rotation, when this device holds no roster key of the authority, submitting nothing', async () => {
    const { context, withKeySession } = createContext({ keySession: true });
    mocks.assertHoldsRosterAuthority.mockRejectedValue(
      new MaintenanceAuthorityMismatchError(),
    );

    await expect(removeDevice(callInput(), context)).rejects.toBeInstanceOf(
      MaintenanceAuthorityMismatchError,
    );
    expect(mocks.assertHoldsRosterAuthority).toHaveBeenCalledExactlyOnceWith({
      address: accountAddress,
      seams: context.seams,
      indexer: expect.objectContaining({ queryContractState }) as unknown,
      keyring: chainKeyring,
    });
    expect(withKeySession).toHaveBeenCalledOnce();
    expect(
      mocks.assertHoldsRosterAuthority.mock.invocationCallOrder[0],
    ).toBeGreaterThan(withKeySession.mock.invocationCallOrder[0]);
    expect(mocks.rotateEncKey).not.toHaveBeenCalled();
    expect(mocks.followRosterAuthority).not.toHaveBeenCalled();
    expect(mocks.sealViews).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
  });

  it('submits no removal when the authority cannot be moved', async () => {
    const { context } = createContext();
    mocks.followRosterAuthority.mockRejectedValue(
      new MaintenanceAuthorityMismatchError(),
    );

    await expect(removeDevice(callInput(), context)).rejects.toBeInstanceOf(
      MaintenanceAuthorityMismatchError,
    );
    expect(mocks.sealViews).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
  });

  it('reports the devices the rotation left without the new key', async () => {
    const { context } = createContext();
    mocks.rotateEncKey.mockResolvedValueOnce({
      encKey: rotatedKey,
      dropped: [joiningCommitment],
      authority: rotatedAuthority,
      keyring: {
        account: AccAddress(accountAddress),
        encKey: rotatedKey,
        envelopes: [delivery.envelope],
      },
    });

    await expect(removeDevice(callInput(), context)).resolves.toMatchObject({
      droppedDevices: [joiningCommitment],
    });
  });

  it('names the live device entries other than the target to the rotation, so the removed device is never sealed to', async () => {
    const { context, accountRecords } = createContext();
    vi.mocked(accountRecords.read).mockResolvedValue(advancedRecord);

    await removeDevice(
      callInput({
        commitmentHex: joiningCommitment,
        devices: [localDevice, joiningDevice],
      }),
      context,
    );

    expect(mocks.rotateEncKey).toHaveBeenCalledWith(
      expect.objectContaining({
        devices: [localCommitment, targetCommitment],
        rotateRoster: true,
      }),
    );
    for (const [written] of vi.mocked(accountRecords.write).mock.calls) {
      expect(written).not.toHaveProperty('readers');
    }
  });

  it('seals the new secret again to the live read grants, appends their view records and keeps the seals', async () => {
    const { context, accountRecords, stages } = createContext();
    const readPublicKey = '77'.repeat(32);
    const issued = await issuedGrant({
      address: accountAddress,
      origin: 'lace.io',
      grantee,
      slot: 1,
      readPublicKey,
    });
    const grantId = issued.id;
    const storedGrant = issued.stored;
    vi.mocked(accountRecords.read).mockResolvedValue({
      ...advancedRecord,
      localUseCounter: '2',
      grants: { [grantId]: storedGrant },
    });
    mocks.readGrants.mockReturnValue([issued.onChain()]);
    const viewEntry = new Uint8Array(192).fill(0xd3);
    const sealed = {
      grantId,
      readPublicKey,
      seal: '9c'.repeat(94),
      sealedEncKey: HexBytes.fromByteArray(rotatedKey),
    };
    mocks.sealViews.mockResolvedValue({
      sealed: [sealed],
      unsealed: [],
      entries: [viewEntry],
    });

    await removeDevice(callInput(), context);

    expect(mocks.sealViews).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        keyring: {
          account: AccAddress(accountAddress),
          encKey: rotatedKey,
          envelopes: [delivery.envelope],
        },
        account: AccAddress(accountAddress),
        targets: [{ grantId, readPublicKey }],
      }),
    );
    expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
      1,
      gatedCall('append_inbox_with_jubjub', [viewEntry]),
    );
    expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
      2,
      gatedCall('remove_device_with_jubjub', [
        ByteArray.fromHex(HexBytes(targetCommitment)),
      ]),
    );
    expect(stages).toEqual(['recording']);
    expect(accountRecords.write).toHaveBeenLastCalledWith({
      ...advancedRecord,
      grants: {
        [grantId]: {
          ...storedGrant,
          view: {
            readPublicKey,
            seal: sealed.seal,
            sealedEncKey: sealed.sealedEncKey,
          },
        },
      },
    });
  });

  it('re-seals to no kept read key whose entry does not open the grant the chain holds under its id, and drops the entry', async () => {
    const { context, accountRecords } = createContext();
    const issued = await issuedGrant({
      address: accountAddress,
      origin: 'lace.io',
      grantee,
      slot: 1,
      readPublicKey: '77'.repeat(32),
    });
    vi.mocked(accountRecords.read).mockResolvedValue({
      ...advancedRecord,
      localUseCounter: '2',
      grants: {
        [issued.id]: { ...issued.stored, scopeSalt: '08'.repeat(32) },
      },
    });
    mocks.readGrants.mockReturnValue([issued.onChain()]);
    mocks.sealViews.mockResolvedValue({
      sealed: [],
      unsealed: [],
      entries: [],
    });

    await removeDevice(callInput(), context);

    expect(mocks.sealViews).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ targets: [] }),
    );
    expect(accountRecords.write).toHaveBeenLastCalledWith(advancedRecord);
  });

  it('refuses with ReadUnavailableError before any prompt when the key cannot rotate', async () => {
    const { context, withKeySession, encryptionKey } = createContext({
      keySession: true,
    });
    delete (encryptionKey as Partial<typeof encryptionKey>).reencryptInbox;

    await expect(removeDevice(callInput(), context)).rejects.toBeInstanceOf(
      ReadUnavailableError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('refuses with RemovalTargetNotFoundError before any prompt when the device set no longer holds the target', async () => {
    chain.liveEntries = [localCommitment];
    const { context, withKeySession } = createContext({ keySession: true });

    await expect(removeDevice(callInput(), context)).rejects.toBeInstanceOf(
      RemovalTargetNotFoundError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.rotateEncKey).not.toHaveBeenCalled();
  });

  it('refuses with LastDeviceError before any prompt when the target is this device', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await expect(
      removeDevice(callInput({ commitmentHex: localCommitment }), context),
    ).rejects.toBeInstanceOf(LastDeviceError);
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.rotateEncKey).not.toHaveBeenCalled();
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
      const { context } = createContext();
      mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));

      const revoked = removeDevice(callInput(), context);
      await expect(revoked).rejects.toThrow(errorClass);
      await expect(revoked).rejects.toThrow(abortMessage);
    },
  );

  it('rejects with an untyped failure unchanged', async () => {
    const { context } = createContext();
    mocks.executeGatedCall.mockRejectedValue('submission lost');

    await expect(removeDevice(callInput(), context)).rejects.toBe(
      'submission lost',
    );
  });

  it('runs the rotation and the removal inside one key session when the authoriser exposes one', async () => {
    const { context, withKeySession } = createContext({ keySession: true });
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
    mocks.rotateEncKey.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return {
        encKey: rotatedKey,
        authority: rotatedAuthority,
        keyring: {
          account: AccAddress(accountAddress),
          encKey: rotatedKey,
          envelopes: [],
        },
      };
    });
    mocks.executeGatedCall.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return UseCounter(3n);
    });

    await removeDevice(callInput(), context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(inSession).toEqual([true, true]);
  });

  it('names the remove-device flow, the target commitment, the account and the live entries other than the target to the key session', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await removeDevice(callInput(), context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        kind: 'remove-device',
        commitmentHex: targetCommitment,
        account: AccAddress(accountAddress),
        devices: [localCommitment, joiningCommitment],
      },
    );
  });

  it('runs directly when the authoriser exposes no key session', async () => {
    const { context, withKeySession } = createContext();

    await expect(removeDevice(callInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });
    expect(withKeySession).not.toHaveBeenCalled();
  });
});
