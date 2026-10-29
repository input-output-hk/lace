import {
  AccAddress,
  CeremonyCancelledError,
  DeviceEpoch,
  GrantId,
  GrantSlot,
  UseCounter,
} from '@lace-contract/passport';
import { createSignerClient, serveSignerRequests } from '@lace-lib/passkey';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jubjubChallenges } from '../../src/acc/challenges';
import { ROTATE_ENC_KEY_CIRCUIT } from '../../src/acc/enc-key-circuits';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
} from '../../src/acc/envelopes';
import {
  GRANTEE_WITHDRAWAL_CIRCUITS,
  ISSUE_GRANT_CIRCUIT,
} from '../../src/acc/grant-circuits';
import {
  deriveGrantId,
  granteePoint,
  issueGrantBinding,
  originHash,
} from '../../src/acc/grants';
import { sealInboxEntry } from '../../src/acc/inbox';
import { bytesToBigIntLE, JUBJUB_R } from '../../src/acc/signer';
import { createPasskeyEncryptionKey } from '../../src/ceremony/encryption-key';
import { createPasskeyAuthoriser } from '../../src/ceremony/passkey';
import { issueGrant } from '../../src/flows/grants';
import { encodeBytes } from '../../src/remote/codec';
import { createRemoteAccountRecordStore } from '../../src/remote/remote-account-records';
import { createRemotePassportAuthoriser } from '../../src/remote/remote-authoriser';
import { createRemoteEncryptionKey } from '../../src/remote/remote-encryption-key';
import { createPassportSignerHandlers } from '../../src/remote/signer-handlers';
import { toAccountRecords } from '../../src/store/account-record';
import { isSealedRecord } from '../../src/store/envelope';

import {
  k256SpendScope,
  prepareIssueGrantFlow,
  spendScope,
} from './fake-grant';
import {
  cancellation,
  createFakePasskey,
  createInMemoryStorage,
} from './fake-passkey';
import { createWindowPair, DAPP_ORIGIN, SIGNER_URL } from './fake-windows';

import type * as AccountCall from '../../src/flows/account-call';
import type { SubmitAccountCallProps } from '../../src/flows/account-call';
import type { FlowContext } from '../../src/flows/types';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type {
  Authorisation,
  AuthorisationRequest,
  GrantRecord,
  PassportDependencies,
} from '@lace-contract/passport';
import type { SignerRequest, SignerRequestHandlers } from '@lace-lib/passkey';

const mocks = vi.hoisted(() => ({
  readAccountLedger: vi.fn(),
  queryAccountLedger: vi.fn(),
  queryAccountOperations: vi.fn(),
  submitAccountCall: vi.fn(),
  readGrants: vi.fn(),
}));

vi.mock('../../src/flows/account-call', async importOriginal => ({
  ...(await importOriginal<typeof AccountCall>()),
  readAccountLedger: mocks.readAccountLedger,
  queryAccountLedger: mocks.queryAccountLedger,
  queryAccountOperations: mocks.queryAccountOperations,
  submitAccountCall: mocks.submitAccountCall,
}));
vi.mock('../../src/acc/read-grants', () => ({
  readGrants: mocks.readGrants,
}));

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const ACCOUNT = AccAddress(HexBytes.fromByteArray(CONTRACT_ADDRESS));
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);
const NETWORK_ID = 'undeployed';

/** The grantee withdrawals of both schemes, as an account deployed here holds them. */
const INSTALLED_WITHDRAWALS = Object.values(GRANTEE_WITHDRAWAL_CIRCUITS).flat();

const addDeviceRequest: AuthorisationRequest = {
  account: ACCOUNT,
  circuit: 'add_device_with_jubjub',
  args: [NEW_ENTRY],
  witnessValues: [],
  authNonce: 7n,
  useCounter: UseCounter(3n),
};

const record: PassportAccountRecord = {
  address: ACCOUNT,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const unsupported = async (): Promise<never> => {
  throw new Error('Not served by the Passport handlers.');
};

const network = {
  networkId: NETWORK_ID,
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};

/** The ledger fields the issue flow reads around its call. */
const accountLedger = {
  indexer: { tag: 'indexer-client' },
  ledgerState: { device_epoch: 0n, auth_nonce: 7n },
};

const activeGrant = (id: GrantId): GrantRecord => ({
  id,
  slot: GrantSlot(0),
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

const cleanups: (() => void)[] = [];

const SIGN_IN = { kind: 'sign-in' as const };
const ADD_DEVICE = {
  kind: 'add-device' as const,
  commitmentHex: HexBytes.fromByteArray(NEW_ENTRY),
  account: ACCOUNT,
};

/**
 * The dApp end of the protocol over the remote seams and the signer end
 * over the Passport handlers, connected through the real client and
 * server. A local passkey authoriser over the same PRF outputs is the
 * reference the remote answers are checked against.
 */
const connect = async () => {
  const pair = createWindowPair();
  const signer = createFakePasskey();
  const storage = createInMemoryStorage();
  const onRequest = vi.fn(
    async (_request: SignerRequest, _origin: string) => 'approve' as const,
  );
  const handlers: SignerRequestHandlers = {
    ...createPassportSignerHandlers({
      keySource: signer.keySource,
      createKeyValueStorage: storage.createKeyValueStorage,
    }),
    'sign-cardano-tx': unsupported,
    'sign-cardano-data': unsupported,
    'cardano-account-public-key': unsupported,
    'cardano-custody-public-key': unsupported,
    'sign-cardano-custody-tx': unsupported,
    'sign-cardano-custody-data': unsupported,
  };
  const client = createSignerClient({
    signerUrl: SIGNER_URL,
    host: pair.dappHost,
  });
  client.open();
  const stop = serveSignerRequests({
    handlers,
    assertOriginAllowed: () => undefined,
    onRequest,
    host: pair.signerHost,
  });
  cleanups.push(stop, client.close);
  await client.connect();

  const local = createFakePasskey();
  return {
    get: signer.get,
    onRequest,
    stored: storage.stored,
    authoriser: createRemotePassportAuthoriser(client),
    encryptionKey: createRemoteEncryptionKey(client),
    records: createRemoteAccountRecordStore(client),
    localAuthoriser: createPasskeyAuthoriser({ keySource: local.keySource }),
    localEncryptionKey: createPasskeyEncryptionKey(local.keySource),
  };
};

/**
 * Stores `record` through a create-account session of its own, the only
 * flow that may write a record over empty storage, and forgets the
 * ceremony that session cost.
 */
const seedRecord = async ({
  authoriser,
  records,
  get,
}: Pick<
  Awaited<ReturnType<typeof connect>>,
  'authoriser' | 'get' | 'records'
>): Promise<void> => {
  await authoriser.withKeySession!(
    async () => firstValueFrom(records.write(record)),
    { kind: 'create-account', lockAccount: true },
  );
  get.mockClear();
};

/**
 * Account keys the local key draws over the same passkey outputs the
 * signer holds, with the keyring that opens them, so the signer opens
 * them as its own.
 */
const localAccountKeys = async (
  localAuthoriser: ReturnType<typeof createPasskeyAuthoriser>,
  localEncryptionKey: ReturnType<typeof createPasskeyEncryptionKey>,
) => {
  const devicePublicKey = encodeDevicePublicKey(
    await localAuthoriser.devicePublicKey(),
  );
  const keys = await localEncryptionKey.createKeys(NETWORK_ID, {
    devicePublicKey,
  });
  return {
    devicePublicKey,
    keys,
    keyring: {
      account: ACCOUNT,
      encKey: keys.encKey,
      envelopes: deviceEnvelopes(
        keys.envelopes,
        await localEncryptionKey.readerPublicKey(NETWORK_ID),
      ),
    },
  };
};

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.resetAllMocks();
});

describe('Passport seams over the signer protocol', () => {
  it('answers the device public key the local authoriser holds', async () => {
    const { authoriser, localAuthoriser } = await connect();

    const publicKey = await authoriser.withKeySession!(
      authoriser.devicePublicKey,
      SIGN_IN,
    );

    expect(publicKey).toEqual(await localAuthoriser.devicePublicKey());
  });

  it('answers the device commitments the local authoriser derives', async () => {
    const { authoriser, localAuthoriser } = await connect();
    const counters = [UseCounter(0n), UseCounter(1n)];

    const [batch, single] = await authoriser.withKeySession!(
      async () => [
        await authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(0n), counters),
        await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(1n),
        ),
      ],
      SIGN_IN,
    );

    expect(batch).toEqual(
      await localAuthoriser.deviceCommitments(
        ACCOUNT,
        DeviceEpoch(0n),
        counters,
      ),
    );
    expect(single).toBe(
      await localAuthoriser.deviceCommitment(
        ACCOUNT,
        DeviceEpoch(0n),
        UseCounter(1n),
      ),
    );
  });

  it('authorises an addDevice call the local verifier accepts', async () => {
    const { authoriser, localAuthoriser } = await connect();

    const authorisation = await authoriser.withKeySession!(
      async () => authoriser.authorise(addDeviceRequest),
      ADD_DEVICE,
    );

    expect(authorisation.scheme).toBe('jubjub-schnorr');
    expect(authorisation.pk).toEqual(await localAuthoriser.devicePublicKey());
    expect(authorisation.useCounter).toBe(3n);
    expect(authorisation.sigS).toBeLessThan(JUBJUB_R);
    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
      authorisation.pk,
      NEW_ENTRY,
    );
    expect(
      bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
    ).toBeLessThan(JUBJUB_R);
    for (let nonce = 0n; nonce < authorisation.grindNonce; nonce++) {
      expect(
        bytesToBigIntLE(builder(authorisation.sigR, nonce)),
      ).toBeGreaterThanOrEqual(JUBJUB_R);
    }
  });

  it('authorises an issueGrant call bound to the dApp origin the channel reports', async () => {
    const { get, authoriser, localAuthoriser, onRequest } = await connect();
    const { flow, args } = await prepareIssueGrantFlow('dapp.example');
    const request: AuthorisationRequest = {
      ...addDeviceRequest,
      circuit: ISSUE_GRANT_CIRCUIT,
      args,
    };

    const authorisation = await authoriser.withKeySession!(
      async () => authoriser.authorise(request),
      flow,
    );

    expect(onRequest).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ kind: 'flow-open', payload: { flow } }),
      DAPP_ORIGIN,
    );
    expect(get).toHaveBeenCalledOnce();
    expect(authorisation.pk).toEqual(await localAuthoriser.devicePublicKey());
    const builder = jubjubChallenges.issueGrant(
      { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
      authorisation.pk,
      issueGrantBinding(args),
    );
    expect(
      bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
    ).toBeLessThan(JUBJUB_R);
  });

  it('refuses an issue-grant session whose grant was derived for another site, running no ceremony', async () => {
    const { get, authoriser } = await connect();
    const { flow, args } = await prepareIssueGrantFlow('other.example');
    const operation = vi.fn(async () =>
      authoriser.authorise({
        ...addDeviceRequest,
        circuit: ISSUE_GRANT_CIRCUIT,
        args,
      }),
    );

    await expect(
      authoriser.withKeySession!(operation, flow),
    ).rejects.toMatchObject({ code: 'grant-binding-mismatch' });

    expect(operation).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('answers the reader public key the local key derives', async () => {
    const { authoriser, encryptionKey, localEncryptionKey } = await connect();

    const publicKey = await authoriser.withKeySession!(
      async () => encryptionKey.readerPublicKey(NETWORK_ID),
      SIGN_IN,
    );

    expect(publicKey).toEqual(
      await localEncryptionKey.readerPublicKey(NETWORK_ID),
    );
  });

  it('opens the inbox entries the local key opens, inside a read-holdings flow', async () => {
    const {
      authoriser,
      encryptionKey,
      localAuthoriser,
      localEncryptionKey,
      onRequest,
    } = await connect();
    const coin = {
      nonce: new Uint8Array(32).fill(1),
      color: new Uint8Array(32).fill(2),
      value: 9n,
    };
    const { keys, keyring } = await localAccountKeys(
      localAuthoriser,
      localEncryptionKey,
    );
    const entries = [
      await sealInboxEntry(keys.encKey, coin),
      new Uint8Array(192),
    ];

    const opened = await authoriser.withKeySession!(
      async () => encryptionKey.openInbox(NETWORK_ID, keyring, entries),
      { kind: 'read-holdings' },
    );

    expect(opened).toEqual(
      await localEncryptionKey.openInbox(NETWORK_ID, keyring, entries),
    );
    expect(opened).toEqual([{ kind: 'coin', coin }, null]);
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'flow-open',
        payload: { flow: { kind: 'read-holdings' } },
      }),
      DAPP_ORIGIN,
    );
  });

  it('refuses every key request outside a flow with the session-gate code, running no ceremony', async () => {
    const { get, authoriser, encryptionKey } = await connect();
    const sessionGate = { code: 'key-session-required' };

    await expect(authoriser.devicePublicKey()).rejects.toMatchObject(
      sessionGate,
    );
    await expect(
      authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(0n), [UseCounter(0n)]),
    ).rejects.toMatchObject(sessionGate);
    await expect(authoriser.authorise(addDeviceRequest)).rejects.toMatchObject(
      sessionGate,
    );
    await expect(
      encryptionKey.readerPublicKey(NETWORK_ID),
    ).rejects.toMatchObject(sessionGate);
    await expect(
      encryptionKey.openInbox(
        NETWORK_ID,
        { account: ACCOUNT, encKey: new Uint8Array(32), envelopes: [] },
        [new Uint8Array(192)],
      ),
    ).rejects.toMatchObject(sessionGate);
    expect(get).not.toHaveBeenCalled();
  });

  it('keeps the account record sealed on the signer origin', async () => {
    const { authoriser, records, stored } = await connect();

    await expect(firstValueFrom(records.presence())).resolves.toBe('absent');
    await authoriser.withKeySession!(
      async () => {
        await expect(firstValueFrom(records.read())).resolves.toBeUndefined();
        await firstValueFrom(records.write(record));
        await expect(firstValueFrom(records.read())).resolves.toEqual(record);
      },
      { kind: 'create-account', lockAccount: true },
    );

    expect(isSealedRecord(stored('passport-account', 'account'))).toBe(true);
    await expect(firstValueFrom(records.presence())).resolves.toBe('complete');
  });

  it('refuses the record outside a flow with the session-gate code', async () => {
    const { records } = await connect();

    await expect(firstValueFrom(records.read())).rejects.toMatchObject({
      code: 'key-session-required',
    });
  });

  it('serves a whole flow under one key session from a single ceremony', async () => {
    const connected = await connect();
    const { get, authoriser, encryptionKey, records } = connected;
    await seedRecord(connected);

    await authoriser.withKeySession!(async () => {
      await authoriser.devicePublicKey();
      await encryptionKey.readerPublicKey(NETWORK_ID);
      await firstValueFrom(records.read());
      await authoriser.deviceCommitment(
        ACCOUNT,
        DeviceEpoch(0n),
        UseCounter(4n),
      );
      await firstValueFrom(records.write(record));
    }, SIGN_IN);

    expect(get).toHaveBeenCalledOnce();
  });

  it('refuses a request the approved flow never makes with the scope code', async () => {
    const { get, authoriser } = await connect();

    await expect(
      authoriser.withKeySession!(
        async () => authoriser.authorise(addDeviceRequest),
        SIGN_IN,
      ),
    ).rejects.toMatchObject({ code: 'flow-scope' });

    expect(get).toHaveBeenCalledOnce();
  });

  it('rotates only to the key the session drew, and never to one another session drew', async () => {
    const { authoriser, encryptionKey, localAuthoriser, localEncryptionKey } =
      await connect();
    const { devicePublicKey, keys, keyring } = await localAccountKeys(
      localAuthoriser,
      localEncryptionKey,
    );
    const flow = {
      kind: 'revoke-grant' as const,
      grantId: GrantId('ee'.repeat(32)),
      read: true,
      account: ACCOUNT,
      devices: [],
    };
    const rotateTo = async (key: Uint8Array) =>
      authoriser.authorise({
        ...addDeviceRequest,
        circuit: ROTATE_ENC_KEY_CIRCUIT,
        args: [key],
      });
    const drawn = await authoriser.withKeySession!(async () => {
      const fresh = await encryptionKey.createKeys(NETWORK_ID, {
        devicePublicKey,
        keyring,
        registrations: keys.registrations,
      });
      await rotateTo(fresh.encKey);
      return fresh;
    }, flow);

    expect(drawn.envelopes).toHaveLength(1);
    expect(drawn.encKey).not.toEqual(keys.encKey);
    await expect(
      authoriser.withKeySession!(async () => rotateTo(drawn.encKey), flow),
    ).rejects.toMatchObject({ code: 'flow-scope' });
  });

  it('shows the signer which flow it approves, and the dApp that asked', async () => {
    const { authoriser, onRequest } = await connect();
    const flow = {
      kind: 'add-device' as const,
      commitmentHex: 'ab'.repeat(32),
      account: ACCOUNT,
    };

    await authoriser.withKeySession!(async () => undefined, flow);

    expect(onRequest).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ kind: 'flow-open', payload: { flow } }),
      DAPP_ORIGIN,
    );
  });

  it('rejects the flow as cancelled when the signer declines it, and runs nothing', async () => {
    const { get, authoriser, onRequest } = await connect();
    onRequest.mockResolvedValueOnce('reject' as never);
    const operation = vi.fn(async () => undefined);

    await expect(
      authoriser.withKeySession!(operation, SIGN_IN),
    ).rejects.toBeInstanceOf(CeremonyCancelledError);

    expect(operation).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects the flow as cancelled when the ceremony is dismissed, and can retry', async () => {
    const { get, authoriser } = await connect();
    get.mockRejectedValueOnce(cancellation());

    await expect(
      authoriser.withKeySession!(async () => undefined, SIGN_IN),
    ).rejects.toBeInstanceOf(CeremonyCancelledError);
    await expect(
      authoriser.withKeySession!(async () => 7, SIGN_IN),
    ).resolves.toBe(7);

    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe('the issue-grant flow over the signer protocol', () => {
  /** The relying party id the flow runs under: the hostname of the dApp origin the signer observes. */
  const rpId = new URL(DAPP_ORIGIN).hostname;

  /**
   * Stands in for the chain: the call is authorised through the seams the
   * flow was given, as the gated call would, and the roster then shows
   * the grant active.
   */
  const submitThroughSeams = (
    authorisations: { circuit: string; authorisation: Authorisation }[],
  ) => {
    let counter = 3n;
    mocks.queryAccountLedger.mockImplementation(async () => ({
      ...accountLedger.ledgerState,
      auth_nonce: 4n + counter,
    }));
    mocks.submitAccountCall.mockImplementation(
      async (
        { circuit, args, account }: SubmitAccountCallProps,
        { passportAuthoriser }: PassportDependencies,
      ) => {
        const address = AccAddress(account.address);
        authorisations.push({
          circuit,
          authorisation: await passportAuthoriser.authorise({
            account: address,
            circuit,
            args,
            witnessValues: [],
            authNonce: 4n + counter,
            useCounter: UseCounter(counter),
          }),
        });
        if (circuit === ISSUE_GRANT_CIRCUIT) {
          mocks.readGrants.mockReturnValue([
            activeGrant(GrantId(encodeBytes(issueGrantBinding(args).grantId))),
          ]);
        }
        counter += 1n;
        return {
          advancedCounter: UseCounter(counter),
          localCommitmentHex: await passportAuthoriser.deviceCommitment(
            address,
            DeviceEpoch(0n),
            UseCounter(counter),
          ),
        };
      },
    );
  };

  it.each([
    ['a jubjub', spendScope],
    ['a secp256k1', k256SpendScope],
  ])(
    'opens the session with the descriptor the signer re-derives for %s grantee, signs the issue it approved and appends the bookkeeping it sealed',
    async (_grantee, scope) => {
      const {
        get,
        authoriser,
        encryptionKey,
        records,
        localAuthoriser,
        onRequest,
      } = await connect();
      await authoriser.withKeySession!(
        async () => firstValueFrom(records.write(record)),
        { kind: 'create-account', lockAccount: true },
      );
      get.mockClear();
      onRequest.mockClear();
      mocks.readAccountLedger.mockResolvedValue(accountLedger);
      mocks.queryAccountOperations.mockResolvedValue(INSTALLED_WITHDRAWALS);
      mocks.readGrants.mockReturnValue([]);
      const authorisations: {
        circuit: string;
        authorisation: Authorisation;
      }[] = [];
      submitThroughSeams(authorisations);
      const context: FlowContext = {
        seams: {
          passportAuthoriser: authoriser,
          passportEncryptionKey: encryptionKey,
          passportSponsor: { balanceAndSign: vi.fn() },
          passportProver: { prove: vi.fn(), check: vi.fn() },
          passportNetwork: network,
        },
        accountRecords: toAccountRecords(records),
        onProgress: vi.fn(),
        rpId,
      };

      const issued = await issueGrant(
        {
          account: {
            address: ACCOUNT,
            bindingVersion: record.bindingVersion,
            status: 'ready',
            networkId: 'undeployed',
          },
          devices: [],
          localUseCounter: record.localUseCounter,
          scope,
        },
        context,
      );

      const grantId = deriveGrantId({
        contractAddress: CONTRACT_ADDRESS,
        granteePublicKey: granteePoint(scope.grantee),
        originHash: await originHash(rpId),
        slot: GrantSlot(0),
      });
      expect(issued).toMatchObject({
        grantId,
        grants: [activeGrant(grantId)],
        localUseCounter: '6',
      });
      expect(authorisations.map(({ circuit }) => circuit)).toEqual([
        ISSUE_GRANT_CIRCUIT,
        'append_inbox_with_jubjub',
        'append_inbox_with_jubjub',
      ]);
      expect(get).toHaveBeenCalledOnce();
      const [{ args }] = mocks.submitAccountCall.mock.calls[0] as [
        SubmitAccountCallProps,
      ];
      const salt = args.at(-1) as Uint8Array;
      const binding = issueGrantBinding(args);
      expect(onRequest).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          kind: 'flow-open',
          payload: {
            flow: {
              kind: 'issue-grant',
              grantId,
              scope,
              account: ACCOUNT,
              slot: 0,
              scopeSalt: encodeBytes(salt),
              scopeDigest: encodeBytes(binding.scopeDigest),
            },
          },
        }),
        DAPP_ORIGIN,
      );
      const [{ authorisation }] = authorisations;
      expect(authorisation.pk).toEqual(await localAuthoriser.devicePublicKey());
      const builder = jubjubChallenges.issueGrant(
        { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
        authorisation.pk,
        binding,
      );
      expect(
        bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
      ).toBeLessThan(JUBJUB_R);
      const stored = await authoriser.withKeySession!(
        async () => firstValueFrom(records.read()),
        SIGN_IN,
      );
      expect(stored).toMatchObject({
        localUseCounter: '6',
        grants: {
          [grantId]: {
            slot: 0,
            scopeSalt: encodeBytes(salt),
            granteeScheme: scope.grantee.scheme,
            granteePublicKey: scope.grantee.publicKey,
            origin: rpId,
          },
        },
      });
    },
  );
});
