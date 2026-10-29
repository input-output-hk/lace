import {
  AccAddress,
  AccountContractMissingError,
  AccountCreationPendingError,
  AccountNotFoundError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  EncryptionKeyMismatchError,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  RecordUnreadableError,
  TokenColor,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  encodeDevicePublicKey,
  openGrantRecord,
  sealDeviceEnvelope,
  sealDeviceRegistration,
  sealGrantRecord,
} from '../../src/acc/envelopes';
import {
  circuitScope,
  deriveGrantId,
  grantObjectCommit,
  originHash,
} from '../../src/acc/grants';
import { JubjubDevice } from '../../src/acc/signer';
import { signIn } from '../../src/flows/sign-in';

import { issuedGrant } from './issued-grant';

import type * as AccModule from '../../src/acc/acc-module';
import type {
  AccountRecords,
  FlowContext,
  FlowStage,
} from '../../src/flows/types';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type {
  GrantRecord,
  GrantRecordPart,
  OpenedInboxEntry,
  PassportAuthoriser,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  readGrants: vi.fn(),
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

const accountAddress = 'ac'.repeat(32);
const rpId = 'lace.io';
const localKey = new JubjubDevice(11n);
const devicePublicKey = localKey.pk;
const readerPublicKey = x25519.getPublicKey(x25519.utils.randomSecretKey());
const self = {
  readerPublicKey: HexBytes.fromByteArray(readerPublicKey),
  devicePublicKey: encodeDevicePublicKey(devicePublicKey),
};
const joined = {
  readerPublicKey: '33'.repeat(32),
  devicePublicKey: '44'.repeat(32),
};
const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};
const contractState = { data: 'charged-state' };
const encKey = new Uint8Array(32).fill(2);
const encKeyHex = HexBytes.fromByteArray(encKey);
const accountSecrets = {
  secret: new Uint8Array(32).fill(5),
  rosterKey: new Uint8Array(32).fill(6),
};
const envelope = await sealDeviceEnvelope(readerPublicKey, accountSecrets);
const foreignEnvelope = await sealDeviceEnvelope(
  x25519.getPublicKey(x25519.utils.randomSecretKey()),
  accountSecrets,
);
const registration = await sealDeviceRegistration(
  accountSecrets.rosterKey,
  self,
);
const coinEntry = Uint8Array.from({ length: 192 }, (_, index) =>
  index < 2 ? 1 : 7,
);
const inbox = [envelope, coinEntry, foreignEnvelope, registration];
const record: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '2',
};
const healed = (
  fields: Partial<PassportAccountRecord> = {},
): PassportAccountRecord => ({
  ...record,
  ...fields,
});
const revokedGrantId = GrantId('cd'.repeat(32));
const grantRecord = (id: GrantId, slot: number): GrantRecord => ({
  id,
  slot: GrantSlot(slot),
  active: true,
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
const pendingRecord: PassportAccountRecord = {
  ...record,
  deployment: {
    operations: ['deposit_unshielded', 'deposit_shielded'],
    lockAccount: true,
    saltHex: '07'.repeat(32),
    authorityKey: { tag: 'schnorr', value: 'authority-key' },
    handoverAuthority: { tag: 'schnorr', value: 'cd'.repeat(32) },
    keyEntries: [envelope, registration].map(entry =>
      HexBytes.fromByteArray(entry),
    ),
  },
};

/** A read grant this device issued, as its grant records and the chain hold it. */
const grantee = new JubjubDevice(23n);
const granteePublicKey = HexBytes.fromByteArray(
  jubjub.Point.fromAffine(grantee.pk).toBytes(),
);
const readPublicKey = HexBytes.fromByteArray(
  x25519.getPublicKey(x25519.utils.randomSecretKey()),
);
const issuedSalt = GrantScopeSalt('5a'.repeat(32));
const issuedObject = {
  color: '00'.repeat(32),
  recipient: { kind: 'user-address' as const, value: 'aa'.repeat(32) },
  maxCoinValue: '300',
};
const issuedGrantId = deriveGrantId({
  contractAddress: ByteArray.fromHex(HexBytes(accountAddress)),
  granteePublicKey: { scheme: 'jubjub-schnorr', point: grantee.pk },
  originHash: await originHash(rpId),
  slot: GrantSlot(2),
});
const issuedScope = circuitScope({
  grantee: { scheme: 'jubjub-schnorr', publicKey: granteePublicKey },
  operations: [],
  color: TokenColor(issuedObject.color),
  recipient: issuedObject.recipient,
  maxCoinValue: issuedObject.maxCoinValue,
  perCallCap: '0',
  cap: '0',
  expiresAt: null,
  readPublicKey,
});
const issuedRecord: GrantRecord = {
  ...grantRecord(issuedGrantId, 0),
  scope: {
    ...grantRecord(issuedGrantId, 0).scope,
    read: true,
    objectCommit: grantObjectCommit(
      ByteArray.fromHex(HexBytes(issuedSalt)),
      issuedScope,
    ),
    readPkHash: HexBytes.fromByteArray(
      sha256(ByteArray.fromHex(HexBytes(readPublicKey))),
    ),
  },
};
const seal = '9c'.repeat(94);
const issuedParts = (
  view: Partial<Extract<GrantRecordPart, { part: 'view' }>> = {},
): GrantRecordPart[] => [
  {
    part: 'grant',
    grantId: issuedGrantId,
    slot: GrantSlot(2),
    scopeSalt: issuedSalt,
    granteeScheme: 'jubjub-schnorr',
    granteePublicKey,
    readPublicKey,
  },
  { part: 'object', grantId: issuedGrantId, object: issuedObject },
  {
    part: 'view',
    grantId: issuedGrantId,
    encKeyPrefix: encKeyHex.slice(0, 6),
    seal,
    ...view,
  },
];
const rebuiltGrant = {
  slot: 2,
  scopeSalt: issuedSalt,
  granteeScheme: 'jubjub-schnorr' as const,
  granteePublicKey,
  origin: rpId,
  object: issuedObject,
  view: { readPublicKey, seal, sealedEncKey: encKeyHex },
};

const commitmentFor = (counter: bigint): string =>
  counter.toString(16).padStart(64, '0');

const ledgerStateFor = (
  liveCounters: bigint[],
  entries?: string[],
  held: Uint8Array[] = inbox,
) => {
  const localEntries = liveCounters.map(commitmentFor);
  const live = new Set(localEntries);
  const roster = entries ?? localEntries;
  return {
    device_epoch: 1n,
    auth_nonce: 7n,
    enc_key: encKey,
    booted: true,
    inbox_count: BigInt(held.length),
    inbox: {
      member: (ordinal: bigint) => ordinal < BigInt(held.length),
      lookup: (ordinal: bigint) => held[Number(ordinal)],
    },
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
    presence: vi.fn(async () => {
      if (current === undefined) return 'absent';
      return current.deployment === undefined ? 'complete' : 'pending';
    }),
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
  const encryptionKey = {
    readerPublicKey: vi.fn<PassportEncryptionKey['readerPublicKey']>(
      async () => readerPublicKey,
    ),
    createKeys: vi.fn(),
    sealToDevice: vi.fn(),
    sealGrant: vi.fn(),
    openInbox: vi.fn<PassportEncryptionKey['openInbox']>(
      async (_networkId, _keyring, entries) =>
        entries.map(() => null as OpenedInboxEntry | null),
    ),
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
    rpId,
  };
  return {
    authoriser,
    withKeySession,
    encryptionKey,
    accountRecords,
    stages,
    context,
  };
};

const queryContractState = vi.fn(async () => contractState);

/** Answers each Lace record the flow sends with what it opens to. */
const opening =
  (opened: Map<Uint8Array, OpenedInboxEntry>) =>
  async (
    _networkId: string,
    _keyring: unknown,
    entries: readonly Uint8Array[],
  ): Promise<(OpenedInboxEntry | null)[]> =>
    entries.map(entry => opened.get(entry) ?? null);

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryContractState.mockResolvedValue(contractState);
    mocks.createIndexerClient.mockReturnValue({ queryContractState });
    mocks.ledger.mockReturnValue(ledgerStateFor([2n]));
    mocks.readGrants.mockReturnValue([]);
  });

  it('recognises the persisted account from live chain state and returns the RecognisedAccount shape', async () => {
    const { context, stages } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toEqual({
      account: {
        address: accountAddress,
        bindingVersion: record.bindingVersion,
        status: 'ready',
        networkId: 'undeployed',
      },
      devices: [{ commitmentHex: commitmentFor(2n), isLocal: true }],
      localUseCounter: '2',
      grants: [],
      encKey: encKeyHex,
      unsealedGrantIds: [],
    });
    expect(stages).toEqual([]);
    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(queryContractState).toHaveBeenCalledExactlyOnceWith(accountAddress);
    expect(mocks.ledger).toHaveBeenCalledExactlyOnceWith(contractState.data);
  });

  it('opens the Lace records of the inbox with the keyring of the ledger enc_key and this device envelopes alone', async () => {
    const { context, encryptionKey } = createContext({ stored: record });

    await signIn(context);

    expect(encryptionKey.readerPublicKey).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
    );
    expect(encryptionKey.openInbox).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
      { account: AccAddress(accountAddress), encKey, envelopes: [envelope] },
      [envelope, foreignEnvelope, registration],
    );
  });

  it('writes no roster into the healed record, whatever devices the live roster key registers', async () => {
    const { context, encryptionKey, accountRecords } = createContext({
      stored: record,
    });
    encryptionKey.openInbox.mockImplementation(
      opening(
        new Map<Uint8Array, OpenedInboxEntry>([
          [envelope, { kind: 'device', device: joined }],
          [registration, { kind: 'device', device: self }],
        ]),
      ),
    );

    await signIn(context);

    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
  });

  it('rejects with EncryptionKeyMismatchError before opening anything when the inbox holds no envelope for this device', async () => {
    mocks.ledger.mockReturnValue(
      ledgerStateFor([2n], undefined, [foreignEnvelope, registration]),
    );
    const { context, authoriser, encryptionKey, accountRecords } =
      createContext({ stored: record });

    const signedIn = signIn(context);
    await expect(signedIn).rejects.toThrow(EncryptionKeyMismatchError);
    await expect(signedIn).rejects.toThrow(accountAddress);
    expect(encryptionKey.openInbox).not.toHaveBeenCalled();
    expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with the keyring refusal when none of this device envelopes opens the ledger enc_key, before the rescan and any record write', async () => {
    const { context, authoriser, encryptionKey, accountRecords } =
      createContext({ stored: record });
    encryptionKey.openInbox.mockRejectedValue(new EncryptionKeyMismatchError());

    await expect(signIn(context)).rejects.toThrow(EncryptionKeyMismatchError);
    expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  describe('rebuilding the bookkeeping of grants this device issued', () => {
    beforeEach(() => {
      mocks.readGrants.mockReturnValue([issuedRecord]);
    });

    const openingParts = (parts: GrantRecordPart[]) =>
      opening(
        new Map<Uint8Array, OpenedInboxEntry>(
          [envelope, foreignEnvelope, registration].map((entry, index) => [
            entry,
            { kind: 'grant', record: parts[index] },
          ]),
        ),
      );

    it('rebuilds a grant the record lacks from parts that open its on-chain commitments, with the seal of the live key', async () => {
      const { context, encryptionKey, accountRecords } = createContext({
        stored: record,
      });
      encryptionKey.openInbox.mockImplementation(openingParts(issuedParts()));

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [issuedGrantId]: rebuiltGrant } }),
      );
      expect(mocks.readGrants).toHaveBeenLastCalledWith(
        expect.anything(),
        new Map([[issuedGrantId, GrantSlot(2)]]),
        new Map([
          [
            issuedGrantId,
            {
              scopeSalt: issuedSalt,
              granteeScheme: 'jubjub-schnorr',
              granteePublicKey,
              origin: rpId,
              color: TokenColor(issuedObject.color),
              recipient: issuedObject.recipient,
              maxCoinValue: issuedObject.maxCoinValue,
              view: { readPublicKey, seal, sealedEncKey: encKeyHex },
            },
          ],
        ]),
      );
    });

    it('keeps the read key alone when the newest view holds another key', async () => {
      const { context, encryptionKey, accountRecords } = createContext({
        stored: record,
      });
      encryptionKey.openInbox.mockImplementation(
        openingParts(issuedParts({ encKeyPrefix: 'ffffff' })),
      );

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({
          grants: {
            [issuedGrantId]: { ...rebuiltGrant, view: { readPublicKey } },
          },
        }),
      );
    });

    it.each([
      [
        'a salt that does not open the object commitment',
        (parts: GrantRecordPart[]) => [
          { ...parts[0], scopeSalt: GrantScopeSalt('5b'.repeat(32)) },
          ...parts.slice(1),
        ],
      ],
      [
        'a slot the grant id does not derive from',
        (parts: GrantRecordPart[]) => [
          { ...parts[0], slot: GrantSlot(3) },
          ...parts.slice(1),
        ],
      ],
      [
        'a read key the contract does not hold the hash of',
        (parts: GrantRecordPart[]) => [
          { ...parts[0], readPublicKey: '12'.repeat(32) },
          ...parts.slice(1),
        ],
      ],
      [
        'no read key for a grant that reads',
        (parts: GrantRecordPart[]) => {
          const [grant, ...rest] = parts;
          const { readPublicKey: _readPublicKey, ...withoutRead } =
            grant as Extract<GrantRecordPart, { part: 'grant' }>;
          return [withoutRead, ...rest];
        },
      ],
      [
        'no object part',
        (parts: GrantRecordPart[]) => [parts[0], parts[2], parts[2]],
      ],
    ])('leaves out a grant whose parts carry %s', async (_case, tamper) => {
      const { context, encryptionKey, accountRecords } = createContext({
        stored: record,
      });
      encryptionKey.openInbox.mockImplementation(
        openingParts(tamper(issuedParts()) as GrantRecordPart[]),
      );

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
    });

    it('never overwrites the bookkeeping the record still holds while it opens the chain', async () => {
      const held = {
        ...rebuiltGrant,
        view: { readPublicKey, seal: '5d'.repeat(94), sealedEncKey: encKeyHex },
      };
      const { context, encryptionKey, accountRecords } = createContext({
        stored: { ...record, grants: { [issuedGrantId]: held } },
      });
      encryptionKey.openInbox.mockImplementation(openingParts(issuedParts()));

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [issuedGrantId]: held } }),
      );
    });

    it('takes the rebuilt seal of the live key over a held seal of an earlier one, and reports nothing unsealed', async () => {
      const held = {
        ...rebuiltGrant,
        view: {
          readPublicKey,
          seal: '5d'.repeat(94),
          sealedEncKey: '0f'.repeat(32),
        },
      };
      const { context, encryptionKey, accountRecords } = createContext({
        stored: { ...record, grants: { [issuedGrantId]: held } },
      });
      encryptionKey.openInbox.mockImplementation(openingParts(issuedParts()));

      await expect(signIn(context)).resolves.toMatchObject({
        unsealedGrantIds: [],
      });
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [issuedGrantId]: rebuiltGrant } }),
      );
    });

    it('replaces a held entry whose salt does not open the object commitment with the rebuilt grant', async () => {
      const { context, encryptionKey, accountRecords } = createContext({
        stored: {
          ...record,
          grants: {
            [issuedGrantId]: {
              ...rebuiltGrant,
              scopeSalt: GrantScopeSalt('5b'.repeat(32)),
            },
          },
        },
      });
      encryptionKey.openInbox.mockImplementation(openingParts(issuedParts()));

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [issuedGrantId]: rebuiltGrant } }),
      );
    });

    describe('issued to a secp256k1 grantee', () => {
      const k256Grantee = {
        scheme: 'secp256k1-ecdsa' as const,
        publicKey: HexBytes.fromByteArray(
          secp256k1.Point.BASE.multiply(0x5eed_c0ffeen).toBytes(true),
        ),
      };
      const flippedParity = `${
        k256Grantee.publicKey.startsWith('02') ? '03' : '02'
      }${k256Grantee.publicKey.slice(2)}`;

      /**
       * The k256 grant as the chain holds it, and its grant and object
       * parts as this device's grant records carry them: sealed into
       * inbox entries and opened back, as a sign-in finds them.
       */
      const k256Issued = async () => {
        const issued = await issuedGrant({
          address: accountAddress,
          origin: rpId,
          grantee: k256Grantee,
          slot: 0,
        });
        const readerSecret = x25519.utils.randomSecretKey();
        const account = AccAddress(accountAddress);
        const reopened = async (part: GrantRecordPart) =>
          openGrantRecord(
            readerSecret,
            account,
            await sealGrantRecord(readerSecret, account, part),
          );
        const grant = await reopened({
          part: 'grant',
          grantId: issued.id,
          slot: GrantSlot(0),
          scopeSalt: GrantScopeSalt(issued.stored.scopeSalt),
          granteeScheme: k256Grantee.scheme,
          granteePublicKey: k256Grantee.publicKey,
        });
        const object = await reopened({
          part: 'object',
          grantId: issued.id,
          object: issued.stored.object!,
        });
        mocks.readGrants.mockReturnValue([issued.onChain()]);
        return {
          issued,
          parts: [grant, object] as Extract<
            GrantRecordPart,
            { part: 'grant' | 'object' }
          >[],
        };
      };

      const openingK256 = ([grant, object]: GrantRecordPart[]) =>
        opening(
          new Map<Uint8Array, OpenedInboxEntry>([
            [envelope, { kind: 'grant', record: grant }],
            [foreignEnvelope, { kind: 'grant', record: object }],
          ]),
        );

      it('rebuilds it under its scheme from its on-chain records once the local record is lost', async () => {
        const { issued, parts } = await k256Issued();
        const { context, encryptionKey, accountRecords } = createContext({
          stored: record,
        });
        encryptionKey.openInbox.mockImplementation(openingK256(parts));

        await signIn(context);

        expect(parts[0]).toMatchObject({
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: k256Grantee.publicKey,
        });
        expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
          healed({ grants: { [issued.id]: issued.stored } }),
        );
        expect(mocks.readGrants).toHaveBeenLastCalledWith(
          expect.anything(),
          new Map([[issued.id, GrantSlot(0)]]),
          new Map([[issued.id, issued.opening]]),
        );
      });

      it.each([
        [
          'the jubjub scheme over its x coordinate',
          (grant: Extract<GrantRecordPart, { part: 'grant' }>) => ({
            ...grant,
            granteeScheme: 'jubjub-schnorr' as const,
            granteePublicKey: grant.granteePublicKey.slice(2),
          }),
        ],
        [
          'the other parity of its key',
          (grant: Extract<GrantRecordPart, { part: 'grant' }>) => ({
            ...grant,
            granteePublicKey: flippedParity,
          }),
        ],
      ])('leaves it out when its grant part names %s', async (_case, forge) => {
        const { parts } = await k256Issued();
        const [grant, object] = parts as [
          Extract<GrantRecordPart, { part: 'grant' }>,
          GrantRecordPart,
        ];
        const { context, encryptionKey, accountRecords } = createContext({
          stored: record,
        });
        encryptionKey.openInbox.mockImplementation(
          openingK256([forge(grant), object]),
        );

        await signIn(context);

        expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
      });

      it('leaves out a jubjub grant whose grant part claims the secp256k1 scheme', async () => {
        const [grant, ...rest] = issuedParts();
        const { context, encryptionKey, accountRecords } = createContext({
          stored: record,
        });
        encryptionKey.openInbox.mockImplementation(
          openingParts([
            {
              ...grant,
              granteeScheme: 'secp256k1-ecdsa',
              granteePublicKey: `02${granteePublicKey}`,
            } as GrantRecordPart,
            ...rest,
          ]),
        );

        await signIn(context);

        expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
      });
    });

    it('rebuilds nothing on a host with no relying party id', async () => {
      const { context, encryptionKey, accountRecords } = createContext({
        stored: record,
      });
      context.rpId = undefined;
      encryptionKey.openInbox.mockImplementation(openingParts(issuedParts()));

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
    });
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

  describe('checking the bookkeeping the record holds', () => {
    beforeEach(() => {
      mocks.readGrants.mockReturnValue([issuedRecord]);
    });

    it('reads the grant roster from the contract with the slots and openings the record kept, and returns it', async () => {
      const ledgerState = ledgerStateFor([2n]);
      mocks.ledger.mockReturnValue(ledgerState);
      const { context } = createContext({
        stored: { ...record, grants: { [issuedGrantId]: rebuiltGrant } },
      });

      await expect(signIn(context)).resolves.toMatchObject({
        grants: [issuedRecord],
      });
      expect(mocks.readGrants).toHaveBeenCalledTimes(2);
      expect(mocks.readGrants).toHaveBeenNthCalledWith(1, ledgerState);
      expect(mocks.readGrants).toHaveBeenNthCalledWith(
        2,
        ledgerState,
        new Map([[issuedGrantId, GrantSlot(2)]]),
        new Map([
          [
            issuedGrantId,
            {
              scopeSalt: issuedSalt,
              granteeScheme: 'jubjub-schnorr',
              granteePublicKey,
              origin: rpId,
              color: TokenColor(issuedObject.color),
              recipient: issuedObject.recipient,
              maxCoinValue: issuedObject.maxCoinValue,
              view: { readPublicKey, seal, sealedEncKey: encKeyHex },
            },
          ],
        ]),
      );
    });

    it('keeps an entry issued under another origin than this host, checked against the origin it kept', async () => {
      const otherOrigin = 'other.example';
      const otherGrantId = deriveGrantId({
        contractAddress: ByteArray.fromHex(HexBytes(accountAddress)),
        granteePublicKey: { scheme: 'jubjub-schnorr', point: grantee.pk },
        originHash: await originHash(otherOrigin),
        slot: GrantSlot(2),
      });
      const held = { ...rebuiltGrant, origin: otherOrigin };
      mocks.readGrants.mockReturnValue([{ ...issuedRecord, id: otherGrantId }]);
      const { context, accountRecords } = createContext({
        stored: { ...record, grants: { [otherGrantId]: held } },
      });

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [otherGrantId]: held } }),
      );
    });

    it('keeps the bookkeeping of grants the chain still holds in the healed record and drops the rest', async () => {
      const { context, accountRecords } = createContext({
        stored: {
          ...record,
          grants: {
            [issuedGrantId]: rebuiltGrant,
            [revokedGrantId]: { ...rebuiltGrant, slot: 4 },
          },
        },
      });

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ grants: { [issuedGrantId]: rebuiltGrant } }),
      );
    });

    it.each([
      [
        'a salt that does not open the object commitment, as when another client issued over the same id',
        { ...rebuiltGrant, scopeSalt: GrantScopeSalt('5b'.repeat(32)) },
      ],
      [
        'an origin the grant id does not derive from',
        { ...rebuiltGrant, origin: 'other.example' },
      ],
      [
        'a read key the contract does not hold the hash of',
        { ...rebuiltGrant, view: { readPublicKey: '12'.repeat(32) } },
      ],
      [
        'no object fields, which cannot be checked',
        (({ object: _object, ...rest }) => rest)(rebuiltGrant),
      ],
    ])(
      'drops an entry with %s, and attaches no opening for it',
      async (_case, held) => {
        const ledgerState = ledgerStateFor([2n]);
        mocks.ledger.mockReturnValue(ledgerState);
        const { context, accountRecords } = createContext({
          stored: { ...record, grants: { [issuedGrantId]: held } },
        });

        await signIn(context);

        expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
        expect(mocks.readGrants).toHaveBeenLastCalledWith(
          ledgerState,
          new Map(),
          new Map(),
        );
      },
    );

    it('writes no grant bookkeeping once the chain holds none of the stored grants', async () => {
      mocks.readGrants.mockReturnValue([]);
      const { context, accountRecords } = createContext({
        stored: { ...record, grants: { [issuedGrantId]: rebuiltGrant } },
      });

      await signIn(context);

      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
    });
  });

  describe('reporting the read grants whose seal is behind the live key', () => {
    const storedWith = (
      view: (typeof rebuiltGrant)['view'] | { readPublicKey: string },
    ) => ({
      ...record,
      grants: { [issuedGrantId]: { ...rebuiltGrant, view } },
    });

    it.each([
      [
        'a seal of an earlier enc_key',
        { readPublicKey, seal, sealedEncKey: '0f'.repeat(32) },
      ],
      [
        'no seal, as after an issue that failed before sealing',
        { readPublicKey },
      ],
    ])(
      'reports a live read grant whose kept view holds %s',
      async (_case, view) => {
        mocks.readGrants.mockReturnValue([issuedRecord]);
        const { context } = createContext({ stored: storedWith(view) });

        await expect(signIn(context)).resolves.toMatchObject({
          unsealedGrantIds: [issuedGrantId],
        });
      },
    );

    it('reports none when the kept seal holds the live enc_key', async () => {
      mocks.readGrants.mockReturnValue([issuedRecord]);
      const { context } = createContext({
        stored: storedWith(rebuiltGrant.view),
      });

      await expect(signIn(context)).resolves.toMatchObject({
        unsealedGrantIds: [],
      });
    });

    it('reports none for a revoked read grant', async () => {
      mocks.readGrants.mockReturnValue([{ ...issuedRecord, active: false }]);
      const { context } = createContext({
        stored: storedWith({ readPublicKey }),
      });

      await expect(signIn(context)).resolves.toMatchObject({
        unsealedGrantIds: [],
      });
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
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        healed({ localUseCounter: '5' }),
      );
    });
    await expect(
      Promise.race([signedIn, Promise.resolve('pending')]),
    ).resolves.toBe('pending');

    release();
    await expect(signedIn).resolves.toMatchObject({ localUseCounter: '5' });
  });

  it('completes a pending record whose key entries landed, dropping the deployment from the healed write', async () => {
    const { context, accountRecords } = createContext({
      stored: pendingRecord,
    });

    await expect(signIn(context)).resolves.toMatchObject({
      account: { address: accountAddress, status: 'ready' },
      localUseCounter: '2',
    });
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(healed());
    await expect(accountRecords.read()).resolves.not.toHaveProperty(
      'deployment',
    );
  });

  it.each([
    [
      'whose account is not activated',
      { ...ledgerStateFor([2n]), booted: false },
    ],
    [
      'whose key entries the inbox does not hold yet',
      ledgerStateFor([2n], undefined, [envelope]),
    ],
  ])(
    'rejects with AccountCreationPendingError for a pending record %s, before the keys and the rescan',
    async (_case, ledgerState) => {
      mocks.ledger.mockReturnValue(ledgerState);
      const { context, authoriser, encryptionKey, accountRecords } =
        createContext({ stored: pendingRecord });

      const signedIn = signIn(context);
      await expect(signedIn).rejects.toThrow(AccountCreationPendingError);
      await expect(signedIn).rejects.toThrow(accountAddress);
      expect(encryptionKey.openInbox).not.toHaveBeenCalled();
      expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
      expect(accountRecords.write).not.toHaveBeenCalled();
      await expect(accountRecords.read()).resolves.toEqual(pendingRecord);
    },
  );

  it('recognises a completed record whatever the boot flag says', async () => {
    mocks.ledger.mockReturnValue({ ...ledgerStateFor([2n]), booted: false });
    const { context } = createContext({ stored: record });

    await expect(signIn(context)).resolves.toMatchObject({
      localUseCounter: '2',
    });
  });

  it('rejects with a failed reader key resolution before the rescan', async () => {
    const { context, authoriser, encryptionKey, accountRecords } =
      createContext({ stored: record });
    const cancelled = new CeremonyCancelledError();
    encryptionKey.readerPublicKey.mockRejectedValue(cancelled);

    await expect(signIn(context)).rejects.toBe(cancelled);
    expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
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

  it('runs the whole flow, the key opening included, inside one key session when the authoriser exposes one', async () => {
    const {
      context,
      authoriser,
      withKeySession,
      encryptionKey,
      accountRecords,
    } = createContext({ keySession: true, stored: record });
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
      return record;
    });
    encryptionKey.openInbox.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      return [];
    });

    await signIn(context);

    expect(withKeySession).toHaveBeenCalledOnce();
    expect(authoriser.devicePublicKey).toHaveBeenCalledOnce();
    expect(inSession).toEqual([true, true]);
  });

  it('names the sign-in flow to the key session', async () => {
    const { context, withKeySession } = createContext({
      keySession: true,
      stored: record,
    });

    await signIn(context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { kind: 'sign-in' },
    );
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
