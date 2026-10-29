import {
  AccAddress,
  AccountContractMissingError,
  AccountNotFoundError,
  CeremonyCancelledError,
  DeviceCommitmentHex,
  DeviceEpoch,
  EncryptionKeyMismatchError,
  GrantId,
  GrantIssueRejectedError,
  GrantLimitReachedError,
  GrantNotFoundError,
  GrantOriginMissingError,
  GrantRevokedError,
  GrantRosterUnsettledError,
  GrantScopeInvalidError,
  GrantSlot,
  MAX_GRANTS,
  NotAuthorisedError,
  ReadUnavailableError,
  TokenColor,
  UseCounter,
} from '@lace-contract/passport';
import { deriveSymmetricSecret, sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import {
  prepareAppendInbox,
  prepareRotateEncKey,
} from '../../src/acc/enc-key-rotation';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
  openGrantRecord,
} from '../../src/acc/envelopes';
import { GRANTEE_WITHDRAWAL_CIRCUITS } from '../../src/acc/grant-circuits';
import {
  circuitScope,
  deriveGrantId,
  granteePoint,
  originHash,
  scopeArgs,
  scopeDigest,
} from '../../src/acc/grants';
import { sealInboxEntry } from '../../src/acc/inbox';
import { JubjubDevice } from '../../src/acc/signer';
import {
  issueGrant,
  revokeAllGrants,
  revokeGrant,
} from '../../src/flows/grants';
import { readShieldedHoldings } from '../../src/flows/holdings';
import { AccountSim } from '../acc/account-sim';
import { isLiveSecret, openGrantViewSeal } from '../acc/view-seal-reference';

import { issuedGrant } from './issued-grant';

import type * as AccModule from '../../src/acc/acc-module';
import type * as GatedCall from '../../src/acc/gated-call';
import type * as ReadGrants from '../../src/acc/read-grants';
import type { IssueGrantInput, RevokeGrantInput } from '../../src/flows/grants';
import type {
  AccountRecords,
  FlowContext,
  FlowStage,
  PassportAccountRecord,
} from '../../src/flows/types';
import type { ContractActionRecord } from '../../src/infra/indexer';
import type {
  GrantRecord,
  GrantScopeInput,
  PassportAccountInfo,
  PassportAuthoriser,
  PassportDevice,
  PassportEncryptionKey,
  ShieldedCoin,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({
  createIndexerClient: vi.fn(),
  ledger: vi.fn(),
  readGrants: vi.fn(),
  createMidnightProviders: vi.fn(),
  connectAccountHandle: vi.fn(),
  executeGatedCall: vi.fn(),
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

const accountAddress = 'ac'.repeat(32);
const localCommitment = '11'.repeat(32);
const nextLocalCommitment = '1a'.repeat(32);
const remoteCommitment = '22'.repeat(32);
const rpId = 'lace.io';
const deviceEpoch = 4n;

/** The seed of the dev encryption key the contract-sim flows seal under. */
const simEncryptionSeed = new Uint8Array(64).fill(0x41);

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
const remoteDevice: PassportDevice = {
  commitmentHex: remoteCommitment,
  isLocal: false,
};
/** The grantee withdrawals of both schemes, as an account deployed here holds them. */
const INSTALLED_WITHDRAWALS = Object.values(GRANTEE_WITHDRAWAL_CIRCUITS).flat();
/**
 * The operations an account deployed before secp256k1 grantees holds: the
 * deposits, the jubjub device arm and the grant circuits of a jubjub
 * grantee.
 */
const JUBJUB_ONLY_OPERATIONS = [
  'deposit_unshielded',
  'deposit_shielded',
  ...[
    'activate_initial_device',
    'withdraw_unshielded',
    'append_inbox',
    'withdraw_shielded',
    'withdraw_shielded_to_contract',
    'rotate_enc_key',
    'add_device',
    'remove_device',
    'issue_grant',
    'revoke_grant',
    'revoke_all_grants',
  ].map(base => `${base}_with_jubjub`),
  ...GRANTEE_WITHDRAWAL_CIRCUITS['jubjub-schnorr'],
];

const contractState = {
  data: 'charged-state',
  operations: () => INSTALLED_WITHDRAWALS,
};
const ledgerReads = { authNonce: 0n };
/** The decoded ledger, whose auth nonce advances on every read so chained calls settle. */
const decodedLedgerState = {
  tag: 'decoded-ledger-state',
  device_epoch: deviceEpoch,
  get auth_nonce(): bigint {
    ledgerReads.authNonce += 1n;
    return ledgerReads.authNonce;
  },
};
const providers = { tag: 'midnight-providers' };
const handle = { callTx: {} };
const record: PassportAccountRecord = {
  address: accountAddress,
  bindingVersion: account.bindingVersion,
  localUseCounter: '2',
};

const grantee = new JubjubDevice(55n);
const granteePublicKey = HexBytes.fromByteArray(
  jubjub.Point.fromAffine(grantee.pk).toBytes(),
);

const spendScope: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: granteePublicKey },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};

/** A grantee's X25519 read key pair, from a fixed secret. */
const readKeyPair = (byte: number) => {
  const secretKey = new Uint8Array(32).fill(byte);
  return {
    secretKey,
    publicKey: HexBytes.fromByteArray(x25519.getPublicKey(secretKey)),
  };
};
const readKey = readKeyPair(0x51);

/** A scope that shares the viewing secret with the grantee. */
const readScope: GrantScopeInput = {
  ...spendScope,
  operations: ['withdraw-unshielded', 'withdraw-shielded'],
  read: true,
  rpId,
  readPublicKey: readKey.publicKey,
};

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

/** The id the flow derives for the grantee's first slot under this host. */
const expectedGrantId = async (slot = 0): Promise<GrantId> =>
  deriveGrantId({
    contractAddress: ByteArray.fromHex(HexBytes(accountAddress)),
    granteePublicKey: { scheme: 'jubjub-schnorr', point: grantee.pk },
    originHash: await originHash(rpId),
    slot: GrantSlot(slot),
  });

/** A spend grant this client issued to the grantee at `slot` under this host. */
const issuedSpendGrant = async (slot: number) =>
  issuedGrant({ address: accountAddress, origin: rpId, grantee, slot });

const callInput = () => ({
  account,
  devices: [localDevice, remoteDevice],
  localUseCounter: '2',
});

const issueInput = (
  overrides: Partial<IssueGrantInput> = {},
): IssueGrantInput => ({
  ...callInput(),
  scope: spendScope,
  ...overrides,
});

const revokeInput = (grantId: GrantId): RevokeGrantInput => ({
  ...callInput(),
  grantId,
});

const createAccountRecords = (stored?: PassportAccountRecord) => {
  let current = stored;
  const records: AccountRecords = {
    read: vi.fn(async () => current),
    write: vi.fn(async (next: PassportAccountRecord) => {
      current = next;
    }),
    presence: vi.fn(async () => (current ? ('complete' as const) : 'absent')),
  };
  return records;
};

type ContextOptions = {
  keySession?: boolean;
  /** The stored record; null for a device whose storage holds none. */
  stored?: PassportAccountRecord | null;
  authoriser?: PassportAuthoriser;
  encryptionKey?: PassportEncryptionKey;
  /** Whether the host runs under a relying party id. */
  withRpId?: boolean;
};

const createContext = ({
  keySession = false,
  stored = record,
  authoriser: given,
  encryptionKey: givenKey,
  withRpId = true,
}: ContextOptions = {}) => {
  const withKeySession = vi.fn(async (operation: () => Promise<unknown>) =>
    operation(),
  );
  const authoriser = given ?? {
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
  const encryptionKey = givenKey ?? {
    readerPublicKey: vi.fn(),
    createKeys: vi.fn(),
    sealToDevice: vi.fn(),
    openInbox: vi.fn(),
    sealGrant: vi.fn<PassportEncryptionKey['sealGrant']>(async () => []),
    reencryptInbox: vi.fn(),
    sealView: vi.fn(),
  };
  const sponsor = { balanceAndSign: vi.fn() };
  const prover = { prove: vi.fn(), check: vi.fn() };
  const accountRecords = createAccountRecords(stored ?? undefined);
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
    rpId: withRpId ? rpId : undefined,
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

const queryContractState = vi.fn(
  async (): Promise<{ data: unknown; operations: () => string[] }> =>
    contractState,
);

/** The roster the chain reads as, before and after the gated call. */
const chainRoster = (before: GrantRecord[], after: GrantRecord[]) => {
  let current = before;
  mocks.readGrants.mockImplementation(() => current);
  mocks.executeGatedCall.mockImplementation(async () => {
    current = after;
    return UseCounter(3n);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  queryContractState.mockResolvedValue(contractState);
  mocks.createIndexerClient.mockReturnValue({ queryContractState });
  mocks.ledger.mockReturnValue(decodedLedgerState);
  mocks.readGrants.mockReturnValue([]);
  mocks.createMidnightProviders.mockResolvedValue(providers);
  mocks.connectAccountHandle.mockResolvedValue(handle);
  mocks.executeGatedCall.mockResolvedValue(UseCounter(3n));
});

describe('issueGrant', () => {
  it('submits issue_grant_with_jubjub over the prepared call and returns the id, the roster read back and the refreshed devices', async () => {
    const grantId = await expectedGrantId();
    const issued = grantRecord(grantId);
    chainRoster([], [issued]);
    const { context, authoriser, prover, sponsor } = createContext();

    await expect(issueGrant(issueInput(), context)).resolves.toEqual({
      grantId,
      grants: [issued],
      devices: [refreshedLocalDevice, remoteDevice],
      localUseCounter: '3',
      unsealedGrantIds: [],
      revocationPendingGrantIds: [],
    });

    expect(mocks.createIndexerClient).toHaveBeenCalledExactlyOnceWith({
      indexerUrl: network.indexerUrl,
      indexerWsUrl: network.indexerWsUrl,
    });
    expect(queryContractState).toHaveBeenCalledTimes(4);
    expect(queryContractState).toHaveBeenCalledWith(accountAddress);
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
      circuit: 'issue_grant_with_jubjub',
      args: expect.arrayContaining([
        ByteArray.fromHex(HexBytes(grantId)),
      ]) as unknown,
      address: accountAddress,
      ledgerState: decodedLedgerState,
      knownUseCounter: 2n,
    });
    const [{ args }] = mocks.executeGatedCall.mock.calls[0] as unknown as [
      { args: unknown[] },
    ];
    expect(args).toHaveLength(18);
    expect(args[0]).toEqual(ByteArray.fromHex(HexBytes(grantId)));
    expect(args.at(-1)).toBeInstanceOf(Uint8Array);
  });

  it('writes the slot, scope salt, grantee key with its scheme and origin under the id before the call, with the counter unchanged, then again with the advanced counter before the roster is read back', async () => {
    const grantId = await expectedGrantId();
    const roster: GrantRecord[] = [];
    const order: string[] = [];
    mocks.readGrants.mockImplementation(() => {
      order.push('read');
      return roster;
    });
    mocks.executeGatedCall.mockImplementation(async () => {
      order.push('call');
      roster.push(grantRecord(grantId));
      return UseCounter(3n);
    });
    const { context, accountRecords } = createContext();
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      order.push('write');
    });

    await expect(issueGrant(issueInput(), context)).resolves.toMatchObject({
      grantId,
    });

    expect(order).toEqual(['read', 'write', 'call', 'write', 'read']);
    const bookkeeping = {
      slot: 0,
      scopeSalt: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey,
      origin: rpId,
      object: {
        color: '00'.repeat(32),
        recipient: { kind: 'any' },
        maxCoinValue: '300',
      },
    };
    const [[pending], [completed]] = vi.mocked(accountRecords.write).mock
      .calls as unknown as [PassportAccountRecord][];
    expect(pending).toEqual({
      ...record,
      localUseCounter: '2',
      grants: { [grantId]: bookkeeping },
    });
    expect(completed).toEqual({
      ...record,
      localUseCounter: '3',
      grants: { [grantId]: bookkeeping },
    });
    expect(completed.grants?.[grantId]?.scopeSalt).toBe(
      pending.grants?.[grantId]?.scopeSalt,
    );
    expect(mocks.readGrants).toHaveBeenLastCalledWith(
      decodedLedgerState,
      new Map([[grantId, GrantSlot(0)]]),
      new Map([
        [
          grantId,
          {
            scopeSalt: bookkeeping.scopeSalt,
            granteeScheme: 'jubjub-schnorr',
            granteePublicKey,
            origin: rpId,
            color: TokenColor('00'.repeat(32)),
            recipient: { kind: 'any' },
            maxCoinValue: '300',
          },
        ],
      ]),
    );
  });

  it('seals the grant bookkeeping to this device on the account once the grant shows active and appends it, recorded', async () => {
    const grantId = await expectedGrantId();
    chainRoster([], [grantRecord(grantId)]);
    const { context, encryptionKey, accountRecords, stages } = createContext();
    const entries = [new Uint8Array(192).fill(1), new Uint8Array(192).fill(2)];
    vi.mocked(encryptionKey.sealGrant).mockResolvedValue(entries);

    await expect(issueGrant(issueInput(), context)).resolves.toMatchObject({
      localUseCounter: '3',
    });

    const stored = (await accountRecords.read())?.grants?.[grantId];
    expect(encryptionKey.sealGrant).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
      AccAddress(accountAddress),
      {
        grantId,
        slot: GrantSlot(0),
        scopeSalt: stored?.scopeSalt,
        granteeScheme: 'jubjub-schnorr',
        granteePublicKey,
        object: {
          color: '00'.repeat(32),
          recipient: { kind: 'any' },
          maxCoinValue: '300',
        },
      },
    );
    expect(mocks.readGrants.mock.invocationCallOrder.at(-1)).toBeLessThan(
      vi.mocked(encryptionKey.sealGrant).mock.invocationCallOrder[0],
    );
    expect(mocks.executeGatedCall).toHaveBeenCalledTimes(3);
    expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        circuit: 'append_inbox_with_jubjub',
        args: [entries[0]],
      }),
    );
    expect(mocks.executeGatedCall).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        circuit: 'append_inbox_with_jubjub',
        args: [entries[1]],
      }),
    );
    expect(stages).toEqual(['confirming', 'recording']);
  });

  it('issues to a secp256k1 grantee under its k256 grant id and seals bookkeeping naming its scheme', async () => {
    const k256Grantee = {
      scheme: 'secp256k1-ecdsa' as const,
      publicKey: HexBytes.fromByteArray(
        secp256k1.Point.BASE.multiply(0x5eed_c0ffeen).toBytes(true),
      ),
    };
    const grantId = deriveGrantId({
      contractAddress: ByteArray.fromHex(HexBytes(accountAddress)),
      granteePublicKey: granteePoint(k256Grantee),
      originHash: await originHash(rpId),
      slot: GrantSlot(0),
    });
    chainRoster([], [grantRecord(grantId)]);
    const { context, encryptionKey } = createContext();
    vi.mocked(encryptionKey.sealGrant).mockResolvedValue([]);

    await expect(
      issueGrant(
        issueInput({ scope: { ...spendScope, grantee: k256Grantee } }),
        context,
      ),
    ).resolves.toMatchObject({ grantId });

    expect(encryptionKey.sealGrant).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
      AccAddress(accountAddress),
      expect.objectContaining({
        grantId,
        granteeScheme: 'secp256k1-ecdsa',
        granteePublicKey: k256Grantee.publicKey,
      }),
    );
  });

  it('allocates the next slot past the grants the chain holds for this grantee and origin, keeping the earlier bookkeeping', async () => {
    const issued = await issuedSpendGrant(0);
    const first = issued.id;
    const second = await expectedGrantId(1);
    chainRoster([issued.onChain()], [issued.onChain(), grantRecord(second)]);
    const storedFirst = issued.stored;
    const { context, accountRecords } = createContext({
      stored: { ...record, grants: { [first]: storedFirst } },
    });

    await expect(issueGrant(issueInput(), context)).resolves.toMatchObject({
      grantId: second,
    });

    await expect(accountRecords.read()).resolves.toMatchObject({
      grants: {
        [first]: storedFirst,
        [second]: expect.objectContaining({ slot: 1 }) as unknown,
      },
    });
  });

  it('reports the proving and sponsoring stages the transaction enters, then confirming while the roster is read back', async () => {
    const grantId = await expectedGrantId();
    chainRoster([], [grantRecord(grantId)]);
    mocks.createMidnightProviders.mockImplementation(
      async ({ onStage }: { onStage: (stage: FlowStage) => void }) => {
        onStage('proving');
        onStage('sponsoring');
        return providers;
      },
    );
    const { context, stages } = createContext();
    const stagesAtEachRead: FlowStage[][] = [];
    mocks.readGrants.mockImplementation(() => {
      stagesAtEachRead.push([...stages]);
      return mocks.executeGatedCall.mock.calls.length > 0
        ? [grantRecord(grantId)]
        : [];
    });

    await issueGrant(issueInput(), context);

    expect(stages).toEqual(['proving', 'sponsoring', 'confirming']);
    expect(stagesAtEachRead).toEqual([
      [],
      ['proving', 'sponsoring', 'confirming'],
    ]);
  });

  it.each([
    [
      'a read grant without a read public key',
      { ...spendScope, read: true, rpId },
      'A read grant requires the read public key',
    ],
    [
      'a shielded operation',
      { ...spendScope, operations: ['withdraw-shielded'] as const },
      'shielded spend requires read',
    ],
    [
      'a shielded-to-contract operation',
      {
        ...spendScope,
        operations: ['withdraw-shielded-to-contract'] as const,
      },
      'shielded spend requires read',
    ],
    [
      'a rolling window',
      {
        ...spendScope,
        window: { lengthSeconds: 3600, cap: '100' },
      } as GrantScopeInput,
      'the contract reserves the window bounds',
    ],
    [
      'a cap below the per-call cap',
      { ...spendScope, cap: '1' },
      'cap must not be below the per-call cap',
    ],
  ])(
    'refuses %s with GrantScopeInvalidError before any prompt or call',
    async (_name, scope, reason) => {
      const { context, withKeySession, accountRecords } = createContext({
        keySession: true,
      });

      const issued = issueGrant(issueInput({ scope }), context);
      await expect(issued).rejects.toThrow(GrantScopeInvalidError);
      await expect(issued).rejects.toThrow(reason);
      expect(withKeySession).not.toHaveBeenCalled();
      expect(mocks.executeGatedCall).not.toHaveBeenCalled();
      expect(accountRecords.read).not.toHaveBeenCalled();
      expect(accountRecords.write).not.toHaveBeenCalled();
    },
  );

  it('refuses a sixteenth active grant with GrantLimitReachedError before any prompt, counting active grants only', async () => {
    const active = Array.from({ length: MAX_GRANTS }, (_, index) =>
      grantRecord(GrantId(index.toString(16).padStart(64, '0'))),
    );
    mocks.readGrants.mockReturnValue(active);
    const { context, withKeySession } = createContext({ keySession: true });

    await expect(issueGrant(issueInput(), context)).rejects.toThrow(
      GrantLimitReachedError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
  });

  it('issues past revoked grants, which do not count towards the limit', async () => {
    const grantId = await expectedGrantId();
    const tombstones = Array.from({ length: MAX_GRANTS }, (_, index) =>
      grantRecord(GrantId(index.toString(16).padStart(64, '0')), false),
    );
    chainRoster(tombstones, [...tombstones, grantRecord(grantId)]);
    const { context } = createContext();

    await expect(issueGrant(issueInput(), context)).resolves.toMatchObject({
      grantId,
    });
  });

  it('refuses to issue without a relying party id with GrantOriginMissingError, before the chain is read', async () => {
    const { context } = createContext({ withRpId: false });

    await expect(issueGrant(issueInput(), context)).rejects.toThrow(
      GrantOriginMissingError,
    );
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
  });

  it('rejects with AccountContractMissingError for a dead or unknown contract', async () => {
    const { context, accountRecords } = createContext();
    queryContractState.mockResolvedValueOnce(null as never);

    await expect(issueGrant(issueInput(), context)).rejects.toThrow(
      AccountContractMissingError,
    );
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountNotFoundError when the record is gone, before any ceremony', async () => {
    const { context, withKeySession, accountRecords } = createContext({
      stored: null,
      keySession: true,
    });

    await expect(issueGrant(issueInput(), context)).rejects.toThrow(
      AccountNotFoundError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountNotFoundError when the record vanishes between the presence check and the session, before the call', async () => {
    const { context, accountRecords } = createContext();
    vi.mocked(accountRecords.read).mockResolvedValue(undefined);

    await expect(issueGrant(issueInput(), context)).rejects.toThrow(
      AccountNotFoundError,
    );
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it.each([
    [
      'GrantIssueRejectedError',
      'failed assert: grant already active',
      GrantIssueRejectedError,
    ],
    [
      'NotAuthorisedError',
      'failed assert: invalid signature',
      NotAuthorisedError,
    ],
    [
      'NotAuthorisedError',
      'failed assert: unknown device entry',
      NotAuthorisedError,
    ],
  ])(
    'rejects with %s for the abort "%s" and leaves the counter where it was',
    async (_className, abortMessage, errorClass) => {
      const { context, accountRecords } = createContext();
      mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));

      const issued = issueGrant(issueInput(), context);
      await expect(issued).rejects.toThrow(errorClass);
      await expect(issued).rejects.toThrow(abortMessage);
      expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ localUseCounter: '2' }),
      );
    },
  );

  it('rejects with an untyped failure unchanged and leaves the counter where it was', async () => {
    const { context, accountRecords } = createContext();
    const failure = new Error('node unreachable');
    mocks.executeGatedCall.mockRejectedValue(failure);

    await expect(issueGrant(issueInput(), context)).rejects.toBe(failure);
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ localUseCounter: '2' }),
    );
  });

  it('overwrites the stale bookkeeping a call that never landed left under the same id', async () => {
    const grantId = await expectedGrantId();
    const stale = {
      slot: 0,
      scopeSalt: '07'.repeat(32),
      granteePublicKey,
      origin: rpId,
    };
    chainRoster([], [grantRecord(grantId)]);
    const { context, accountRecords } = createContext({
      stored: { ...record, grants: { [grantId]: stale } },
    });

    await expect(issueGrant(issueInput(), context)).resolves.toMatchObject({
      grantId,
    });

    const stored = await accountRecords.read();
    expect(Object.keys(stored?.grants ?? {})).toEqual([grantId]);
    expect(stored?.grants?.[grantId]).toMatchObject({ slot: 0 });
    expect(stored?.grants?.[grantId]?.scopeSalt).not.toBe(stale.scopeSalt);
  });

  it('rejects with the cancelled ceremony unchanged', async () => {
    const { context } = createContext();
    const cancelled = new CeremonyCancelledError();
    mocks.executeGatedCall.mockRejectedValue(cancelled);

    await expect(issueGrant(issueInput(), context)).rejects.toBe(cancelled);
  });

  it('runs the record read, the call and the record write inside one key session, named with the grant, its scope and what re-derives them', async () => {
    const grantId = await expectedGrantId();
    chainRoster([], [grantRecord(grantId)]);
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
      return record;
    });
    mocks.executeGatedCall.mockImplementation(async () => {
      inSession.push(isSessionOpen);
      mocks.readGrants.mockReturnValue([grantRecord(grantId)]);
      return UseCounter(3n);
    });
    vi.mocked(accountRecords.write).mockImplementation(async () => {
      inSession.push(isSessionOpen);
    });

    await issueGrant(issueInput(), context);

    const [[written]] = vi.mocked(accountRecords.write).mock.calls;
    const scopeSalt = written?.grants?.[grantId]?.scopeSalt;
    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        kind: 'issue-grant',
        grantId,
        scope: spendScope,
        account: accountAddress,
        slot: 0,
        scopeSalt,
        scopeDigest: HexBytes.fromByteArray(
          scopeDigest(
            ByteArray.fromHex(HexBytes(scopeSalt ?? '')),
            scopeArgs(circuitScope(spendScope)),
          ),
        ),
      },
    );
    expect(inSession).toEqual([true, true, true, true]);
  });

  describe('when the indexer lags the accepted call', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Waits for the flow to read the roster once after the call, when it first sleeps. */
    const untilFirstPoll = async () =>
      vi.waitFor(() => {
        expect(mocks.readGrants).toHaveBeenCalledTimes(2);
      });

    it('reads the roster again until the grant shows active', async () => {
      const grantId = await expectedGrantId();
      mocks.readGrants
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValue([grantRecord(grantId)]);
      const { context } = createContext();

      const issued = issueGrant(issueInput(), context);
      await untilFirstPoll();
      await vi.advanceTimersByTimeAsync(2000);

      await expect(issued).resolves.toMatchObject({
        grants: [grantRecord(grantId)],
      });
      expect(mocks.readGrants).toHaveBeenCalledTimes(4);
      expect(queryContractState).toHaveBeenCalledTimes(6);
    });

    it('rejects with GrantRosterUnsettledError once the roster never reflects the call, with the record already written', async () => {
      const { context, accountRecords } = createContext();

      const issued = issueGrant(issueInput(), context);
      const settled = issued.catch((error: unknown) => error);
      await untilFirstPoll();
      await vi.advanceTimersByTimeAsync(30_000);

      await expect(settled).resolves.toBeInstanceOf(GrantRosterUnsettledError);
      await expect(settled).resolves.toMatchObject({
        message: expect.stringContaining('never reflected') as unknown,
      });
      expect(accountRecords.write).toHaveBeenCalledTimes(2);
      expect(accountRecords.write).toHaveBeenLastCalledWith(
        expect.objectContaining({ localUseCounter: '3' }),
      );
    });
  });
});

describe('revokeGrant', () => {
  const grantId = GrantId('ab'.repeat(32));
  const storedGrant = {
    slot: 3,
    scopeSalt: '07'.repeat(32),
    granteePublicKey,
    origin: rpId,
  };

  it('submits revoke_grant_with_jubjub over the id and returns the roster with the grant inactive', async () => {
    const issued = await issuedSpendGrant(3);
    const grantId = issued.id;
    const storedGrant = issued.stored;
    chainRoster([issued.onChain()], [issued.onChain(false)]);
    const { context, authoriser, accountRecords } = createContext({
      stored: { ...record, grants: { [grantId]: storedGrant } },
    });

    await expect(revokeGrant(revokeInput(grantId), context)).resolves.toEqual({
      grants: [issued.onChain(false)],
      devices: [refreshedLocalDevice, remoteDevice],
      localUseCounter: '3',
      unsealedGrantIds: [],
      revocationPendingGrantIds: [],
    });

    expect(mocks.executeGatedCall).toHaveBeenCalledExactlyOnceWith({
      handle,
      authoriser,
      circuit: 'revoke_grant_with_jubjub',
      args: [ByteArray.fromHex(HexBytes(grantId))],
      address: accountAddress,
      ledgerState: decodedLedgerState,
      knownUseCounter: 2n,
    });
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith({
      ...record,
      localUseCounter: '3',
      grants: { [grantId]: storedGrant },
    });
    expect(mocks.readGrants).toHaveBeenLastCalledWith(
      decodedLedgerState,
      new Map([[grantId, GrantSlot(3)]]),
      new Map([[grantId, issued.opening]]),
    );
  });

  it('drops a kept entry that does not open the grant the chain holds under its id, as one a failed issue left before another client issued there', async () => {
    const target = await issuedSpendGrant(3);
    const landed = await issuedSpendGrant(0);
    const stale = { ...landed.stored, scopeSalt: '08'.repeat(32) };
    chainRoster(
      [landed.onChain(), target.onChain()],
      [landed.onChain(), target.onChain(false)],
    );
    const { context, accountRecords } = createContext({
      stored: {
        ...record,
        grants: { [landed.id]: stale, [target.id]: target.stored },
      },
    });

    await revokeGrant(revokeInput(target.id), context);

    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith({
      ...record,
      localUseCounter: '3',
      grants: { [target.id]: target.stored },
    });
    expect(mocks.readGrants).toHaveBeenLastCalledWith(
      decodedLedgerState,
      new Map([[target.id, GrantSlot(3)]]),
      new Map([[target.id, target.opening]]),
    );
  });

  it('refuses a grant the chain does not hold with GrantNotFoundError before any prompt', async () => {
    const { context, withKeySession, accountRecords } = createContext({
      keySession: true,
    });

    const revoked = revokeGrant(revokeInput(grantId), context);
    await expect(revoked).rejects.toThrow(GrantNotFoundError);
    await expect(revoked).rejects.toThrow(grantId);
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('refuses a grant the chain lists inactive with GrantRevokedError before any prompt', async () => {
    mocks.readGrants.mockReturnValue([grantRecord(grantId, false)]);
    const { context, withKeySession, accountRecords } = createContext({
      keySession: true,
      stored: { ...record, grants: { [grantId]: storedGrant } },
    });

    const revoked = revokeGrant(revokeInput(grantId), context);
    await expect(revoked).rejects.toThrow(GrantRevokedError);
    await expect(revoked).rejects.toThrow(grantId);
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it('rejects with AccountNotFoundError when the record is gone, before any ceremony', async () => {
    mocks.readGrants.mockReturnValue([grantRecord(grantId)]);
    const { context, withKeySession, accountRecords } = createContext({
      stored: null,
      keySession: true,
    });

    await expect(revokeGrant(revokeInput(grantId), context)).rejects.toThrow(
      AccountNotFoundError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
  });

  it.each([
    ['GrantNotFoundError', 'failed assert: unknown grant', GrantNotFoundError],
    ['GrantRevokedError', 'failed assert: grant not live', GrantRevokedError],
    [
      'NotAuthorisedError',
      'failed assert: invalid signature',
      NotAuthorisedError,
    ],
  ])(
    'rejects with %s for the abort "%s"',
    async (_className, abortMessage, errorClass) => {
      mocks.readGrants.mockReturnValue([grantRecord(grantId)]);
      mocks.executeGatedCall.mockRejectedValue(new Error(abortMessage));
      const { context, accountRecords } = createContext();

      const revoked = revokeGrant(revokeInput(grantId), context);
      await expect(revoked).rejects.toThrow(errorClass);
      await expect(revoked).rejects.toThrow(abortMessage);
      expect(accountRecords.write).not.toHaveBeenCalled();
    },
  );

  it('names the revoke-grant flow and the grant id to the key session', async () => {
    chainRoster([grantRecord(grantId)], [grantRecord(grantId, false)]);
    const { context, withKeySession } = createContext({ keySession: true });

    await revokeGrant(revokeInput(grantId), context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { kind: 'revoke-grant', grantId, account: AccAddress(accountAddress) },
    );
  });
});

describe('revokeAllGrants', () => {
  const grantId = GrantId('ab'.repeat(32));

  it('submits revoke_all_grants_with_jubjub, drops the grant bookkeeping and returns the emptied roster', async () => {
    chainRoster([grantRecord(grantId)], []);
    const { context, authoriser, accountRecords } = createContext({
      stored: {
        ...record,
        grants: {
          [grantId]: {
            slot: 0,
            scopeSalt: '07'.repeat(32),
            granteePublicKey,
            origin: rpId,
          },
        },
      },
    });

    await expect(revokeAllGrants(callInput(), context)).resolves.toEqual({
      grants: [],
      devices: [refreshedLocalDevice, remoteDevice],
      localUseCounter: '3',
      unsealedGrantIds: [],
      revocationPendingGrantIds: [],
    });

    expect(mocks.executeGatedCall).toHaveBeenCalledExactlyOnceWith({
      handle,
      authoriser,
      circuit: 'revoke_all_grants_with_jubjub',
      args: [],
      address: accountAddress,
      ledgerState: decodedLedgerState,
      knownUseCounter: 2n,
    });
    expect(accountRecords.write).toHaveBeenCalledExactlyOnceWith({
      ...record,
      localUseCounter: '3',
    });
  });

  it('names the revoke-all-grants flow to the key session', async () => {
    const { context, withKeySession } = createContext({ keySession: true });

    await revokeAllGrants(callInput(), context);

    expect(withKeySession).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { kind: 'revoke-all-grants', account: AccAddress(accountAddress) },
    );
  });

  describe('when only tombstones were listed before the call', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('reads the roster again until the map is cleared rather than settling on no grant being active', async () => {
      const tombstone = grantRecord(grantId, false);
      mocks.readGrants
        .mockReturnValueOnce([tombstone])
        .mockReturnValueOnce([tombstone])
        .mockReturnValueOnce([tombstone])
        .mockReturnValue([]);
      const { context } = createContext();

      const cleared = revokeAllGrants(callInput(), context);
      await vi.waitFor(() => {
        expect(mocks.readGrants).toHaveBeenCalledTimes(2);
      });
      await vi.advanceTimersByTimeAsync(2000);

      await expect(cleared).resolves.toMatchObject({ grants: [] });
      expect(mocks.readGrants).toHaveBeenCalledTimes(4);
    });
  });

  it('rejects with an untyped failure unchanged and leaves the record unwritten', async () => {
    const { context, accountRecords } = createContext();
    mocks.executeGatedCall.mockRejectedValue('submission lost');

    await expect(revokeAllGrants(callInput(), context)).rejects.toBe(
      'submission lost',
    );
    expect(accountRecords.write).not.toHaveBeenCalled();
  });
});

describe('grant flows against the contract', () => {
  /** The flows over an in-process contract, with the chain mocks replaced by the simulator. */
  const createSimContext = async (
    options?: Parameters<typeof AccountSim.create>[0],
  ) => {
    const [accModule, gatedCall, readGrantsModule] = await Promise.all([
      vi.importActual<typeof AccModule>('../../src/acc/acc-module'),
      vi.importActual<typeof GatedCall>('../../src/acc/gated-call'),
      vi.importActual<typeof ReadGrants>('../../src/acc/read-grants'),
    ]);
    const sim = await AccountSim.create(options);
    mocks.ledger.mockImplementation(accModule.ledger);
    mocks.readGrants.mockImplementation(readGrantsModule.readGrants);
    mocks.executeGatedCall.mockImplementation(gatedCall.executeGatedCall);
    mocks.connectAccountHandle.mockResolvedValue(sim.handle());
    queryContractState.mockImplementation(async () => sim.contractState());
    const simAccount: PassportAccountInfo = {
      ...account,
      address: sim.account,
    };
    const harness = createContext({
      authoriser: sim.authoriser,
      encryptionKey: devEncryptionKey(simEncryptionSeed),
      stored: { ...record, address: sim.account, localUseCounter: '0' },
    });
    const localCommitmentAt = async (counter: bigint) =>
      sim.authoriser.deviceCommitment(
        sim.account,
        DeviceEpoch(sim.ledger().device_epoch),
        UseCounter(counter),
      );
    const input = async (counter: bigint) => ({
      account: simAccount,
      devices: [
        { commitmentHex: await localCommitmentAt(counter), isLocal: true },
      ],
      localUseCounter: counter.toString(),
    });
    return { sim, harness, input, localCommitmentAt };
  };

  it('issues, revokes and revokes all through the real circuits, keeping the record and the roster in step and the bookkeeping on chain', async () => {
    const { sim, harness, input, localCommitmentAt } = await createSimContext();
    const { context, accountRecords } = harness;

    const issued = await issueGrant(
      { ...(await input(0n)), scope: spendScope },
      context,
    );
    expect(issued.grants).toHaveLength(1);
    expect(issued.grants[0]).toMatchObject({
      id: issued.grantId,
      slot: 0,
      active: true,
      scope: { operations: ['withdraw-unshielded'], cap: '450' },
    });
    expect(issued.devices).toEqual([
      { commitmentHex: await localCommitmentAt(3n), isLocal: true },
    ]);
    expect(issued.localUseCounter).toBe('3');
    expect(sim.ledger().inbox_count).toBe(2n);
    await expect(accountRecords.read()).resolves.toMatchObject({
      localUseCounter: '3',
      grants: { [issued.grantId]: { slot: 0, origin: rpId } },
    });

    const second = await issueGrant(
      { ...(await input(3n)), scope: spendScope },
      context,
    );
    expect(second.grants.map(({ slot }) => slot).sort()).toEqual([0, 1]);

    const revoked = await revokeGrant(
      { ...(await input(6n)), grantId: second.grantId },
      context,
    );
    expect(
      revoked.grants.find(({ id }) => id === second.grantId),
    ).toMatchObject({ active: false, slot: 1 });
    expect(
      revoked.grants.find(({ id }) => id === issued.grantId),
    ).toMatchObject({ active: true });
    await expect(accountRecords.read()).resolves.toMatchObject({
      localUseCounter: '7',
      grants: {
        [issued.grantId]: { slot: 0 },
        [second.grantId]: { slot: 1 },
      },
    });

    const cleared = await revokeAllGrants(await input(7n), context);
    expect(cleared.grants).toEqual([]);
    expect(cleared.localUseCounter).toBe('8');
    expect(sim.ledger().grants.isEmpty()).toBe(true);
    await expect(accountRecords.read()).resolves.toEqual({
      address: sim.account,
      bindingVersion: record.bindingVersion,
      localUseCounter: '8',
    });
  });

  it('refuses a secp256k1 grant on an account deployed with the jubjub grantee withdrawals only, before any call, and still issues a jubjub grant there', async () => {
    const { sim, harness, input } = await createSimContext({
      operations: JUBJUB_ONLY_OPERATIONS,
    });
    const { context, accountRecords } = harness;
    const k256Grantee = {
      scheme: 'secp256k1-ecdsa' as const,
      publicKey: HexBytes.fromByteArray(
        secp256k1.Point.BASE.multiply(0x5eed_c0ffeen).toBytes(true),
      ),
    };

    await expect(
      issueGrant(
        {
          ...(await input(0n)),
          scope: { ...spendScope, grantee: k256Grantee },
        },
        context,
      ),
    ).rejects.toThrow(
      new GrantScopeInvalidError(
        'the account cannot serve a secp256k1-ecdsa grantee, it lacks withdraw_unshielded_with_grant_k256, withdraw_shielded_with_grant_k256, withdraw_shielded_to_contract_with_grant_k256',
      ),
    );
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    expect(accountRecords.write).not.toHaveBeenCalled();
    expect(sim.ledger().grants.isEmpty()).toBe(true);

    const issued = await issueGrant(
      { ...(await input(0n)), scope: spendScope },
      context,
    );
    expect(issued.grants).toEqual([
      expect.objectContaining({ id: issued.grantId, active: true }),
    ]);
  });

  it('issues to a secp256k1 grantee through the real circuits and seals its grant records, keeping its scheme in the record', async () => {
    const { sim, harness, input } = await createSimContext();
    const { context, accountRecords } = harness;
    const k256Grantee = {
      scheme: 'secp256k1-ecdsa' as const,
      publicKey: HexBytes.fromByteArray(
        secp256k1.Point.BASE.multiply(0x5eed_c0ffeen).toBytes(true),
      ),
    };

    const issued = await issueGrant(
      { ...(await input(0n)), scope: { ...spendScope, grantee: k256Grantee } },
      context,
    );

    expect(issued.grants).toEqual([
      expect.objectContaining({ id: issued.grantId, slot: 0, active: true }),
    ]);
    expect(sim.ledger().inbox_count).toBe(2n);
    const readerSecret = deriveSymmetricSecret(simEncryptionSeed, {
      domain: 'lace-passport:reader:v1',
      context: network.networkId,
      length: 32,
    });
    const opened = await Promise.all(
      [0n, 1n].map(async ordinal =>
        openGrantRecord(
          readerSecret,
          AccAddress(sim.account),
          sim.ledger().inbox.lookup(ordinal),
        ),
      ),
    );
    const grantPart = opened.find(part => part?.part === 'grant');
    expect(grantPart).toMatchObject({
      grantId: issued.grantId,
      granteeScheme: 'secp256k1-ecdsa',
      granteePublicKey: k256Grantee.publicKey,
    });
    expect(
      grantPart?.part === 'grant' &&
        ByteArray.fromHex(HexBytes(grantPart.granteePublicKey)).length,
    ).toBe(33);
    await expect(accountRecords.read()).resolves.toMatchObject({
      localUseCounter: '3',
      grants: {
        [issued.grantId]: {
          slot: 0,
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: k256Grantee.publicKey,
        },
      },
    });
  });

  it('refuses to revoke a grant it already revoked, before the circuit runs', async () => {
    const { sim, harness, input } = await createSimContext();
    const { context, accountRecords } = harness;
    const issued = await issueGrant(
      { ...(await input(0n)), scope: spendScope },
      context,
    );
    const revoked = await revokeGrant(
      { ...(await input(3n)), grantId: issued.grantId },
      context,
    );
    expect(revoked.grants).toEqual([
      expect.objectContaining({ id: issued.grantId, active: false }),
    ]);
    const recordAfterRevoke = await accountRecords.read();
    mocks.createMidnightProviders.mockClear();
    mocks.executeGatedCall.mockClear();

    const again = revokeGrant(
      { ...(await input(4n)), grantId: issued.grantId },
      context,
    );
    await expect(again).rejects.toThrow(GrantRevokedError);
    await expect(again).rejects.toThrow(issued.grantId);
    expect(mocks.createMidnightProviders).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
    await expect(accountRecords.read()).resolves.toEqual(recordAfterRevoke);
    expect(sim.ledger().grants.isEmpty()).toBe(false);
  });

  it('types the contract abort of a revoke that races an already revoked grant as GrantRevokedError', async () => {
    const { sim, harness, input } = await createSimContext();
    const issued = await issueGrant(
      { ...(await input(0n)), scope: spendScope },
      harness.context,
    );
    const revokeInputAt1 = { ...(await input(3n)), grantId: issued.grantId };
    await sim.gated(
      {
        circuit: 'revoke_grant_with_jubjub',
        args: [ByteArray.fromHex(HexBytes(issued.grantId))],
      },
      UseCounter(3n),
    );
    mocks.readGrants.mockReturnValueOnce([grantRecord(issued.grantId)]);

    await expect(revokeGrant(revokeInputAt1, harness.context)).rejects.toThrow(
      GrantRevokedError,
    );
  });

  it('types the contract abort of a revoke that races a vanished grant as GrantNotFoundError', async () => {
    const { sim, harness, input } = await createSimContext();
    const issued = await issueGrant(
      { ...(await input(0n)), scope: spendScope },
      harness.context,
    );
    const revokeInputAt1 = { ...(await input(3n)), grantId: issued.grantId };
    await sim.gated(
      { circuit: 'revoke_all_grants_with_jubjub', args: [] },
      UseCounter(3n),
    );
    mocks.readGrants.mockReturnValueOnce([grantRecord(issued.grantId)]);

    await expect(revokeGrant(revokeInputAt1, harness.context)).rejects.toThrow(
      GrantNotFoundError,
    );
  });
});

describe('read grants', () => {
  const readGrantRecord = (id: GrantId, active = true): GrantRecord => {
    const base = grantRecord(id, active);
    return { ...base, scope: { ...base.scope, read: true } };
  };

  /** An encryption key that opens entries but cannot share the secret. */
  const deviceOnlyKey = (): PassportEncryptionKey => ({
    readerPublicKey: vi.fn(),
    createKeys: vi.fn(),
    sealToDevice: vi.fn(),
    openInbox: vi.fn(),
    sealGrant: vi.fn(async () => []),
  });

  it('refuses a read grant with ReadUnavailableError when the key cannot share the secret, before the chain is read and any prompt', async () => {
    const { context, withKeySession } = createContext({
      keySession: true,
      encryptionKey: deviceOnlyKey(),
    });

    await expect(
      issueGrant(issueInput({ scope: readScope }), context),
    ).rejects.toThrow(ReadUnavailableError);
    expect(mocks.createIndexerClient).not.toHaveBeenCalled();
    expect(withKeySession).not.toHaveBeenCalled();
  });

  it('refuses to revoke a read grant, or revoke all while one is live, with ReadUnavailableError before any prompt when the key cannot share the secret', async () => {
    const grantId = GrantId('ab'.repeat(32));
    mocks.readGrants.mockReturnValue([readGrantRecord(grantId)]);
    const { context, withKeySession } = createContext({
      keySession: true,
      encryptionKey: deviceOnlyKey(),
    });

    await expect(revokeGrant(revokeInput(grantId), context)).rejects.toThrow(
      ReadUnavailableError,
    );
    await expect(revokeAllGrants(callInput(), context)).rejects.toThrow(
      ReadUnavailableError,
    );
    expect(withKeySession).not.toHaveBeenCalled();
    expect(mocks.executeGatedCall).not.toHaveBeenCalled();
  });

  it('lets a spend-only key revoke a spend grant and revoke all without a read grant live', async () => {
    const grantId = GrantId('ab'.repeat(32));
    chainRoster([grantRecord(grantId)], [grantRecord(grantId, false)]);
    const { context, withKeySession } = createContext({
      keySession: true,
      encryptionKey: deviceOnlyKey(),
    });

    await expect(
      revokeGrant(revokeInput(grantId), context),
    ).resolves.toMatchObject({ localUseCounter: '3' });
    expect(withKeySession).toHaveBeenLastCalledWith(expect.any(Function), {
      kind: 'revoke-grant',
      grantId,
      account: AccAddress(accountAddress),
    });
  });

  describe('against the contract', () => {
    const seed = new Uint8Array(64).fill(0x42);
    const secondGrantee = HexBytes.fromByteArray(
      jubjub.Point.fromAffine(new JubjubDevice(56n).pk).toBytes(),
    );
    const secondReadKey = readKeyPair(0x52);
    const secondReadScope: GrantScopeInput = {
      ...readScope,
      grantee: { scheme: 'jubjub-schnorr', publicKey: secondGrantee },
      readPublicKey: secondReadKey.publicKey,
    };
    /** The use counter the device sits at once the account keys are on chain. */
    const start = 2n;

    const coin = (value: bigint): ShieldedCoin => ({
      nonce: crypto.getRandomValues(new Uint8Array(32)),
      color: crypto.getRandomValues(new Uint8Array(32)),
      value,
    });

    /**
     * The flows over an in-process contract and a key, with an indexer
     * whose history and shielded outputs are whatever the sim did: every
     * circuit call is one action, and every deposit one transaction whose
     * shielded output carries the commitment the contract claimed. The
     * account is created with random keys and this device's envelope and
     * registration appended, as the create flow leaves it.
     */
    const createSimContext = async () => {
      const [accModule, gatedCall, readGrantsModule] = await Promise.all([
        vi.importActual<typeof AccModule>('../../src/acc/acc-module'),
        vi.importActual<typeof GatedCall>('../../src/acc/gated-call'),
        vi.importActual<typeof ReadGrants>('../../src/acc/read-grants'),
      ]);
      const encryptionKey = devEncryptionKey(seed);
      const readerPublicKey = await encryptionKey.readerPublicKey(
        network.networkId,
      );
      const scalar = 77n;
      const keys = await encryptionKey.createKeys(network.networkId, {
        devicePublicKey: encodeDevicePublicKey(new JubjubDevice(scalar).pk),
      });
      const sim = await AccountSim.create({ encKey: keys.encKey, scalar });
      mocks.ledger.mockImplementation(accModule.ledger);
      mocks.executeGatedCall.mockImplementation(gatedCall.executeGatedCall);
      await sim.gated(prepareAppendInbox(keys.envelopes[0]), UseCounter(0n));
      await sim.gated(
        prepareAppendInbox(keys.registrations[0]),
        UseCounter(1n),
      );
      const actions: ContractActionRecord[] = [];
      const outputs = new Map<string, unknown[]>();
      let nextIndex = 10n;
      /** Circuits whose next call fails before it reaches the contract. */
      const failing = new Set<string>();
      /** Whether the first append after a rotation fails, as an interrupted rotation leaves it. */
      const interrupt = { afterRotate: false, isRotated: false };
      const action = (entryPoint: string): ContractActionRecord => {
        const recorded: ContractActionRecord = {
          kind: 'ContractCall',
          entryPoint,
          txHash: `tx-${actions.length}`,
          identifiers: [],
          blockHeight: actions.length,
        };
        actions.push(recorded);
        return recorded;
      };
      const simHandle = sim.handle();
      const handle = {
        callTx: Object.fromEntries(
          Object.entries(simHandle.callTx).map(([circuit, call]) => [
            circuit,
            async (...args: unknown[]) => {
              if (failing.delete(circuit)) {
                throw new Error(`${circuit} lost`);
              }
              if (
                interrupt.afterRotate &&
                interrupt.isRotated &&
                circuit === 'append_inbox_with_jubjub'
              ) {
                interrupt.afterRotate = false;
                throw new Error(`${circuit} lost`);
              }
              const result = await call(...args);
              if (circuit === 'rotate_enc_key_with_jubjub') {
                interrupt.isRotated = true;
              }
              action(circuit);
              return result;
            },
          ]),
        ),
      };
      /** A deposit sealed to `key`, the live enc_key unless one is named. */
      const deposit = async (
        deposited: ShieldedCoin,
        key: Uint8Array = sim.ledger().enc_key,
      ) => {
        const commitment = await sim.deposit(
          deposited,
          await sealInboxEntry(key, deposited),
        );
        const { txHash } = action('deposit_shielded');
        outputs.set(txHash, [
          { commitment, contractAddress: sim.account, index: nextIndex },
        ]);
        nextIndex += 1n;
        return commitment;
      };
      mocks.ledger.mockImplementation(accModule.ledger);
      mocks.readGrants.mockImplementation(readGrantsModule.readGrants);
      mocks.executeGatedCall.mockImplementation(gatedCall.executeGatedCall);
      mocks.connectAccountHandle.mockResolvedValue(handle);
      queryContractState.mockImplementation(async () => sim.contractState());
      mocks.createIndexerClient.mockReturnValue({
        queryContractState,
        enumerateContractActions: vi.fn(async () => actions),
        queryShieldedEvents: vi.fn(async (txHash: string) => ({
          outputs: outputs.get(txHash) ?? [],
          nullifiers: [],
        })),
      });
      const simAccount: PassportAccountInfo = {
        ...account,
        address: sim.account,
      };
      const harness = createContext({
        authoriser: sim.authoriser,
        encryptionKey,
        stored: { ...record, address: sim.account, localUseCounter: '2' },
      });
      const input = async (counter: bigint) => ({
        account: simAccount,
        devices: [
          {
            commitmentHex: await sim.authoriser.deviceCommitment(
              sim.account,
              DeviceEpoch(sim.ledger().device_epoch),
              UseCounter(counter),
            ),
            isLocal: true,
          },
        ],
        localUseCounter: counter.toString(),
      });
      const inbox = () => {
        const ledger = sim.ledger();
        const entries: Uint8Array[] = [];
        for (let ordinal = 0n; ordinal < ledger.inbox_count; ordinal += 1n) {
          entries.push(ledger.inbox.lookup(ordinal));
        }
        return entries;
      };
      /**
       * The coins the inbox opens to under the live secret alone, from
       * this device's newest envelope: what a rotation moved forward.
       */
      const liveHoldings = async () => {
        const entries = inbox();
        const opened = await encryptionKey.openInbox(
          network.networkId,
          {
            account: sim.account,
            encKey: sim.ledger().enc_key,
            envelopes: deviceEnvelopes(entries, readerPublicKey).slice(0, 1),
          },
          entries,
        );
        return opened.flatMap(entry =>
          entry?.kind === 'coin' ? [entry.coin] : [],
        );
      };
      return {
        sim,
        harness,
        input,
        deposit,
        liveHoldings,
        actions,
        failing,
        interrupt,
      };
    };

    const openSeal = async (
      seal: string | undefined,
      secretKey: Uint8Array,
      { grantId, address }: { grantId: GrantId; address: string },
    ) =>
      openGrantViewSeal(secretKey, ByteArray.fromHex(HexBytes(seal ?? '')), {
        grantId,
        account: AccAddress(address),
      });

    it('names the live device entries to the key session of a rotating issue and revocation, and none to a spend issue', async () => {
      const { sim, harness, input } = await createSimContext();
      const flows: unknown[] = [];
      harness.context.seams.passportAuthoriser = {
        ...sim.authoriser,
        withKeySession: async (operation, flow) => {
          flows.push(flow);
          return operation();
        },
      };
      const liveEntries = () =>
        [...sim.ledger().devices].map(entry => HexBytes.fromByteArray(entry));
      const before = liveEntries();

      const issued = await issueGrant(
        { ...(await input(start)), scope: readScope },
        harness.context,
      );
      const afterIssue = liveEntries();
      await revokeGrant(
        {
          ...(await input(BigInt(issued.localUseCounter))),
          grantId: issued.grantId,
        },
        harness.context,
      );

      expect(flows[0]).toMatchObject({ kind: 'issue-grant', devices: before });
      expect(flows[1]).toMatchObject({
        kind: 'revoke-grant',
        read: true,
        devices: afterIssue,
      });
    });

    it('issues a read grant: rotates enc_key to a fresh secret sealed to this device, re-encrypts the live holdings, lands the grant and keeps its bookkeeping and seal on chain', async () => {
      const { sim, harness, input, deposit, liveHoldings, actions } =
        await createSimContext();
      const { context, accountRecords, stages } = harness;
      const first = coin(5n);
      const second = coin(6n);
      await deposit(first);
      await deposit(second);
      await sim.call('deposit_shielded', coin(1n), new Uint8Array(192));
      const createdKey = sim.ledger().enc_key;

      const issued = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );

      expect(sim.ledger().enc_key).not.toEqual(createdKey);
      expect(issued.encKey).toBe(HexBytes.fromByteArray(sim.ledger().enc_key));
      expect(sim.ledger().inbox_count).toBe(11n);
      expect(await liveHoldings()).toEqual([first, second]);
      expect(actions.map(({ entryPoint }) => entryPoint).slice(2)).toEqual([
        'append_inbox_with_jubjub',
        'rotate_enc_key_with_jubjub',
        'append_inbox_with_jubjub',
        'append_inbox_with_jubjub',
        'issue_grant_with_jubjub',
        'append_inbox_with_jubjub',
        'append_inbox_with_jubjub',
        'append_inbox_with_jubjub',
      ]);
      expect(issued.localUseCounter).toBe('10');
      expect(stages).toEqual([
        'rotating',
        'reencrypting',
        'confirming',
        'recording',
      ]);
      const grant = issued.grants.find(({ id }) => id === issued.grantId);
      expect(grant).toMatchObject({
        active: true,
        scope: {
          operations: ['withdraw-unshielded', 'withdraw-shielded'],
          read: true,
          readPkHash: HexBytes.fromByteArray(
            sha256(ByteArray.fromHex(HexBytes(readKey.publicKey))),
          ),
        },
        opening: {
          view: {
            readPublicKey: readKey.publicKey,
            seal: expect.stringMatching(/^[\da-f]{188}$/) as unknown,
            sealedEncKey: issued.encKey,
          },
        },
      });
      const stored = await accountRecords.read();
      expect(stored?.grants?.[issued.grantId]?.view).toMatchObject({
        readPublicKey: readKey.publicKey,
        sealedEncKey: issued.encKey,
      });
      const secret = await openSeal(
        grant?.opening?.view?.seal,
        readKey.secretKey,
        { grantId: issued.grantId, address: sim.account },
      );
      expect(isLiveSecret(secret, sim.ledger().enc_key)).toBe(true);
    });

    it('re-seals the new secret to every other live read grant on a later issue, so both keep reading', async () => {
      const { sim, harness, input, deposit } = await createSimContext();
      const { context } = harness;
      await deposit(coin(7n));
      const first = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );

      const second = await issueGrant(
        {
          ...(await input(BigInt(first.localUseCounter))),
          scope: secondReadScope,
        },
        context,
      );

      expect(second.encKey).not.toBe(first.encKey);
      expect(second.encKey).toBe(HexBytes.fromByteArray(sim.ledger().enc_key));
      const firstSeal = second.grants.find(({ id }) => id === first.grantId)
        ?.opening?.view?.seal;
      const secondSeal = second.grants.find(({ id }) => id === second.grantId)
        ?.opening?.view?.seal;
      for (const [seal, pair, grantId] of [
        [firstSeal, readKey, first.grantId],
        [secondSeal, secondReadKey, second.grantId],
      ] as const) {
        const secret = await openSeal(seal, pair.secretKey, {
          grantId,
          address: sim.account,
        });
        expect(isLiveSecret(secret, sim.ledger().enc_key)).toBe(true);
      }
    });

    it('revokes a read grant: rotates again, blinds the revoked key to the current holdings and re-seals the remaining read grant', async () => {
      const { sim, harness, input, deposit, liveHoldings } =
        await createSimContext();
      const { context, accountRecords, stages } = harness;
      const held = coin(8n);
      await deposit(held);
      const first = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );
      const second = await issueGrant(
        {
          ...(await input(BigInt(first.localUseCounter))),
          scope: secondReadScope,
        },
        context,
      );
      const revokedSecret = await openSeal(
        second.grants.find(({ id }) => id === first.grantId)?.opening?.view
          ?.seal,
        readKey.secretKey,
        { grantId: first.grantId, address: sim.account },
      );
      stages.length = 0;

      const revoked = await revokeGrant(
        {
          ...(await input(BigInt(second.localUseCounter))),
          grantId: first.grantId,
        },
        context,
      );

      expect(revoked.encKey).toBe(HexBytes.fromByteArray(sim.ledger().enc_key));
      expect(stages).toEqual([
        'rotating',
        'reencrypting',
        'recording',
        'confirming',
      ]);
      expect(isLiveSecret(revokedSecret, sim.ledger().enc_key)).toBe(false);
      expect(await liveHoldings()).toEqual([held]);
      expect(
        revoked.grants.find(({ id }) => id === first.grantId),
      ).toMatchObject({ active: false });
      expect(
        revoked.grants.find(({ id }) => id === first.grantId)?.opening?.view,
      ).toBeUndefined();
      const remaining = revoked.grants.find(({ id }) => id === second.grantId);
      const remainingSecret = await openSeal(
        remaining?.opening?.view?.seal,
        secondReadKey.secretKey,
        { grantId: second.grantId, address: sim.account },
      );
      expect(isLiveSecret(remainingSecret, sim.ledger().enc_key)).toBe(true);
      const stored = await accountRecords.read();
      expect(stored?.grants?.[first.grantId]?.view).toEqual({
        readPublicKey: readKey.publicKey,
      });
      expect(stored?.grants?.[second.grantId]?.view?.sealedEncKey).toBe(
        revoked.encKey,
      );
    });

    it('revokes all: rotates once while a read grant is live and not when only spend grants are', async () => {
      const { sim, harness, input, deposit, liveHoldings, actions } =
        await createSimContext();
      const { context, accountRecords } = harness;
      const held = coin(9n);
      await deposit(held);
      const createdKey = sim.ledger().enc_key;
      const spend = await issueGrant(
        { ...(await input(start)), scope: spendScope },
        context,
      );
      const cleared = await revokeAllGrants(
        await input(BigInt(spend.localUseCounter)),
        context,
      );
      expect(sim.ledger().enc_key).toEqual(createdKey);
      expect(cleared.grants).toEqual([]);
      expect(cleared.encKey).toBeUndefined();

      const read = await issueGrant(
        { ...(await input(BigInt(cleared.localUseCounter))), scope: readScope },
        context,
      );
      const readSecret = await openSeal(
        read.grants[0]?.opening?.view?.seal,
        readKey.secretKey,
        { grantId: read.grantId, address: sim.account },
      );
      const clearedAgain = await revokeAllGrants(
        await input(BigInt(read.localUseCounter)),
        context,
      );

      expect(clearedAgain.encKey).toBe(
        HexBytes.fromByteArray(sim.ledger().enc_key),
      );
      expect(isLiveSecret(readSecret, sim.ledger().enc_key)).toBe(false);
      expect(await liveHoldings()).toEqual([held]);
      expect(clearedAgain.grants).toEqual([]);
      expect(
        actions.filter(
          ({ entryPoint }) => entryPoint === 'rotate_enc_key_with_jubjub',
        ),
      ).toHaveLength(2);
      await expect(accountRecords.read()).resolves.not.toHaveProperty('grants');
    });

    it('refuses with EncryptionKeyMismatchError when none of this device envelopes opens enc_key, before submitting anything, and so does the holdings read', async () => {
      const { sim, harness, input, deposit, actions } =
        await createSimContext();
      const { context, stages } = harness;
      await deposit(coin(4n));
      const issued = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );
      const elsewhere = x25519.getPublicKey(x25519.utils.randomSecretKey());
      const counter = await sim.gated(
        prepareRotateEncKey(elsewhere),
        UseCounter(BigInt(issued.localUseCounter)),
      );
      stages.length = 0;
      const landed = actions.length;

      await expect(
        revokeGrant(
          { ...(await input(counter)), grantId: issued.grantId },
          context,
        ),
      ).rejects.toThrow(EncryptionKeyMismatchError);
      await expect(
        readShieldedHoldings({ account: (await input(0n)).account }, context),
      ).rejects.toThrow(EncryptionKeyMismatchError);
      expect(stages).not.toContain('rotating');
      expect(actions).toHaveLength(landed);
      expect(sim.ledger().enc_key).toEqual(elsewhere);
    });

    it('recovers every coin a rotation interrupted after its rotate call left under the old key, and a racing deposit sealed to it, in the holdings read and the next rotation', async () => {
      const { sim, harness, input, deposit, liveHoldings, interrupt } =
        await createSimContext();
      const { context, accountRecords } = harness;
      await deposit(coin(5n));
      await deposit(coin(6n));
      const createdKey = sim.ledger().enc_key;
      interrupt.afterRotate = true;

      await expect(
        issueGrant({ ...(await input(start)), scope: readScope }, context),
      ).rejects.toThrow('append_inbox_with_jubjub lost');
      expect(sim.ledger().enc_key).not.toEqual(createdKey);
      expect(await liveHoldings()).toEqual([]);
      await deposit(coin(7n), createdKey);

      const read = await readShieldedHoldings(
        { account: (await input(0n)).account },
        context,
      );
      expect(read.holdings.map(({ value }) => value).sort()).toEqual([
        '5',
        '6',
        '7',
      ]);

      const counter = BigInt((await accountRecords.read())!.localUseCounter);
      await issueGrant(
        { ...(await input(counter)), scope: readScope },
        context,
      );

      expect((await liveHoldings()).map(({ value }) => value).sort()).toEqual([
        5n,
        6n,
        7n,
      ]);
    });

    it('re-seals the other live read grants right after the rotation lands, so they keep reading when the issue then fails', async () => {
      const { sim, harness, input, deposit, failing } =
        await createSimContext();
      const { context, accountRecords } = harness;
      await deposit(coin(3n));
      const first = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );
      failing.add('issue_grant_with_jubjub');

      await expect(
        issueGrant(
          {
            ...(await input(BigInt(first.localUseCounter))),
            scope: secondReadScope,
          },
          context,
        ),
      ).rejects.toThrow('issue_grant_with_jubjub lost');

      const view = (await accountRecords.read())?.grants?.[first.grantId]?.view;
      expect(view?.sealedEncKey).toBe(
        HexBytes.fromByteArray(sim.ledger().enc_key),
      );
      const secret = await openSeal(view?.seal, readKey.secretKey, {
        grantId: first.grantId,
        address: sim.account,
      });
      expect(isLiveSecret(secret, sim.ledger().enc_key)).toBe(true);
    });

    it('lists the issued grant as unsealed and returns the roster when its seal fails after the issue landed', async () => {
      const { sim, harness, input, deposit } = await createSimContext();
      const { context, accountRecords } = harness;
      await deposit(coin(2n));
      const key = context.seams
        .passportEncryptionKey as Required<PassportEncryptionKey>;
      vi.spyOn(key, 'sealView').mockRejectedValueOnce(new Error('refused'));

      const issued = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );

      expect(issued).toMatchObject({
        encKey: HexBytes.fromByteArray(sim.ledger().enc_key),
        unsealedGrantIds: [issued.grantId],
        droppedDevices: [],
      });
      expect(
        issued.grants.find(({ id }) => id === issued.grantId),
      ).toMatchObject({ active: true });
      expect(
        issued.grants.find(({ id }) => id === issued.grantId)?.opening?.view,
      ).toBeUndefined();
      expect(
        (await accountRecords.read())?.grants?.[issued.grantId]?.view,
      ).toEqual({ readPublicKey: readKey.publicKey });
    });

    it('names the live read grants it could not re-seal, and the enc_key it rotated to, in the result', async () => {
      const { sim, harness, input, deposit } = await createSimContext();
      const { context, accountRecords } = harness;
      await deposit(coin(2n));
      const first = await issueGrant(
        { ...(await input(start)), scope: readScope },
        context,
      );
      expect(first).toMatchObject({ unsealedGrantIds: [] });
      const key = context.seams
        .passportEncryptionKey as Required<PassportEncryptionKey>;
      vi.spyOn(key, 'sealView').mockRejectedValueOnce(new Error('refused'));

      const second = await issueGrant(
        {
          ...(await input(BigInt(first.localUseCounter))),
          scope: secondReadScope,
        },
        context,
      );

      const live = HexBytes.fromByteArray(sim.ledger().enc_key);
      expect(second).toMatchObject({
        encKey: live,
        unsealedGrantIds: [first.grantId],
      });
      expect(
        second.grants.find(({ id }) => id === first.grantId)?.opening?.view,
      ).toBeUndefined();
      expect(
        second.grants.find(({ id }) => id === second.grantId)?.opening?.view,
      ).toMatchObject({ sealedEncKey: live });
      expect(
        (await accountRecords.read())?.grants?.[first.grantId]?.view,
      ).toEqual({ readPublicKey: readKey.publicKey });
    });
  });
});
