import {
  AccountCreationPendingError,
  AccountExistsError,
  CeremonyCancelledError,
  CreationLockMismatchError,
  DeviceRosterInvalidError,
  GrantOriginMissingError,
  GrantRevocationPendingError,
  GrantScopeInvalidError,
  GrantSlot,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { x25519 } from '@noble/curves/ed25519.js';
import { jubjub } from '@noble/curves/misc.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import {
  APPEND_INBOX_CIRCUIT,
  ROTATE_ENC_KEY_CIRCUIT,
} from '../../src/acc/enc-key-circuits';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
  isAddressedTo,
  openDeviceEnvelope,
  sealDeviceEnvelope,
} from '../../src/acc/envelopes';
import {
  ISSUE_GRANT_CIRCUIT,
  REVOKE_ALL_GRANTS_CIRCUIT,
  REVOKE_GRANT_CIRCUIT,
} from '../../src/acc/grant-circuits';
import { deriveGrantId, granteePoint, originHash } from '../../src/acc/grants';
import {
  MAX_INBOX_ENTRIES_PER_REQUEST,
  openInboxEntry,
  sealInboxEntry,
} from '../../src/acc/inbox';
import {
  authorityOf,
  maintenanceUpdateOf,
} from '../../src/acc/maintenance-authority';
import { bytesToBigIntLE, JUBJUB_R, JubjubDevice } from '../../src/acc/signer';
import { createPasskeyEncryptionKey } from '../../src/ceremony/encryption-key';
import { MalformedPayloadError } from '../../src/remote/codec';
import {
  FlowScopeError,
  GrantBindingMismatchError,
  InboxRequestTooLargeError,
  KeySessionRequiredError,
  SessionExpiredError,
} from '../../src/remote/errors';
import { createPassportSignerHandlers } from '../../src/remote/signer-handlers';
import { isSealedRecord } from '../../src/store/envelope';
import { isLiveSecret, openGrantViewSeal } from '../acc/view-seal-reference';

import {
  ACCOUNT,
  CONTRACT_ADDRESS,
  K256_GRANTEE_SECRET,
  k256SpendScope,
  prepareIssueGrantFlow,
  READ_PUBLIC_KEY,
  READ_SECRET,
  readScope,
  spendScope,
} from './fake-grant';
import {
  cancellation,
  createFakePasskey,
  createInMemoryStorage,
  deviceOutput,
} from './fake-passkey';
import { DAPP_ORIGIN } from './fake-windows';

import type * as DeviceReaders from '../../src/acc/device-readers';
import type { CreatePassportSignerHandlersProps } from '../../src/remote/signer-handlers';
import type { PassportAccountRecord } from '../../src/store/account-record';
import type { SealedRecord } from '../../src/store/envelope';
import type { GrantId, GrantScopeInput } from '@lace-contract/passport';
import type { SignerFlow } from '@lace-lib/passkey';

const scans = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../src/acc/device-readers', async importOriginal => {
  const original = await importOriginal<typeof DeviceReaders>();
  return {
    ...original,
    derivesEntry: (...args: Parameters<typeof original.derivesEntry>) => {
      scans.count += 1;
      return original.derivesEntry(...args);
    },
  };
});

const DAPP_HOSTNAME = 'dapp.example';
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);
const NETWORK_ID = 'undeployed';
const FLOW_COMPLETED = { outcome: 'completed' } as const;
const COMMITMENT_HEX = HexBytes.fromByteArray(NEW_ENTRY);
const OTHER_ENTRY = new Uint8Array(32).fill(0x3c);
const ADD_DEVICE: SignerFlow = {
  kind: 'add-device',
  commitmentHex: COMMITMENT_HEX,
  account: ACCOUNT,
};
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const CREATE_ACCOUNT: SignerFlow = {
  kind: 'create-account',
  lockAccount: false,
};

const addDeviceAuthorisation = {
  account: ACCOUNT,
  circuit: 'add_device_with_jubjub',
  args: [NEW_ENTRY],
  witnessValues: [],
  authNonce: '7',
  useCounter: '3',
};

const record: PassportAccountRecord = {
  address: ACCOUNT,
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const referenceDevice = () =>
  new JubjubDevice(bytesToBigIntLE(deviceOutput()) % JUBJUB_R);

/** This signer's own device key in the compressed form a registration carries. */
const ownDeviceKey = () => encodeDevicePublicKey(referenceDevice().pk);

/** Account keys as the channel carries them. */
type EncodedAccountKeys = {
  encKey: string;
  envelopes: string[];
  registrations: string[];
  authority: { tag: 'ecdsa' | 'schnorr'; value: string };
};

/** The keyring of a key a session drew: its own envelope of it. */
const keyringOf = ({ encKey, envelopes }: EncodedAccountKeys) => ({
  account: ACCOUNT,
  encKey,
  envelopes: envelopes.slice(0, 1),
});

const isSettled = async (promise: Promise<unknown>): Promise<boolean> =>
  Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>(resolve => {
      setImmediate(() => {
        resolve(false);
      });
    }),
  ]);

const setup = (options: Partial<CreatePassportSignerHandlersProps> = {}) => {
  const { get, keySource } = createFakePasskey();
  const { createKeyValueStorage, stored } = createInMemoryStorage();
  const handlers = createPassportSignerHandlers({
    keySource,
    createKeyValueStorage,
    ...options,
  });
  return { get, keySource, handlers, stored };
};

type Handlers = ReturnType<typeof setup>['handlers'];

/** An authority no session of these tests draws. */
const UNDRAWN_AUTHORITY = { tag: 'schnorr', value: 'cd'.repeat(32) } as const;

/**
 * A pending deployment carrying the given key entries and handing the
 * account to `handoverAuthority`, which a creation's first write must
 * have drawn in its session.
 */
const pendingDeployment = (
  keyEntries: string[],
  handoverAuthority: EncodedAccountKeys['authority'] = UNDRAWN_AUTHORITY,
) => ({
  operations: ['add_device_with_jubjub'],
  lockAccount: false,
  verifierKeysDigest: 'f0'.repeat(32),
  saltHex: '11'.repeat(32),
  authorityKey: { tag: 'schnorr', value: '22'.repeat(32) },
  handoverAuthority,
  keyEntries,
});

/** Draws account keys in a create-account session of their own. */
const drawAccountKeys = async (
  handlers: Handlers,
): Promise<EncodedAccountKeys> => {
  await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
  const keys = (await handlers['create-keys'](
    {
      networkId: NETWORK_ID,
      devicePublicKey: ownDeviceKey(),
    },
    DAPP_ORIGIN,
  )) as EncodedAccountKeys;
  await handlers['flow-close'](FLOW_COMPLETED);
  return keys;
};

/**
 * Opens a create-account session from the dApp origin and draws the
 * account keys, which binds the creation to that origin.
 */
const openCreation = async (
  handlers: Handlers,
): Promise<EncodedAccountKeys> => {
  await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
  return (await handlers['create-keys'](
    { networkId: NETWORK_ID, devicePublicKey: ownDeviceKey() },
    DAPP_ORIGIN,
  )) as EncodedAccountKeys;
};

/** This signer's reader key, asked inside the open session. */
const readerKeyOf = async (handlers: Handlers): Promise<unknown> =>
  handlers['reader-public-key']({ networkId: NETWORK_ID });

/**
 * Stores `record` through a create-account session of its own, the only
 * flow that may write a record over empty storage, and forgets the
 * ceremony that session cost.
 */
const seedRecord = async ({
  handlers,
  get,
}: Pick<ReturnType<typeof setup>, 'get' | 'handlers'>): Promise<void> => {
  await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
  await handlers['record-write']({ record }, DAPP_ORIGIN);
  await handlers['flow-close'](FLOW_COMPLETED);
  get.mockClear();
};

/** Sets up the handlers with a session already held, sign-in by default. */
const setupInSession = async (
  flow: SignerFlow = { kind: 'sign-in' },
  dappOrigin?: string,
) => {
  const context = setup();
  await context.handlers['flow-open']({ flow }, dappOrigin);
  return context;
};

/** Sets up the handlers over a stored record, with a session already held. */
const setupSeededInSession = async (
  flow: SignerFlow = { kind: 'sign-in' },
  dappOrigin?: string,
) => {
  const context = setup();
  await seedRecord(context);
  await context.handlers['flow-open']({ flow }, dappOrigin);
  return context;
};

const createFakeTimers = () => {
  const pending = new Map<number, { callback: () => void; delayMs: number }>();
  let next = 1;
  const timers = {
    setTimeout: vi.fn((callback: () => void, delayMs: number) => {
      const id = next;
      next += 1;
      pending.set(id, { callback, delayMs });
      return id;
    }),
    clearTimeout: vi.fn((timer: unknown) => {
      pending.delete(timer as number);
    }),
  };
  const elapse = (): void => {
    for (const [id, { callback }] of [...pending]) {
      pending.delete(id);
      callback();
    }
  };
  return { timers, elapse, pending };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createPassportSignerHandlers', () => {
  it('answers the device public key as decimal coordinates', async () => {
    const { handlers } = await setupInSession();
    const { pk } = referenceDevice();

    await expect(handlers['device-public-key']({})).resolves.toEqual({
      x: pk.x.toString(),
      y: pk.y.toString(),
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('answers a commitment batch in counter order', async () => {
    const { handlers } = await setupInSession();
    const device = referenceDevice();

    await expect(
      handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '1',
        counters: ['0', '2'],
      }),
    ).resolves.toEqual([
      HexBytes.fromByteArray(device.entryAt(CONTRACT_ADDRESS, 1n, 0n)),
      HexBytes.fromByteArray(device.entryAt(CONTRACT_ADDRESS, 1n, 2n)),
    ]);
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a malformed counter without leaving the session ceremony', async () => {
    const { get, handlers } = await setupInSession();

    await expect(
      handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '1',
        counters: ['0', 'two'],
      }),
    ).rejects.toThrow(new MalformedPayloadError('counters[1]'));
    await handlers['flow-close'](FLOW_COMPLETED);
    expect(get).toHaveBeenCalledOnce();
  });

  it('answers an authorisation with its bigints as decimals', async () => {
    const { handlers } = await setupInSession(ADD_DEVICE);

    const authorisation = await handlers.authorise(
      addDeviceAuthorisation,
      DAPP_ORIGIN,
    );

    const { pk } = referenceDevice();
    expect(authorisation).toMatchObject({
      scheme: 'jubjub-schnorr',
      pk: { x: pk.x.toString(), y: pk.y.toString() },
      useCounter: '3',
    });
    expect(authorisation).toMatchObject({
      sigS: expect.stringMatching(/^\d+$/) as unknown,
      grindNonce: expect.stringMatching(/^\d+$/) as unknown,
      sigR: {
        x: expect.stringMatching(/^\d+$/) as unknown,
        y: expect.stringMatching(/^\d+$/) as unknown,
      },
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('answers the reader public key as hex', async () => {
    const { handlers, keySource } = await setupInSession();
    const expected = await createPasskeyEncryptionKey(
      keySource,
    ).readerPublicKey(NETWORK_ID);

    await expect(
      handlers['reader-public-key']({ networkId: NETWORK_ID }),
    ).resolves.toBe(HexBytes.fromByteArray(expected));
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  describe('outside a key session', () => {
    it('refuses the device public key before any ceremony', async () => {
      const { get, handlers } = setup();

      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new KeySessionRequiredError('device-public-key'),
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a commitment batch before any ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['device-commitments']({
          account: ACCOUNT,
          epoch: '1',
          counters: ['0', '2'],
        }),
      ).rejects.toThrow(new KeySessionRequiredError('device-commitments'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses an authorisation before any ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(new KeySessionRequiredError('authorise'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses the reader public key and fresh account keys before any ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['reader-public-key']({ networkId: NETWORK_ID }),
      ).rejects.toThrow(new KeySessionRequiredError('reader-public-key'));
      await expect(
        handlers['create-keys'](
          {
            networkId: NETWORK_ID,
            devicePublicKey: ownDeviceKey(),
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(new KeySessionRequiredError('create-keys'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses them again once the session is closed', async () => {
      const { get, handlers } = await setupInSession();
      await handlers['flow-close'](FLOW_COMPLETED);

      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new KeySessionRequiredError('device-public-key'),
      );
      await expect(
        handlers['reader-public-key']({ networkId: NETWORK_ID }),
      ).rejects.toThrow(new KeySessionRequiredError('reader-public-key'));
      expect(get).toHaveBeenCalledOnce();
    });
  });

  describe('records', () => {
    it('reads undefined and reports absence before any write', async () => {
      const { handlers } = setup();

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(
        handlers['record-read']({}, DAPP_ORIGIN),
      ).resolves.toBeUndefined();
      await handlers['flow-close'](FLOW_COMPLETED);
      await expect(handlers['record-exists']({})).resolves.toBe('absent');
    });

    it('seals the written record on the signer origin and reads it back', async () => {
      const context = setup();
      const { handlers, stored } = context;
      await seedRecord(context);

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).resolves.toBeUndefined();

      expect(isSealedRecord(stored('passport-account', 'account'))).toBe(true);
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['flow-close'](FLOW_COMPLETED);
      await expect(handlers['record-exists']({})).resolves.toBe('complete');
    });

    it('marks a pending record on its sealed envelope and reports it pending without a session', async () => {
      const { handlers, stored } = setup();
      const keys = await openCreation(handlers);
      const pendingRecord: PassportAccountRecord = {
        ...record,
        deployment: {
          operations: ['deposit_unshielded'],
          lockAccount: false,
          verifierKeysDigest: 'f0'.repeat(32),
          saltHex: '07'.repeat(32),
          authorityKey: { tag: 'schnorr', value: 'ab'.repeat(32) },
          handoverAuthority: keys.authority,
          keyEntries: ['d1'.repeat(192)],
        },
      };

      await handlers['record-write']({ record: pendingRecord }, DAPP_ORIGIN);
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        pendingRecord,
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      const sealed = stored('passport-account', 'account') as SealedRecord;
      expect(isSealedRecord(sealed)).toBe(true);
      expect(sealed.pending).toBe(true);
      await expect(handlers['record-exists']({})).resolves.toBe('pending');

      await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
      await handlers['record-write']({ record }, DAPP_ORIGIN);
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(stored('passport-account', 'account')).not.toHaveProperty(
        'pending',
      );
      await expect(handlers['record-exists']({})).resolves.toBe('complete');
    });

    it('refuses a write that carries no record or a malformed one', async () => {
      const { handlers, stored } = setup();

      await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
      await expect(
        handlers['record-write']({ record: undefined }, DAPP_ORIGIN),
      ).rejects.toThrow(new MalformedPayloadError('record'));
      await expect(
        handlers['record-write'](
          { record: { ...record, address: 1 } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(new MalformedPayloadError('record.address'));
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(stored('passport-account', 'account')).toBeUndefined();
    });

    it('refuses a read or write outside a key session, before any ceremony', async () => {
      const { get, handlers, stored } = setup();

      await expect(handlers['record-read']({}, DAPP_ORIGIN)).rejects.toThrow(
        new KeySessionRequiredError('record-read'),
      );
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).rejects.toThrow(new KeySessionRequiredError('record-write'));
      expect(get).not.toHaveBeenCalled();
      expect(stored('passport-account', 'account')).toBeUndefined();
    });

    it('refuses a sign-in that writes a record over empty storage', async () => {
      const { handlers, stored } = setup();

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).rejects.toThrow(new FlowScopeError('sign-in', { argument: 'record' }));
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(stored('passport-account', 'account')).toBeUndefined();
    });

    it('refuses a read or write again once the session is closed', async () => {
      const context = setup();
      const { handlers } = context;
      await seedRecord(context);

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).resolves.toBeUndefined();
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      await expect(handlers['record-read']({}, DAPP_ORIGIN)).rejects.toThrow(
        new KeySessionRequiredError('record-read'),
      );
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).rejects.toThrow(new KeySessionRequiredError('record-write'));
      await expect(handlers['record-exists']({})).resolves.toBe('complete');
    });

    it('reports the session gate under its own code', () => {
      const error = new KeySessionRequiredError('record-read');

      expect(error.code).toBe('key-session-required');
      expect(error.name).toBe('KeySessionRequiredError');
    });
  });

  describe('key session', () => {
    it('holds one ceremony open from flow-open to flow-close', async () => {
      const { get, handlers } = setup();

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await handlers['device-public-key']({});
      await handlers['record-exists']({});
      await handlers['reader-public-key']({ networkId: NETWORK_ID });
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledOnce();
    });

    it('keeps the session open until flow-close', async () => {
      const { keySource, handlers } = setup();
      const withSession = vi.spyOn(keySource, 'withSession');

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      const session = withSession.mock.results[0].value as Promise<unknown>;
      await expect(isSettled(session)).resolves.toBe(false);

      await handlers['flow-close'](FLOW_COMPLETED);
      await expect(isSettled(session)).resolves.toBe(true);
    });

    it('rejects a flow-open whose ceremony is dismissed, holding nothing', async () => {
      const { get, handlers } = setup();
      get.mockRejectedValueOnce(cancellation());

      await expect(
        handlers['flow-open']({ flow: { kind: 'sign-in' } }),
      ).rejects.toBeInstanceOf(CeremonyCancelledError);

      await expect(
        handlers['flow-open']({ flow: { kind: 'sign-in' } }),
      ).resolves.toBeUndefined();
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('refuses a second flow-open while one is held', async () => {
      const { handlers } = setup();
      await handlers['flow-open']({ flow: { kind: 'sign-in' } });

      await expect(
        handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN),
      ).rejects.toThrow('A key session is already open.');

      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('treats a flow-close with no session open as done', async () => {
      const { get, handlers } = setup();

      await expect(handlers['flow-close'](FLOW_COMPLETED)).resolves.toEqual(
        FLOW_COMPLETED,
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('answers a flow-close with the outcome it was given', async () => {
      const { handlers } = await setupInSession();
      const failed = { outcome: 'failed', code: 'network-error' } as const;

      await expect(handlers['flow-close'](failed)).resolves.toEqual(failed);

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(handlers['flow-close'](FLOW_COMPLETED)).resolves.toEqual(
        FLOW_COMPLETED,
      );
    });
  });

  describe('flow scope', () => {
    const REMOVE_DEVICE: SignerFlow = {
      kind: 'remove-device',
      commitmentHex: COMMITMENT_HEX,
      account: ACCOUNT,
      devices: [],
    };

    it('serves create-account its device and reader keys, record, account keys, commitments and record write', async () => {
      const { get, handlers } = await setupInSession(
        CREATE_ACCOUNT,
        DAPP_ORIGIN,
      );

      await handlers['device-public-key']({});
      await handlers['reader-public-key']({ networkId: NETWORK_ID });
      await expect(
        handlers['record-read']({}, DAPP_ORIGIN),
      ).resolves.toBeUndefined();
      await handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
        },
        DAPP_ORIGIN,
      );
      await handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '0',
        counters: ['0'],
      });
      await handlers['record-write']({ record }, DAPP_ORIGIN);
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledOnce();
    });

    it('refuses create-account every circuit but the append without touching the key source', async () => {
      const { get, handlers, keySource } = await setupInSession(
        CREATE_ACCOUNT,
        DAPP_ORIGIN,
      );
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('create-account', {
          circuit: 'add_device_with_jubjub',
        }),
      );

      expect(deviceSecret).not.toHaveBeenCalled();
      expect(get).toHaveBeenCalledOnce();
    });

    it('serves sign-in its device and reader keys, record and commitments', async () => {
      const { get, handlers } = await setupSeededInSession();

      await handlers['device-public-key']({});
      await handlers['record-read']({}, DAPP_ORIGIN);
      await handlers['reader-public-key']({ networkId: NETWORK_ID });
      await handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '0',
        counters: ['3', '4'],
      });
      await handlers['record-write']({ record }, DAPP_ORIGIN);
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledOnce();
    });

    it('refuses sign-in an authorisation without touching the key source', async () => {
      const { handlers, keySource } = await setupInSession();
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(new FlowScopeError('sign-in', { kind: 'authorise' }));

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('serves add-device its commitments, the add circuit, the record read and the record write', async () => {
      const { get, handlers } = await setupSeededInSession(ADD_DEVICE);

      await handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '0',
        counters: ['3'],
      });
      await handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN);
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['record-write']({ record }, DAPP_ORIGIN);
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledOnce();
    });

    it('refuses add-device the device public key', async () => {
      const { handlers } = await setupInSession(ADD_DEVICE);

      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new FlowScopeError('add-device', { kind: 'device-public-key' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses add-device the remove circuit, naming it', async () => {
      const { handlers, keySource } = await setupInSession(ADD_DEVICE);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers.authorise(
          {
            ...addDeviceAuthorisation,
            circuit: 'remove_device_with_jubjub',
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('add-device', {
          circuit: 'remove_device_with_jubjub',
        }),
      );

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses remove-device its circuit before a fresh-roster rotation, and the add circuit', async () => {
      const { handlers, keySource } = await setupInSession(REMOVE_DEVICE);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers.authorise(
          {
            ...addDeviceAuthorisation,
            circuit: 'remove_device_with_jubjub',
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'rotation' }),
      );
      expect(deviceSecret).not.toHaveBeenCalled();
      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', {
          circuit: 'add_device_with_jubjub',
        }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses add-device an authorisation for another commitment without touching the key source', async () => {
      const { handlers, keySource } = await setupInSession(ADD_DEVICE);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers.authorise(
          { ...addDeviceAuthorisation, args: [OTHER_ENTRY] },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('add-device', { argument: 'args[0]' }),
      );

      expect(deviceSecret).not.toHaveBeenCalled();
      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses a device authorisation whose arguments are not the one entry', async () => {
      const { handlers, keySource } = await setupInSession(REMOVE_DEVICE);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');
      const removal = {
        ...addDeviceAuthorisation,
        circuit: 'remove_device_with_jubjub',
      };

      for (const args of [
        [],
        [NEW_ENTRY, NEW_ENTRY],
        [COMMITMENT_HEX],
        [OTHER_ENTRY],
        [NEW_ENTRY.subarray(1)],
      ]) {
        await expect(
          handlers.authorise({ ...removal, args }, DAPP_ORIGIN),
        ).rejects.toThrow(
          new FlowScopeError('remove-device', { argument: 'args[0]' }),
        );
      }

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses remove-device a delivery to a joining device and a grant seal', async () => {
      const { handlers } = await setupInSession(REMOVE_DEVICE);

      await expect(
        handlers['seal-to-device']({
          networkId: NETWORK_ID,
          keyring: { account: ACCOUNT, encKey: '00'.repeat(32), envelopes: [] },
          reader: {
            readerPublicKey: '12'.repeat(32),
            devicePublicKey: '34'.repeat(32),
            epoch: '0',
            counter: '0',
          },
        }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { kind: 'seal-to-device' }),
      );
      await expect(
        handlers['seal-grant']({
          networkId: NETWORK_ID,
          account: ACCOUNT,
          grant: {},
        }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { kind: 'seal-grant' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('holds a device authorisation to the account its descriptor names', async () => {
      const { handlers } = await setupInSession(ADD_DEVICE);

      await expect(
        handlers.authorise(
          {
            ...addDeviceAuthorisation,
            account: 'ad'.repeat(32),
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('add-device', { argument: 'account' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('reports the scope gate under its own code', () => {
      const error = new FlowScopeError('sign-in', { kind: 'authorise' });

      expect(error.code).toBe('flow-scope');
      expect(error.name).toBe('FlowScopeError');
      expect(error.message).toContain('"authorise"');
      expect(
        new FlowScopeError('add-device', { argument: 'args[0]' }).message,
      ).toBe(
        'The authorisation argument "args[0]" is not what the "add-device" flow was approved for.',
      );
    });
  });

  describe('grant flows', () => {
    const issueAuthorisation = (args: readonly unknown[]) => ({
      ...addDeviceAuthorisation,
      circuit: ISSUE_GRANT_CIRCUIT,
      args: [...args],
    });
    const grantIdBytes = (grantId: string) =>
      ByteArray.fromHex(HexBytes(grantId));

    it('opens an issue-grant session whose descriptor re-derives for the dApp origin', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow }, DAPP_ORIGIN),
      ).resolves.toBeUndefined();
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(get).toHaveBeenCalledOnce();
    });

    it('serves issue-grant its commitments, the issue circuit and the record, from one ceremony', async () => {
      const { flow, args } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = await setupSeededInSession(flow, DAPP_ORIGIN);

      await handlers['device-commitments']({
        account: ACCOUNT,
        epoch: '0',
        counters: ['3'],
      });
      await expect(
        handlers.authorise(issueAuthorisation(args), DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
      await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
        record,
      );
      await handlers['record-write']({ record }, DAPP_ORIGIN);
      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new FlowScopeError('issue-grant', { kind: 'device-public-key' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledOnce();
    });

    it('refuses issue-grant every other circuit, naming it', async () => {
      const { flow, args } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      for (const circuit of [
        REVOKE_GRANT_CIRCUIT,
        REVOKE_ALL_GRANTS_CIRCUIT,
        'add_device_with_jubjub',
      ]) {
        await expect(
          handlers.authorise(
            { ...issueAuthorisation(args), circuit },
            DAPP_ORIGIN,
          ),
        ).rejects.toThrow(new FlowScopeError('issue-grant', { circuit }));
      }

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses an issue authorisation for another account, grant id or scope without touching the key source', async () => {
      const { flow, args } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const other = await prepareIssueGrantFlow(DAPP_HOSTNAME, {
        ...spendScope,
        cap: '451',
      });
      const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');
      const refusal = (argument: string) =>
        new FlowScopeError('issue-grant', { argument });

      await expect(
        handlers.authorise(
          {
            ...issueAuthorisation(args),
            account: 'ac'.repeat(32),
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(refusal('account'));
      await expect(
        handlers.authorise(
          issueAuthorisation([NEW_ENTRY, ...args.slice(1)]),
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(refusal('args[0]'));
      await expect(
        handlers.authorise(
          issueAuthorisation([args[0], ...other.args.slice(1)]),
        ),
      ).rejects.toThrow(refusal('args[1..17]'));
      await expect(
        handlers.authorise(issueAuthorisation(args.slice(0, 17)), DAPP_ORIGIN),
      ).rejects.toThrow(refusal('args'));
      await expect(
        handlers.authorise(
          {
            ...issueAuthorisation(args),
            args: 'all' as unknown as unknown[],
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(refusal('args'));

      expect(deviceSecret).not.toHaveBeenCalled();
      await expect(
        handlers.authorise(issueAuthorisation(args), DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses a grant id derived for another site before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow('other.example');
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow }, DAPP_ORIGIN),
      ).rejects.toThrow(new GrantBindingMismatchError('grantId'));

      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new KeySessionRequiredError('device-public-key'),
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a grant id derived for another slot or account before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow: { ...flow, slot: 1 } }, DAPP_ORIGIN),
      ).rejects.toThrow(new GrantBindingMismatchError('grantId'));
      await expect(
        handlers['flow-open'](
          { flow: { ...flow, account: 'ac'.repeat(32) } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(new GrantBindingMismatchError('grantId'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a scope digest that does not re-derive from the scope and salt before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();
      const mismatch = new GrantBindingMismatchError('scopeDigest');

      await expect(
        handlers['flow-open'](
          { flow: { ...flow, scopeDigest: 'ab'.repeat(32) } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(mismatch);
      await expect(
        handlers['flow-open'](
          { flow: { ...flow, scope: { ...spendScope, cap: '451' } } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(mismatch);
      await expect(
        handlers['flow-open'](
          { flow: { ...flow, scopeSalt: '23'.repeat(32) } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(mismatch);
      expect(get).not.toHaveBeenCalled();
    });

    it('binds the hostname of the observed origin, whatever its scheme and port', async () => {
      const { flow } = await prepareIssueGrantFlow('localhost');
      const { handlers } = setup();

      await expect(
        handlers['flow-open']({ flow }, 'http://localhost:5173'),
      ).resolves.toBeUndefined();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses an issue-grant without the dApp origin before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(handlers['flow-open']({ flow })).rejects.toThrow(
        GrantOriginMissingError,
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a small-order grantee key before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open'](
          {
            flow: {
              ...flow,
              scope: {
                ...spendScope,
                grantee: {
                  scheme: 'jubjub-schnorr',
                  publicKey: HexBytes(`01${'00'.repeat(31)}`),
                },
              },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(GrantScopeInvalidError);
      expect(get).not.toHaveBeenCalled();
    });

    it('signs the issue of a secp256k1 grant whose id derives under the k256 arm with the plain ECDSA envelope', async () => {
      const { flow, args } = await prepareIssueGrantFlow(
        DAPP_HOSTNAME,
        k256SpendScope,
      );
      const { get, handlers } = await setupSeededInSession(flow, DAPP_ORIGIN);

      expect(flow.grantId).toBe(
        HexBytes.fromByteArray(
          pureCircuits.derive_grant_id_with_k256(
            { bytes: CONTRACT_ADDRESS },
            pureCircuits.compute_public_point_with_k256(K256_GRANTEE_SECRET),
            0n,
            await originHash(DAPP_HOSTNAME),
            BigInt(flow.slot),
          ),
        ),
      );
      await expect(
        handlers.authorise(issueAuthorisation(args), DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(get).toHaveBeenCalledOnce();
    });

    it('refuses a secp256k1 grant id derived for a jubjub grantee or under another envelope before any ceremony', async () => {
      const k256 = await prepareIssueGrantFlow(DAPP_HOSTNAME, k256SpendScope);
      const jubjub = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();
      const mismatch = new GrantBindingMismatchError('grantId');
      const otherEnvelopeId = HexBytes.fromByteArray(
        pureCircuits.derive_grant_id_with_k256(
          { bytes: CONTRACT_ADDRESS },
          pureCircuits.compute_public_point_with_k256(K256_GRANTEE_SECRET),
          1n,
          await originHash(DAPP_HOSTNAME),
          BigInt(k256.flow.slot),
        ),
      );

      for (const flow of [
        { ...k256.flow, grantId: jubjub.flow.grantId },
        { ...k256.flow, grantId: otherEnvelopeId },
        { ...jubjub.flow, grantId: k256.flow.grantId },
        { ...jubjub.flow, scope: k256SpendScope },
      ]) {
        await expect(
          handlers['flow-open']({ flow }, DAPP_ORIGIN),
        ).rejects.toThrow(mismatch);
      }
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a secp256k1 grantee key off the curve before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(
        DAPP_HOSTNAME,
        k256SpendScope,
      );
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open'](
          {
            flow: {
              ...flow,
              scope: {
                ...k256SpendScope,
                grantee: {
                  scheme: 'secp256k1-ecdsa',
                  publicKey: HexBytes(`02${'00'.repeat(32)}`),
                },
              },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(GrantScopeInvalidError);
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a scope the contract would not issue before any ceremony', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open'](
          {
            flow: {
              ...flow,
              scope: { ...spendScope, operations: ['withdraw-shielded'] },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new GrantScopeInvalidError('shielded spend requires read'),
      );
      await expect(
        handlers['flow-open'](
          {
            flow: {
              ...flow,
              scope: {
                ...spendScope,
                window: { lengthSeconds: 60, cap: '1' },
              },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(new MalformedPayloadError('flow.scope.window'));
      expect(get).not.toHaveBeenCalled();
    });

    it('serves revoke-grant its one circuit for the approved id only', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { handlers, keySource } = await setupInSession({
        kind: 'revoke-grant',
        grantId: flow.grantId,
        account: ACCOUNT,
      });
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');
      const revocation = {
        ...addDeviceAuthorisation,
        circuit: REVOKE_GRANT_CIRCUIT,
        args: [grantIdBytes(flow.grantId)],
      };

      await expect(
        handlers.authorise({ ...revocation, args: [NEW_ENTRY] }, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('revoke-grant', { argument: 'args[0]' }),
      );
      await expect(
        handlers.authorise(
          { ...revocation, circuit: ISSUE_GRANT_CIRCUIT },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('revoke-grant', { circuit: ISSUE_GRANT_CIRCUIT }),
      );
      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new FlowScopeError('revoke-grant', { kind: 'device-public-key' }),
      );
      await expect(
        handlers.authorise(
          { ...revocation, account: 'ad'.repeat(32) },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('revoke-grant', { argument: 'account' }),
      );
      expect(deviceSecret).not.toHaveBeenCalled();

      await expect(
        handlers.authorise(revocation, DAPP_ORIGIN),
      ).resolves.toMatchObject({
        scheme: 'jubjub-schnorr',
      });
      await expect(handlers.authorise(revocation, DAPP_ORIGIN)).rejects.toThrow(
        new FlowScopeError('revoke-grant', { argument: 'revocation' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('serves revoke-all-grants its one circuit with no argument', async () => {
      const { handlers, keySource } = await setupInSession({
        kind: 'revoke-all-grants',
        account: ACCOUNT,
      });
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');
      const revocation = {
        ...addDeviceAuthorisation,
        circuit: REVOKE_ALL_GRANTS_CIRCUIT,
        args: [],
      };

      await expect(
        handlers.authorise({ ...revocation, args: [NEW_ENTRY] }, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('revoke-all-grants', { argument: 'args' }),
      );
      await expect(
        handlers.authorise(
          { ...revocation, circuit: REVOKE_GRANT_CIRCUIT },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('revoke-all-grants', {
          circuit: REVOKE_GRANT_CIRCUIT,
        }),
      );
      await expect(
        handlers.authorise(
          { ...revocation, account: 'ad'.repeat(32) },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('revoke-all-grants', { argument: 'account' }),
      );
      expect(deviceSecret).not.toHaveBeenCalled();

      await expect(
        handlers.authorise(revocation, DAPP_ORIGIN),
      ).resolves.toMatchObject({
        scheme: 'jubjub-schnorr',
      });
      await expect(handlers.authorise(revocation, DAPP_ORIGIN)).rejects.toThrow(
        new FlowScopeError('revoke-all-grants', { argument: 'revocation' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('reports the binding gate under its own code', () => {
      const error = new GrantBindingMismatchError('grantId');

      expect(error.code).toBe('grant-binding-mismatch');
      expect(error.name).toBe('GrantBindingMismatchError');
      expect(error.message).toContain('grant id');
      expect(new GrantBindingMismatchError('scopeDigest').message).toContain(
        'scope digest',
      );
    });
  });

  describe('install-operations flow', () => {
    const INSTALL_OPERATIONS: SignerFlow = {
      kind: 'install-operations',
      account: ACCOUNT,
      operations: ['withdraw_unshielded_with_grant_k256'],
    };

    it('serves this device reader key and refuses every key, record and circuit request, naming the kind', async () => {
      const { handlers, keySource } = await setupInSession(
        INSTALL_OPERATIONS,
        DAPP_ORIGIN,
      );
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      await expect(
        handlers['reader-public-key']({ networkId: NETWORK_ID }),
      ).resolves.toEqual(expect.any(String));
      for (const kind of [
        'device-public-key',
        'device-commitments',
        'record-read',
        'record-write',
        'create-keys',
        'open-inbox',
        'reencrypt-inbox',
        'seal-view',
      ] as const) {
        await expect(
          (handlers[kind] as (payload: unknown) => Promise<unknown>)({}),
        ).rejects.toThrow(new FlowScopeError('install-operations', { kind }));
      }
      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('install-operations', { kind: 'authorise' }),
      );

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });
  });

  describe('read-holdings flow', () => {
    const READ_HOLDINGS: SignerFlow = { kind: 'read-holdings' };
    const coin = {
      nonce: new Uint8Array(32).fill(1),
      color: new Uint8Array(32).fill(2),
      value: 9n,
    };
    const opened = {
      kind: 'coin',
      coin: { nonce: '01'.repeat(32), color: '02'.repeat(32), value: '9' },
    };
    const sealedTo = async (encKey: string) =>
      HexBytes.fromByteArray(
        await sealInboxEntry(ByteArray.fromHex(HexBytes(encKey)), coin),
      );

    it('opens only the coins sealed to the account key its envelope delivers, from one ceremony', async () => {
      const { get, handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({ flow: READ_HOLDINGS });

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: keyringOf(keys),
          entries: [
            await sealedTo(keys.encKey),
            '00'.repeat(192),
            ...keys.registrations,
          ],
        }),
      ).resolves.toEqual([opened, null, null]);
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledTimes(2);
    });

    it('opens a coin left under an earlier key the keyring still delivers', async () => {
      const { handlers } = setup();
      const first = await drawAccountKeys(handlers);
      const second = await drawAccountKeys(handlers);
      await handlers['flow-open']({ flow: READ_HOLDINGS });

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: {
            account: ACCOUNT,
            encKey: second.encKey,
            envelopes: [second.envelopes[0], first.envelopes[0]],
          },
          entries: [
            await sealedTo(first.encKey),
            await sealedTo(second.encKey),
          ],
        }),
      ).resolves.toEqual([opened, opened]);
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses a keyring none of whose envelopes opens its enc_key', async () => {
      const { handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({ flow: READ_HOLDINGS });

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: { ...keyringOf(keys), encKey: '07'.repeat(32) },
          entries: [],
        }),
      ).rejects.toMatchObject({ code: 'encryption-key-mismatch' });
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses a keyring past the envelope bound before touching the key source', async () => {
      const { handlers, keySource } = await setupInSession(READ_HOLDINGS);
      const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: {
            account: ACCOUNT,
            encKey: '07'.repeat(32),
            envelopes: Array.from(
              { length: MAX_INBOX_ENTRIES_PER_REQUEST + 1 },
              () => 'd1'.repeat(192),
            ),
          },
          entries: [],
        }),
      ).rejects.toThrow(new MalformedPayloadError('keyring.envelopes'));
      expect(deriveSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('finds where the live envelope sits in a page, past envelopes anyone sealed to this reader key, from the one ceremony', async () => {
      const { get, handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({ flow: READ_HOLDINGS });
      const readerPublicKey = ByteArray.fromHex(
        HexBytes(
          (await handlers['reader-public-key']({
            networkId: NETWORK_ID,
          })) as string,
        ),
      );
      const forged = async () =>
        HexBytes.fromByteArray(
          await sealDeviceEnvelope(readerPublicKey, {
            secret: x25519.utils.randomSecretKey(),
            rosterKey: crypto.getRandomValues(new Uint8Array(32)),
          }),
        );
      const pageOf = (envelopes: string[]) => ({
        networkId: NETWORK_ID,
        keyring: { ...keyringOf(keys), envelopes },
      });

      await expect(
        handlers['find-live-envelope'](
          pageOf([await forged(), keys.envelopes[0], await forged()]),
        ),
      ).resolves.toBe(1);
      await expect(
        handlers['find-live-envelope'](pageOf([await forged()])),
      ).resolves.toBeNull();
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(get).toHaveBeenCalledTimes(2);
    });

    it('refuses a page past the envelope bound before touching the key source', async () => {
      const { handlers, keySource } = await setupInSession(READ_HOLDINGS);
      const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
      const page = (length: number) => ({
        networkId: NETWORK_ID,
        keyring: {
          account: ACCOUNT,
          encKey: '07'.repeat(32),
          envelopes: Array.from({ length }, () => 'd1'.repeat(192)),
        },
      });

      await expect(
        handlers['find-live-envelope'](page(MAX_INBOX_ENTRIES_PER_REQUEST + 1)),
      ).rejects.toThrow(new MalformedPayloadError('keyring.envelopes'));
      expect(deriveSecret).not.toHaveBeenCalled();
      await expect(handlers['find-live-envelope'](page(1))).resolves.toBeNull();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses finding the live envelope in a create-account session and outside a session', async () => {
      const { handlers } = await setupInSession(CREATE_ACCOUNT, DAPP_ORIGIN);
      const page = {
        networkId: NETWORK_ID,
        keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
      };

      await expect(handlers['find-live-envelope'](page)).rejects.toThrow(
        new FlowScopeError('create-account', { kind: 'find-live-envelope' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
      await expect(handlers['find-live-envelope'](page)).rejects.toThrow(
        new KeySessionRequiredError('find-live-envelope'),
      );
    });

    it('refuses read-holdings every other kind, naming it', async () => {
      const { handlers, keySource } = await setupInSession(READ_HOLDINGS);
      const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

      for (const kind of [
        'device-public-key',
        'record-read',
        'create-keys',
        'reencrypt-inbox',
        'seal-view',
      ] as const) {
        await expect(
          (handlers[kind] as (payload: unknown) => Promise<unknown>)({}),
        ).rejects.toThrow(new FlowScopeError('read-holdings', { kind }));
      }
      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('read-holdings', { kind: 'authorise' }),
      );

      expect(deviceSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses opening the inbox in a create-account session', async () => {
      const { handlers } = await setupInSession(CREATE_ACCOUNT, DAPP_ORIGIN);

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
          entries: [],
        }),
      ).rejects.toThrow(
        new FlowScopeError('create-account', { kind: 'open-inbox' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses opening the inbox outside a session, running no ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
          entries: [],
        }),
      ).rejects.toThrow(new KeySessionRequiredError('open-inbox'));

      expect(get).not.toHaveBeenCalled();
    });

    it('opens exactly the shared maximum of entries in one request', async () => {
      const { handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({ flow: READ_HOLDINGS });

      const items = await handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        entries: Array.from({ length: MAX_INBOX_ENTRIES_PER_REQUEST }, () =>
          '00'.repeat(192),
        ),
      });

      expect(items).toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST);
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses a request of more entries than the shared maximum before touching the key source', async () => {
      const { handlers, keySource } = await setupInSession(READ_HOLDINGS);
      const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
          entries: Array.from(
            { length: MAX_INBOX_ENTRIES_PER_REQUEST + 1 },
            () => '00'.repeat(192),
          ),
        }),
      ).rejects.toThrow(
        new InboxRequestTooLargeError(MAX_INBOX_ENTRIES_PER_REQUEST),
      );

      expect(deriveSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('names the bound in the refusal of a request with too many entries', () => {
      const error = new InboxRequestTooLargeError(
        MAX_INBOX_ENTRIES_PER_REQUEST,
      );

      expect(error.code).toBe('inbox-request-too-large');
      expect(error.name).toBe('InboxRequestTooLargeError');
      expect(error.details).toEqual({
        maxEntries: MAX_INBOX_ENTRIES_PER_REQUEST,
      });
    });

    it('refuses an entry that is not 192 bytes of hex before touching the key source', async () => {
      const { handlers, keySource } = await setupInSession(READ_HOLDINGS);
      const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

      await expect(
        handlers['open-inbox']({
          networkId: NETWORK_ID,
          keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
          entries: ['00'.repeat(192), '00'.repeat(191)],
        }),
      ).rejects.toThrow(new MalformedPayloadError('entries[1]'));

      expect(deriveSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });
  });

  describe('flow descriptor', () => {
    it.each([
      'account',
      'grantId',
      'scope',
      'slot',
      'scopeSalt',
      'scopeDigest',
    ] as const)(
      'refuses an issue-grant descriptor without %s, before any ceremony',
      async field => {
        const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
        const { get, handlers } = setup();

        await expect(
          handlers['flow-open'](
            { flow: { ...flow, [field]: undefined } },
            DAPP_ORIGIN,
          ),
        ).rejects.toThrow(new MalformedPayloadError(`flow.${field}`));
        expect(get).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['account', { account: 'ac'.repeat(31) }, 'flow.account'],
      ['grantId', { grantId: 'AB'.repeat(32) }, 'flow.grantId'],
      ['scope', { scope: { ...spendScope, cap: '1.5' } }, 'flow.scope.cap'],
      ['slot', { slot: '0' }, 'flow.slot'],
      ['slot', { slot: 256 }, 'flow.slot'],
      ['scopeSalt', { scopeSalt: '22'.repeat(31) }, 'flow.scopeSalt'],
      ['scopeDigest', { scopeDigest: 'ab'.repeat(31) }, 'flow.scopeDigest'],
    ])(
      'refuses an issue-grant descriptor with a malformed %s, naming the field',
      async (_, overrides, field) => {
        const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
        const { get, handlers } = setup();

        await expect(
          handlers['flow-open'](
            { flow: { ...flow, ...overrides } as SignerFlow },
            DAPP_ORIGIN,
          ),
        ).rejects.toThrow(new MalformedPayloadError(field));
        expect(get).not.toHaveBeenCalled();
      },
    );

    it('refuses a revoke-grant descriptor without a well-formed grant id', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow: { kind: 'revoke-grant' } }),
      ).rejects.toThrow(new MalformedPayloadError('flow.grantId'));
      await expect(
        handlers['flow-open']({
          flow: { kind: 'revoke-grant', grantId: 'ab'.repeat(31) },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.grantId'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a grant field on a flow that binds none, and a commitment on a grant flow', async () => {
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({
          flow: { kind: 'sign-in', grantId: flow.grantId },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.grantId'));
      await expect(
        handlers['flow-open']({
          flow: { ...ADD_DEVICE, scope: spendScope },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.scope'));
      await expect(
        handlers['flow-open']({
          flow: { kind: 'revoke-all-grants', grantId: flow.grantId },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.grantId'));
      await expect(
        handlers['flow-open']({
          flow: {
            kind: 'revoke-grant',
            grantId: flow.grantId,
            commitmentHex: COMMITMENT_HEX,
          },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      await expect(
        handlers['flow-open'](
          { flow: { ...flow, commitmentHex: COMMITMENT_HEX } },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      expect(get).not.toHaveBeenCalled();
    });

    it('tells the page which grant flow expired, with its descriptor', async () => {
      const { timers, elapse } = createFakeTimers();
      const onSessionExpired = vi.fn();
      const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
      const { handlers } = setup({ timers, onSessionExpired });

      await handlers['flow-open']({ flow }, DAPP_ORIGIN);
      elapse();

      expect(onSessionExpired).toHaveBeenCalledExactlyOnceWith({
        ...flow,
        slot: GrantSlot(0),
      });
    });

    it('refuses an unknown flow kind without a ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({
          flow: { kind: 'withdraw' } as unknown as SignerFlow,
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.kind'));
      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new KeySessionRequiredError('device-public-key'),
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a missing descriptor without a ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow: undefined as unknown as SignerFlow }),
      ).rejects.toThrow(new MalformedPayloadError('flow'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a commitment that is not 32 bytes of hex without a ceremony', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({
          flow: { kind: 'add-device', commitmentHex: 'ab'.repeat(31) },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      await expect(
        handlers['flow-open']({
          flow: { kind: 'add-device', commitmentHex: 'zz'.repeat(32) },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      await expect(
        handlers['flow-open']({
          flow: {
            kind: 'add-device',
            commitmentHex: 7 as unknown as string,
          },
        }),
      ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a device flow without a commitment without a ceremony', async () => {
      const { get, handlers } = setup();

      for (const kind of ['add-device', 'remove-device'] as const) {
        await expect(handlers['flow-open']({ flow: { kind } })).rejects.toThrow(
          new MalformedPayloadError('flow.commitmentHex'),
        );
      }
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a device flow without a readable account without a ceremony', async () => {
      const { get, handlers } = setup();

      for (const kind of ['add-device', 'remove-device'] as const) {
        await expect(
          handlers['flow-open']({
            flow: { kind, commitmentHex: COMMITMENT_HEX },
          }),
        ).rejects.toThrow(new MalformedPayloadError('flow.account'));
        await expect(
          handlers['flow-open']({
            flow: { kind, commitmentHex: COMMITMENT_HEX, account: 'ac' },
          }),
        ).rejects.toThrow(new MalformedPayloadError('flow.account'));
      }
      expect(get).not.toHaveBeenCalled();
    });

    it('refuses a commitment on a flow that targets no device', async () => {
      const { get, handlers } = setup();

      for (const kind of ['create-account', 'sign-in'] as const) {
        await expect(
          handlers['flow-open']({
            flow: { kind, commitmentHex: COMMITMENT_HEX },
          }),
        ).rejects.toThrow(new MalformedPayloadError('flow.commitmentHex'));
      }
      expect(get).not.toHaveBeenCalled();
    });

    it('accepts a mixed-case commitment and binds the authorisation to it lowercase', async () => {
      const { timers, elapse } = createFakeTimers();
      const onSessionExpired = vi.fn();
      const { handlers } = setup({ timers, onSessionExpired });
      const mixedCase = COMMITMENT_HEX.replace(/5a/g, '5A');

      await handlers['flow-open']({
        flow: {
          kind: 'add-device',
          commitmentHex: mixedCase,
          account: ACCOUNT,
        },
      });

      await expect(
        handlers.authorise(addDeviceAuthorisation, DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
      elapse();
      expect(onSessionExpired).toHaveBeenCalledExactlyOnceWith(ADD_DEVICE);
    });

    it('opens a device flow whose commitment is well formed', async () => {
      const { get, handlers } = setup();

      await expect(
        handlers['flow-open']({ flow: ADD_DEVICE }),
      ).resolves.toBeUndefined();
      await handlers['flow-close'](FLOW_COMPLETED);
      expect(get).toHaveBeenCalledOnce();
    });
  });

  describe('session timeout', () => {
    it('arms the default five-minute deadline once the session is held', async () => {
      const { timers, pending } = createFakeTimers();
      const { handlers } = setup({ timers });

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });

      expect([...pending.values()].map(({ delayMs }) => delayMs)).toEqual([
        DEFAULT_TIMEOUT_MS,
      ]);
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('arms no deadline for a flow-open whose ceremony is dismissed', async () => {
      const { timers } = createFakeTimers();
      const { get, handlers } = setup({ timers });
      get.mockRejectedValueOnce(cancellation());

      await expect(
        handlers['flow-open']({ flow: { kind: 'sign-in' } }),
      ).rejects.toBeInstanceOf(CeremonyCancelledError);

      expect(timers.setTimeout).not.toHaveBeenCalled();
    });

    it('releases the session when the deadline elapses and tells the page', async () => {
      const { timers, elapse } = createFakeTimers();
      const onSessionExpired = vi.fn();
      const { keySource, handlers } = setup({
        timers,
        sessionTimeoutMs: 1000,
        onSessionExpired,
      });
      const withSession = vi.spyOn(keySource, 'withSession');

      await handlers['flow-open']({ flow: ADD_DEVICE });
      const session = withSession.mock.results[0].value as Promise<unknown>;
      expect(timers.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        1000,
      );
      await expect(isSettled(session)).resolves.toBe(false);

      elapse();

      await expect(isSettled(session)).resolves.toBe(true);
      expect(onSessionExpired).toHaveBeenCalledExactlyOnceWith(ADD_DEVICE);
    });

    it('fails every later request of the expired flow, its flow-close included', async () => {
      const { timers, elapse } = createFakeTimers();
      const { get, handlers, stored } = setup({ timers });
      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      elapse();

      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new SessionExpiredError('device-public-key'),
      );
      await expect(
        handlers['record-write']({ record }, DAPP_ORIGIN),
      ).rejects.toThrow(new SessionExpiredError('record-write'));
      await expect(handlers['flow-close'](FLOW_COMPLETED)).rejects.toThrow(
        new SessionExpiredError('flow-close'),
      );

      expect(get).toHaveBeenCalledOnce();
      expect(stored('passport-account', 'account')).toBeUndefined();
    });

    it('starts afresh on the next flow-open after an expiry', async () => {
      const { timers, elapse } = createFakeTimers();
      const { get, handlers } = setup({ timers });
      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      elapse();
      await expect(handlers['flow-close'](FLOW_COMPLETED)).rejects.toThrow(
        new SessionExpiredError('flow-close'),
      );
      await expect(handlers['device-public-key']({})).rejects.toThrow(
        new KeySessionRequiredError('device-public-key'),
      );

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      await expect(handlers['device-public-key']({})).resolves.toBeDefined();
      await expect(handlers['flow-close'](FLOW_COMPLETED)).resolves.toEqual(
        FLOW_COMPLETED,
      );
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('clears the deadline on flow-close, so it cannot fire into the next flow', async () => {
      const { timers, elapse, pending } = createFakeTimers();
      const onSessionExpired = vi.fn();
      const { handlers } = setup({ timers, onSessionExpired });

      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      const [deadline] = timers.setTimeout.mock.results.map(
        ({ value }) => value as number,
      );
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(timers.clearTimeout).toHaveBeenCalledExactlyOnceWith(deadline);
      expect(pending.size).toBe(0);
      await handlers['flow-open']({ flow: { kind: 'sign-in' } });
      elapse();
      expect(onSessionExpired).toHaveBeenCalledOnce();
      await expect(handlers['flow-close'](FLOW_COMPLETED)).rejects.toThrow(
        new SessionExpiredError('flow-close'),
      );
    });

    it('runs on the global timers when none are injected', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const onSessionExpired = vi.fn();
        const { handlers } = setup({ sessionTimeoutMs: 50, onSessionExpired });
        await handlers['flow-open']({ flow: { kind: 'sign-in' } });

        vi.advanceTimersByTime(49);
        expect(onSessionExpired).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(onSessionExpired).toHaveBeenCalledExactlyOnceWith({
          kind: 'sign-in',
        });
        await expect(handlers['flow-close'](FLOW_COMPLETED)).rejects.toThrow(
          new SessionExpiredError('flow-close'),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('reports the expiry under its own code', () => {
      const error = new SessionExpiredError('flow-close');

      expect(error.code).toBe('session-expired');
      expect(error.name).toBe('SessionExpiredError');
    });
  });
});

describe('account key sessions', () => {
  const joiner = x25519.utils.randomSecretKey();
  const joinerDevice = new JubjubDevice(77n);
  const leaverDevice = new JubjubDevice(78n);
  const entryOf = (device: JubjubDevice, counter = 0n) =>
    HexBytes.fromByteArray(device.entryAt(CONTRACT_ADDRESS, 0n, counter));
  const JOINER_ENTRY = entryOf(joinerDevice);
  const LEAVER_ENTRY = entryOf(leaverDevice);
  const OWN_ENTRY = HexBytes.fromByteArray(
    referenceDevice().entryAt(CONTRACT_ADDRESS, 0n, 0n),
  );
  const JOINER = {
    readerPublicKey: HexBytes.fromByteArray(x25519.getPublicKey(joiner)),
    devicePublicKey: encodeDevicePublicKey(joinerDevice.pk),
  };
  const LEAVER = {
    readerPublicKey: HexBytes.fromByteArray(
      x25519.getPublicKey(x25519.utils.randomSecretKey()),
    ),
    devicePublicKey: encodeDevicePublicKey(leaverDevice.pk),
  };
  const liveOf = (
    reader: typeof JOINER,
    counter = '0',
  ): typeof JOINER & { epoch: string; counter: string } => ({
    ...reader,
    epoch: '0',
    counter,
  });
  const addOf = (reader: typeof JOINER, commitmentHex: string): SignerFlow => ({
    kind: 'add-device',
    commitmentHex,
    account: ACCOUNT,
    reader,
  });
  const ADD_JOINER = addOf(JOINER, JOINER_ENTRY);
  const REMOVE_LEAVER: SignerFlow = {
    kind: 'remove-device',
    commitmentHex: LEAVER_ENTRY,
    account: ACCOUNT,
    devices: [OWN_ENTRY, JOINER_ENTRY],
  };
  const removeLeaver = {
    ...addDeviceAuthorisation,
    circuit: 'remove_device_with_jubjub',
    args: [ByteArray.fromHex(HexBytes(LEAVER_ENTRY))],
  };
  const appendOf = (entry: string) => ({
    ...addDeviceAuthorisation,
    circuit: APPEND_INBOX_CIRCUIT,
    args: [ByteArray.fromHex(HexBytes(entry))],
  });
  const rotateOf = (key: string) => ({
    ...addDeviceAuthorisation,
    circuit: ROTATE_ENC_KEY_CIRCUIT,
    args: [ByteArray.fromHex(HexBytes(key))],
  });

  /** A device's delivery, sealed in an add-device session that names it. */
  const deliverTo = async (
    handlers: Handlers,
    keys: EncodedAccountKeys,
    { reader, commitmentHex }: { reader: typeof JOINER; commitmentHex: string },
  ) => {
    await handlers['flow-open']({ flow: addOf(reader, commitmentHex) });
    const delivery = (await handlers['seal-to-device']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      reader: liveOf(reader),
    })) as { envelope: string; registration: string };
    await handlers['flow-close'](FLOW_COMPLETED);
    return delivery;
  };

  /** Keys with the joiner and the leaver both delivered and registered. */
  const enrolled = async (handlers: Handlers) => {
    const keys = await drawAccountKeys(handlers);
    const joined = await deliverTo(handlers, keys, {
      reader: JOINER,
      commitmentHex: JOINER_ENTRY,
    });
    const left = await deliverTo(handlers, keys, {
      reader: LEAVER,
      commitmentHex: LEAVER_ENTRY,
    });
    return {
      keys,
      registrations: [
        ...keys.registrations,
        joined.registration,
        left.registration,
      ],
    };
  };

  it('draws a fresh key at creation sealed to this signer alone, and appends only what it sealed', async () => {
    const { handlers, keySource } = await setupInSession(
      CREATE_ACCOUNT,
      DAPP_ORIGIN,
    );
    const reader = ByteArray.fromHex(
      HexBytes((await readerKeyOf(handlers)) as string),
    );

    const first = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const second = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;

    expect(first.encKey).not.toBe(second.encKey);
    expect(first.envelopes).toHaveLength(1);
    expect(first.registrations).toHaveLength(1);
    expect(
      isAddressedTo(ByteArray.fromHex(HexBytes(first.envelopes[0])), reader),
    ).toBe(true);
    await expect(
      handlers.authorise(appendOf(first.envelopes[0]), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await expect(
      handlers.authorise(appendOf(first.registrations[0]), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await expect(
      handlers.authorise(appendOf('d1'.repeat(192)), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'args[0]' }),
    );
    await expect(
      handlers.authorise(rotateOf(first.encKey), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', {
        circuit: ROTATE_ENC_KEY_CIRCUIT,
      }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    const local = createPasskeyEncryptionKey(keySource);
    await expect(
      local.openInbox(
        NETWORK_ID,
        {
          account: ACCOUNT,
          encKey: ByteArray.fromHex(HexBytes(first.encKey)),
          envelopes: [ByteArray.fromHex(HexBytes(first.envelopes[0]))],
        },
        [],
      ),
    ).resolves.toEqual([]);
  });

  it('lets a resumed creation append the key entries its stored pending deployment recorded, and nothing else', async () => {
    const { handlers } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    const keys = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await handlers['record-write'](
      {
        record: {
          ...record,
          localUseCounter: '0',
          deployment: {
            operations: ['add_device_with_jubjub'],
            lockAccount: false,
            verifierKeysDigest: 'f0'.repeat(32),
            saltHex: '11'.repeat(32),
            authorityKey: { tag: 'schnorr', value: '22'.repeat(32) },
            handoverAuthority: keys.authority,
            keyEntries: [keys.envelopes[0], keys.registrations[0]],
          },
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);

    for (const entry of [keys.envelopes[0], keys.registrations[0]]) {
      await expect(
        handlers.authorise(appendOf(entry), DAPP_ORIGIN),
      ).resolves.toMatchObject({
        scheme: 'jubjub-schnorr',
      });
    }
    await expect(
      handlers.authorise(appendOf('d1'.repeat(192)), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'args[0]' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a resumed creation the key entries a dApp wrote into the record, appending only those this signer kept', async () => {
    const { handlers } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    const keys = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const planted = 'd1'.repeat(192);
    await handlers['record-write'](
      {
        record: {
          ...record,
          localUseCounter: '0',
          deployment: {
            operations: ['add_device_with_jubjub'],
            lockAccount: false,
            verifierKeysDigest: 'f0'.repeat(32),
            saltHex: '11'.repeat(32),
            authorityKey: { tag: 'schnorr', value: '22'.repeat(32) },
            handoverAuthority: keys.authority,
            keyEntries: [planted],
          },
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);

    await expect(
      handlers.authorise(appendOf(planted), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'args[0]' }),
    );
    await expect(
      handlers.authorise(appendOf(keys.envelopes[0]), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses to open a creation over a complete stored record', async () => {
    const { handlers, keySource } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    const withSession = vi.spyOn(keySource, 'withSession');

    await expect(
      handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN),
    ).rejects.toThrow(AccountExistsError);
    expect(withSession).not.toHaveBeenCalled();
  });

  it('refuses a later flow changing the address of a stored record, pending or complete', async () => {
    const { handlers } = setup();
    const moved = { ...record, address: 'ad'.repeat(32) };
    const keys = await openCreation(handlers);
    await handlers['record-write'](
      {
        record: {
          ...record,
          deployment: pendingDeployment([], keys.authority),
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: { kind: 'sign-in' } });
    await expect(
      handlers['record-write']({ record: moved }, DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.address' }),
    );
    await expect(
      handlers['record-write'](
        { record: { ...record, localUseCounter: '9' } },
        DAPP_ORIGIN,
      ),
    ).resolves.toBeUndefined();
    await expect(
      handlers['record-write']({ record: moved }, DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.address' }),
    );
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual({
      ...record,
      localUseCounter: '9',
      deployment: { keyEntries: [] },
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses to re-pend a complete record and then move it within one session', async () => {
    const { handlers } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: { kind: 'sign-in' } });

    await expect(
      handlers['record-write'](
        {
          record: { ...record, deployment: pendingDeployment([]) },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.deployment' }),
    );
    await expect(
      handlers['record-write'](
        {
          record: { ...record, address: 'ad'.repeat(32) },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.address' }),
    );
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual(
      record,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a creation writing over a complete record it finds stored', async () => {
    const { handlers } = setup();
    const keys = await openCreation(handlers);
    await handlers['record-write'](
      {
        record: {
          ...record,
          deployment: pendingDeployment([], keys.authority),
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await expect(
      handlers['record-write'](
        {
          record: { ...record, deployment: pendingDeployment([]) },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'record' }),
    );
    await expect(
      handlers['record-write']({ record }, DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'record' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('forgets the kept creation entries once a complete record is written', async () => {
    const { handlers, stored } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    const keys = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const kept = [keys.envelopes[0], keys.registrations[0]];
    await handlers['record-write'](
      {
        record: {
          ...record,
          deployment: pendingDeployment(kept, keys.authority),
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    expect(stored('passport-creation-key-entries', 'pending-creation')).toEqual(
      { origin: DAPP_HOSTNAME, entries: kept },
    );

    await handlers['flow-open']({ flow: { kind: 'sign-in' } });
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    expect(stored('passport-creation-key-entries', 'pending-creation')).toEqual(
      { origin: DAPP_HOSTNAME, entries: kept },
    );

    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(
      stored('passport-creation-key-entries', 'pending-creation'),
    ).toBeUndefined();
  });

  it('refuses account keys for another device key, a creation that names a keyring, and a rotation that names none', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: '34'.repeat(32),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'devicePublicKey' }),
    );
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'keyring' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'keyring' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses more registrations or readers than one request may before touching the key source', async () => {
    const { handlers, keySource } = await setupInSession(REMOVE_LEAVER);
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
    const request = {
      networkId: NETWORK_ID,
      devicePublicKey: ownDeviceKey(),
      keyring: { account: ACCOUNT, encKey: '07'.repeat(32), envelopes: [] },
      rotateRoster: true,
    };

    await expect(
      handlers['create-keys'](
        {
          ...request,
          registrations: Array.from(
            { length: MAX_INBOX_ENTRIES_PER_REQUEST + 1 },
            () => 'd2'.repeat(192),
          ),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new InboxRequestTooLargeError(MAX_INBOX_ENTRIES_PER_REQUEST),
    );
    await expect(
      handlers['create-keys'](
        {
          ...request,
          readers: Array.from(
            { length: MAX_INBOX_ENTRIES_PER_REQUEST + 1 },
            () => liveOf(JOINER),
          ),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new InboxRequestTooLargeError(MAX_INBOX_ENTRIES_PER_REQUEST),
    );
    expect(deriveSecret).not.toHaveBeenCalled();
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('delivers the live keys to the joining device the enrolment names, and appends the delivery', async () => {
    const { get, handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: ADD_JOINER });

    await handlers['device-public-key']({});
    await handlers['reader-public-key']({ networkId: NETWORK_ID });
    const delivery = (await handlers['seal-to-device']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      reader: liveOf(JOINER),
    })) as { envelope: string; registration: string };
    await handlers.authorise(appendOf(delivery.envelope), DAPP_ORIGIN);
    await handlers.authorise(appendOf(delivery.registration), DAPP_ORIGIN);
    await handlers.authorise(
      {
        ...addDeviceAuthorisation,
        args: [ByteArray.fromHex(HexBytes(JOINER_ENTRY))],
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);

    const opened = await openDeviceEnvelope(
      joiner,
      ByteArray.fromHex(HexBytes(delivery.envelope)),
    );
    expect(
      opened && HexBytes.fromByteArray(x25519.getPublicKey(opened.secret)),
    ).toBe(keys.encKey);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('seals to no reader but the one the enrolment names, whose device key derives the entry at counter 0, and to none without one', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const other = {
      ...JOINER,
      readerPublicKey: HexBytes.fromByteArray(
        x25519.getPublicKey(x25519.utils.randomSecretKey()),
      ),
    };
    await handlers['flow-open']({ flow: ADD_JOINER });

    for (const reader of [
      liveOf(other),
      liveOf({ ...JOINER, devicePublicKey: LEAVER.devicePublicKey }),
      liveOf(JOINER, '1'),
    ]) {
      await expect(
        handlers['seal-to-device']({
          networkId: NETWORK_ID,
          keyring: keyringOf(keys),
          reader,
        }),
      ).rejects.toThrow(
        new FlowScopeError('add-device', { argument: 'reader' }),
      );
    }
    await expect(
      handlers.authorise(appendOf(keys.envelopes[0]), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { argument: 'args[0]' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: addOf(JOINER, LEAVER_ENTRY) });
    await expect(
      handlers['seal-to-device']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        reader: liveOf(JOINER),
      }),
    ).rejects.toThrow(new FlowScopeError('add-device', { argument: 'reader' }));
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: ADD_DEVICE });
    await expect(
      handlers['seal-to-device']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        reader: liveOf(JOINER),
      }),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { kind: 'seal-to-device' }),
    );
    await expect(
      handlers.authorise(appendOf(keys.envelopes[0]), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { circuit: APPEND_INBOX_CIRCUIT }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('rotates a removal to a fresh key and roster sealed only to the devices the descriptor keeps, then signs the removal', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    const coin = {
      nonce: new Uint8Array(32).fill(1),
      color: new Uint8Array(32).fill(2),
      value: 9n,
    };
    const held = HexBytes.fromByteArray(
      await sealInboxEntry(ByteArray.fromHex(HexBytes(keys.encKey)), coin),
    );
    await handlers['flow-open']({ flow: REMOVE_LEAVER });

    const roster = (await handlers['open-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      entries: registrations,
    })) as { kind: string }[];
    await expect(handlers.authorise(removeLeaver, DAPP_ORIGIN)).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'rotation' }),
    );
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
        registrations,
        readers: [liveOf(JOINER)],
        rotateRoster: true,
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const [moved] = (await handlers['reencrypt-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      to: drawn.encKey,
      entries: [held],
    })) as string[];
    for (const entry of [...drawn.envelopes, ...drawn.registrations]) {
      await handlers.authorise(appendOf(entry), DAPP_ORIGIN);
    }
    await handlers.authorise(rotateOf(drawn.encKey), DAPP_ORIGIN);
    await handlers.authorise(appendOf(moved), DAPP_ORIGIN);
    await expect(
      handlers.authorise(removeLeaver, DAPP_ORIGIN),
    ).resolves.toMatchObject({
      scheme: 'jubjub-schnorr',
    });
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(roster.map(({ kind }) => kind)).toEqual([
      'device',
      'device',
      'device',
    ]);
    expect(drawn.envelopes).toHaveLength(2);
    expect(drawn.registrations).toHaveLength(2);
    const joinerSecrets = await openDeviceEnvelope(
      joiner,
      ByteArray.fromHex(HexBytes(drawn.envelopes[1])),
    );
    expect(
      joinerSecrets &&
        HexBytes.fromByteArray(x25519.getPublicKey(joinerSecrets.secret)),
    ).toBe(drawn.encKey);
  });

  it('refuses a removal rotation whose readers stray from the device entries the descriptor keeps', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });
    const request = {
      networkId: NETWORK_ID,
      devicePublicKey: ownDeviceKey(),
      keyring: keyringOf(keys),
      registrations,
      rotateRoster: true,
    };

    await expect(
      handlers['create-keys'](
        { ...request, readers: [liveOf(LEAVER)] },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'readers[0]' }),
    );
    await expect(
      handlers['create-keys'](
        {
          ...request,
          readers: [liveOf(JOINER), liveOf(JOINER)],
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'readers[1]' }),
    );
    await expect(
      handlers['create-keys'](
        { ...request, readers: [liveOf(JOINER, '5')] },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'readers[0]' }),
    );
    await expect(
      handlers['create-keys'](
        {
          ...request,
          readers: [liveOf(JOINER)],
          rotateRoster: false,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'rotateRoster' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  /** Signs a rotation of the enrolled account away from `keys` in a removal session. */
  const signRotation = async (
    handlers: Handlers,
    { keys, registrations }: Awaited<ReturnType<typeof enrolled>>,
  ): Promise<EncodedAccountKeys> => {
    await handlers['flow-open']({ flow: REMOVE_LEAVER });
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
        registrations,
        readers: [liveOf(JOINER)],
        rotateRoster: true,
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await handlers.authorise(rotateOf(drawn.encKey), DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    return drawn;
  };

  it('refuses a removed device outside a removal, and one that does not derive the target entry', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          removed: {
            devicePublicKey: LEAVER.devicePublicKey,
            epoch: '0',
            counter: '0',
          },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'removed' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER)],
          rotateRoster: true,
          removed: {
            devicePublicKey: JOINER.devicePublicKey,
            epoch: '0',
            counter: '0',
          },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'removed' }),
    );
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER)],
          rotateRoster: true,
          removed: {
            devicePublicKey: LEAVER.devicePublicKey,
            epoch: '0',
            counter: '0',
          },
        },
        DAPP_ORIGIN,
      ),
    ).resolves.toMatchObject({ encKey: expect.any(String) as unknown });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('seals to no reader the roster pairs with the removed device, however it was registered', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    const planted = {
      readerPublicKey: LEAVER.readerPublicKey,
      devicePublicKey: JOINER.devicePublicKey,
    };
    const plantedDelivery = await deliverTo(handlers, keys, {
      reader: planted,
      commitmentHex: JOINER_ENTRY,
    });
    await handlers['flow-open']({ flow: REMOVE_LEAVER });

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations: [...registrations, plantedDelivery.registration],
          readers: [liveOf(planted)],
          rotateRoster: true,
          removed: {
            devicePublicKey: LEAVER.devicePublicKey,
            epoch: '0',
            counter: '0',
          },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(DeviceRosterInvalidError);
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a reader whose device key derives the target entry when the removal names no removed device', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    await handlers['flow-open']({
      flow: {
        ...REMOVE_LEAVER,
        devices: [OWN_ENTRY, JOINER_ENTRY, entryOf(leaverDevice, 1n)],
      },
    });

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER), liveOf(LEAVER, '1')],
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'readers[1]' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('scans each distinct device key once for the target when the removal names no removed device', async () => {
    const { handlers } = setup();
    const { keys, registrations } = await enrolled(handlers);
    await handlers['flow-open']({
      flow: {
        ...REMOVE_LEAVER,
        devices: [OWN_ENTRY, JOINER_ENTRY, entryOf(joinerDevice, 1n)],
      },
    });
    scans.count = 0;

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER), liveOf(JOINER, '1')],
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(DeviceRosterInvalidError);
    expect(scans.count).toBe(1);
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('serves an enrolment under a live read grant the rotation ahead of it, handing the joiner only the key it rotated to', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({
      flow: { ...ADD_JOINER, devices: [OWN_ENTRY] },
    });

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations: keys.registrations,
          rotateRoster: false,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { argument: 'rotateRoster' }),
    );
    const rotated = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
        registrations: keys.registrations,
        rotateRoster: true,
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await expect(
      handlers['seal-to-device']({
        networkId: NETWORK_ID,
        keyring: keyringOf(rotated),
        reader: liveOf(JOINER),
      }),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { argument: 'keyring' }),
    );
    await expect(
      handlers.authorise(rotateOf(rotated.encKey), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await expect(
      handlers['seal-to-device']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        reader: liveOf(JOINER),
      }),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { argument: 'keyring' }),
    );
    const delivery = (await handlers['seal-to-device']({
      networkId: NETWORK_ID,
      keyring: keyringOf(rotated),
      reader: liveOf(JOINER),
    })) as { envelope: string };
    const opened = await openDeviceEnvelope(
      joiner,
      ByteArray.fromHex(HexBytes(delivery.envelope)),
    );
    expect(
      opened && HexBytes.fromByteArray(x25519.getPublicKey(opened.secret)),
    ).toBe(rotated.encKey);
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('serves no rotation to an enrolment whose descriptor names no device entries', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: ADD_JOINER });

    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations: keys.registrations,
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('add-device', { kind: 'create-keys' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a keyring of another account', async () => {
    const { handlers } = setup();
    const { keys } = await enrolled(handlers);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });

    await expect(
      handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: { ...keyringOf(keys), account: 'ad'.repeat(32) },
        entries: [],
      }),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'keyring.account' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('keeps the old key admissible after a rotation was signed but never landed', async () => {
    const { handlers } = setup();
    const account = await enrolled(handlers);
    await signRotation(handlers, account);

    await handlers['flow-open']({ flow: { kind: 'read-holdings' } });
    await expect(
      handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(account.keys),
        entries: [],
      }),
    ).resolves.toEqual([]);
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(account.keys),
          registrations: account.registrations,
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).resolves.toMatchObject({ encKey: expect.any(String) as unknown });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('retires the old key once a later session admits the key a signed rotation stepped to', async () => {
    const { handlers } = setup();
    const account = await enrolled(handlers);
    const drawn = await signRotation(handlers, account);

    await handlers['flow-open']({ flow: { kind: 'read-holdings' } });
    await expect(
      handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(drawn),
        entries: [],
      }),
    ).resolves.toEqual([]);
    await expect(
      handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(account.keys),
        entries: [],
      }),
    ).rejects.toThrow(
      new FlowScopeError('read-holdings', { argument: 'keyring.encKey' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: REMOVE_LEAVER });
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(account.keys),
          registrations: account.registrations,
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('remove-device', { argument: 'keyring.encKey' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  describe('maintenance updates', () => {
    const OTHER_AUTHORITY = {
      tag: 'schnorr' as const,
      value: '02'.repeat(33),
    };
    const replaceOf = (
      keyring: ReturnType<typeof keyringOf>,
      onChain: EncodedAccountKeys['authority'],
      installed: EncodedAccountKeys['authority'],
    ) => ({
      networkId: NETWORK_ID,
      keyring,
      authority: onChain,
      counter: '3',
      changes: { kind: 'replace-authority' as const, authority: installed },
    });

    it('moves the authority of a removal to the fresh roster key only once the rotation was signed, signing with the old one', async () => {
      const { handlers } = setup();
      const { keys, registrations } = await enrolled(handlers);
      await handlers['flow-open']({ flow: REMOVE_LEAVER });
      const drawn = (await handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER)],
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      )) as EncodedAccountKeys;
      const rotated = {
        account: ACCOUNT,
        encKey: drawn.encKey,
        envelopes: [drawn.envelopes[0], keys.envelopes[0]],
      };
      const replace = replaceOf(rotated, keys.authority, drawn.authority);

      await expect(
        handlers['sign-maintenance-update'](replace),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'keyring' }),
      );
      await handlers.authorise(rotateOf(drawn.encKey), DAPP_ORIGIN);
      await expect(
        handlers['sign-maintenance-update']({
          ...replace,
          changes: {
            kind: 'insert-verifier-keys',
            inserts: [{ operation: 'withdraw_unshielded', verifierKey: '01' }],
          },
        }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'changes' }),
      );
      await expect(
        handlers['sign-maintenance-update']({
          ...replace,
          keyring: keyringOf(keys),
        }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'keyring' }),
      );
      await expect(
        handlers['sign-maintenance-update']({
          ...replace,
          networkId: 'devnet',
        }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'networkId' }),
      );
      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(rotated, keys.authority, keys.authority),
        ),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'changes.authority' }),
      );
      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(rotated, OTHER_AUTHORITY, drawn.authority),
        ),
      ).resolves.toBeNull();
      const signed = (await handlers['sign-maintenance-update'](replace)) as {
        signature: ledgerV9.Signature;
        authority: EncodedAccountKeys['authority'];
      };
      await handlers['flow-close'](FLOW_COMPLETED);

      expect(signed.authority).toEqual(drawn.authority);
      expect(drawn.authority).not.toEqual(keys.authority);
      const update = maintenanceUpdateOf(ledgerV9, {
        address: ACCOUNT,
        counter: 3n,
        changes: { kind: 'replace-authority', authority: drawn.authority },
      });
      expect(
        ledgerV9.verifySignature(
          keys.authority,
          update.dataToSign,
          signed.signature,
        ),
      ).toBe(true);
    });

    it('moves the authority of an enrolment that rotates under a live read grant', async () => {
      const { handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({
        flow: { ...ADD_JOINER, devices: [OWN_ENTRY] },
      });
      const rotated = (await handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations: keys.registrations,
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      )) as EncodedAccountKeys;
      await handlers.authorise(rotateOf(rotated.encKey), DAPP_ORIGIN);

      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(
            {
              account: ACCOUNT,
              encKey: rotated.encKey,
              envelopes: [rotated.envelopes[0], keys.envelopes[0]],
            },
            keys.authority,
            rotated.authority,
          ),
        ),
      ).resolves.toMatchObject({ authority: rotated.authority });
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    /**
     * A keyring whose newest envelope delivers the rotated secret, opened
     * by `holder` from `delivered`, with a roster key of an attacker's,
     * ahead of the genuine envelope of the key it rotated from, and the
     * authority that roster key derives.
     */
    const forgedKeyring = async (
      handlers: Handlers,
      { delivered, holder }: { delivered: string; holder: Uint8Array },
      { rotatedTo, from }: { rotatedTo: string; from: string },
    ) => {
      const opened = await openDeviceEnvelope(
        holder,
        ByteArray.fromHex(HexBytes(delivered)),
      );
      if (!opened) throw new Error('The delivered envelope did not open.');
      const rosterKey = crypto.getRandomValues(new Uint8Array(32));
      const forged = await sealDeviceEnvelope(
        ByteArray.fromHex(
          HexBytes(
            (await handlers['reader-public-key']({
              networkId: NETWORK_ID,
            })) as string,
          ),
        ),
        { secret: opened.secret, rosterKey },
      );
      return {
        keyring: {
          account: ACCOUNT,
          encKey: rotatedTo,
          envelopes: [HexBytes.fromByteArray(forged), from],
        },
        authority: await authorityOf(ledgerV9, rosterKey),
      };
    };

    it('refuses the replace of a removal towards a roster key a grantee sealed with the rotated secret', async () => {
      const { handlers } = setup();
      const { keys, registrations } = await enrolled(handlers);
      await handlers['flow-open']({ flow: REMOVE_LEAVER });
      const drawn = (await handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations,
          readers: [liveOf(JOINER)],
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      )) as EncodedAccountKeys;
      await handlers.authorise(rotateOf(drawn.encKey), DAPP_ORIGIN);
      const forged = await forgedKeyring(
        handlers,
        { delivered: drawn.envelopes[1], holder: joiner },
        { rotatedTo: drawn.encKey, from: keys.envelopes[0] },
      );

      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(forged.keyring, keys.authority, forged.authority),
        ),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'changes.authority' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('refuses the replace of a rotating enrolment towards a roster key a grantee sealed with the rotated secret', async () => {
      const { handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({
        flow: { ...ADD_JOINER, devices: [OWN_ENTRY] },
      });
      const rotated = (await handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
          registrations: keys.registrations,
          rotateRoster: true,
        },
        DAPP_ORIGIN,
      )) as EncodedAccountKeys;
      await handlers.authorise(rotateOf(rotated.encKey), DAPP_ORIGIN);
      const delivery = (await handlers['seal-to-device']({
        networkId: NETWORK_ID,
        keyring: keyringOf(rotated),
        reader: liveOf(JOINER),
      })) as { envelope: string };
      const forged = await forgedKeyring(
        handlers,
        { delivered: delivery.envelope, holder: joiner },
        { rotatedTo: rotated.encKey, from: keys.envelopes[0] },
      );

      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(forged.keyring, keys.authority, forged.authority),
        ),
      ).rejects.toThrow(
        new FlowScopeError('add-device', { argument: 'changes.authority' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it.each<[string, SignerFlow]>([
      ['sign-in', { kind: 'sign-in' }],
      ['read-holdings', { kind: 'read-holdings' }],
      ['create-account', CREATE_ACCOUNT],
      ['add-device', ADD_DEVICE],
      ['add-device', ADD_JOINER],
    ])(
      'refuses the maintenance kind to a flow that moves no authority, touching no key: %s',
      async (kind, flow) => {
        const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
        const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

        await expect(
          handlers['sign-maintenance-update'](
            {} as Parameters<Handlers['sign-maintenance-update']>[0],
          ),
        ).rejects.toThrow(
          new FlowScopeError(kind, { kind: 'sign-maintenance-update' }),
        );
        expect(deriveSecret).not.toHaveBeenCalled();
        await handlers['flow-close'](FLOW_COMPLETED);
      },
    );

    it('answers a removal before its rotation whether its keyring holds the authority on chain, and nothing else', async () => {
      const { handlers } = setup();
      const { keys } = await enrolled(handlers);
      await handlers['flow-open']({ flow: REMOVE_LEAVER });
      const ask = async (
        authority: unknown,
        keyring: unknown = keyringOf(keys),
      ) =>
        handlers['holds-maintenance-authority']({
          networkId: NETWORK_ID,
          keyring,
          authority,
        } as Parameters<Handlers['holds-maintenance-authority']>[0]);

      await expect(ask(keys.authority)).resolves.toBe(true);
      await expect(ask(OTHER_AUTHORITY)).resolves.toBe(false);
      await expect(ask({ tag: 'rsa', value: '02' })).rejects.toThrow(
        new MalformedPayloadError('authority.tag'),
      );
      await expect(
        ask(keys.authority, { ...keyringOf(keys), account: 'ad'.repeat(32) }),
      ).rejects.toThrow(
        new FlowScopeError('remove-device', { argument: 'keyring.account' }),
      );
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it('answers an enrolment that rotates under a live read grant before its rotation', async () => {
      const { handlers } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open']({
        flow: { ...ADD_JOINER, devices: [OWN_ENTRY] },
      });

      await expect(
        handlers['holds-maintenance-authority']({
          networkId: NETWORK_ID,
          keyring: keyringOf(keys),
          authority: keys.authority,
        }),
      ).resolves.toBe(true);
      await handlers['flow-close'](FLOW_COMPLETED);
    });

    it.each<[string, SignerFlow]>([
      ['sign-in', { kind: 'sign-in' }],
      ['read-holdings', { kind: 'read-holdings' }],
      ['create-account', CREATE_ACCOUNT],
      ['add-device', ADD_DEVICE],
      ['add-device', ADD_JOINER],
      [
        'install-operations',
        {
          kind: 'install-operations',
          account: ACCOUNT,
          operations: ['withdraw_unshielded_with_grant_k256'],
        },
      ],
    ])(
      'refuses the authority check to a flow that rotates no roster, touching no key: %s',
      async (kind, flow) => {
        const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
        const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

        await expect(
          handlers['holds-maintenance-authority'](
            {} as Parameters<Handlers['holds-maintenance-authority']>[0],
          ),
        ).rejects.toThrow(
          new FlowScopeError(kind, { kind: 'holds-maintenance-authority' }),
        );
        expect(deriveSecret).not.toHaveBeenCalled();
        await handlers['flow-close'](FLOW_COMPLETED);
      },
    );

    it('signs for an install only inserts of the operations its descriptor names, each pinned, before any key is touched', async () => {
      const { handlers, keySource } = setup();
      const keys = await drawAccountKeys(handlers);
      await handlers['flow-open'](
        {
          flow: {
            kind: 'install-operations',
            account: ACCOUNT,
            operations: ['withdraw_unshielded_with_grant_k256'],
          },
        },
        DAPP_ORIGIN,
      );
      const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
      const insertOf = (...operations: string[]) => ({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        authority: keys.authority,
        counter: '3',
        changes: {
          kind: 'insert-verifier-keys' as const,
          inserts: operations.map(operation => ({
            operation,
            verifierKey: '01'.repeat(16),
          })),
        },
      });

      await expect(
        handlers['sign-maintenance-update'](insertOf('withdraw_unshielded')),
      ).rejects.toThrow(
        new FlowScopeError('install-operations', {
          argument: 'changes.inserts[0]',
        }),
      );
      await expect(
        handlers['sign-maintenance-update'](
          insertOf(
            'withdraw_unshielded_with_grant_k256',
            'withdraw_unshielded_with_grant_k256',
          ),
        ),
      ).rejects.toThrow(
        new FlowScopeError('install-operations', {
          argument: 'changes.inserts[1]',
        }),
      );
      await expect(
        handlers['sign-maintenance-update'](
          replaceOf(keyringOf(keys), keys.authority, keys.authority),
        ),
      ).rejects.toThrow(
        new FlowScopeError('install-operations', { argument: 'changes' }),
      );
      await expect(
        handlers['sign-maintenance-update']({
          ...insertOf('withdraw_unshielded_with_grant_k256'),
          changes: { kind: 'remove-verifier-key' },
        } as unknown as Parameters<Handlers['sign-maintenance-update']>[0]),
      ).rejects.toThrow(new MalformedPayloadError('changes'));
      await expect(
        handlers['sign-maintenance-update']({
          ...insertOf('withdraw_unshielded_with_grant_k256'),
          counter: '-1',
        }),
      ).rejects.toThrow(new MalformedPayloadError('counter'));
      await expect(
        handlers['sign-maintenance-update']({
          ...insertOf('withdraw_unshielded_with_grant_k256'),
          authority: { tag: 'schnorr', value: '' },
        }),
      ).rejects.toThrow(new MalformedPayloadError('authority.value'));
      await expect(
        handlers['sign-maintenance-update'](
          insertOf('withdraw_unshielded_with_grant_k256'),
        ),
      ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);

      expect(deriveSecret).not.toHaveBeenCalled();
      await handlers['flow-close'](FLOW_COMPLETED);
    });
  });

  it('answers a rotating flow the coins and devices it opens, never grant records', async () => {
    const { handlers, keySource } = setup();
    const { keys, registrations } = await enrolled(handlers);
    const local = createPasskeyEncryptionKey(keySource);
    const grantRecords = await local.sealGrant(NETWORK_ID, ACCOUNT, {
      grantId: 'ab'.repeat(32) as GrantId,
      slot: GrantSlot(0),
      scopeSalt: '22'.repeat(32) as never,
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: spendScope.grantee.publicKey,
      object: {
        color: spendScope.color,
        recipient: spendScope.recipient,
        maxCoinValue: spendScope.maxCoinValue,
      },
    });
    await handlers['flow-open']({ flow: REMOVE_LEAVER });

    const opened = (await handlers['open-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      entries: [
        registrations[0],
        ...grantRecords.map(entry => HexBytes.fromByteArray(entry)),
      ],
    })) as ({ kind: string } | null)[];
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(opened.map(entry => entry?.kind ?? null)).toEqual([
      'device',
      null,
      null,
    ]);
  });

  it('answers a sign-in only the grant records of grants issued under the asking origin', async () => {
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    const local = createPasskeyEncryptionKey(keySource);
    const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
    const bookkeepingOf = (grantId: GrantId) => ({
      grantId,
      slot: flow.slot,
      scopeSalt: flow.scopeSalt,
      granteeScheme: 'jubjub-schnorr' as const,
      granteePublicKey: spendScope.grantee.publicKey,
      object: {
        color: spendScope.color,
        recipient: spendScope.recipient,
        maxCoinValue: spendScope.maxCoinValue,
      },
    });
    const hexOf = (entries: Uint8Array[]) =>
      entries.map(entry => HexBytes.fromByteArray(entry));
    const ours = hexOf(
      await local.sealGrant(NETWORK_ID, ACCOUNT, bookkeepingOf(flow.grantId)),
    );
    const theirs = hexOf(
      await local.sealGrant(
        NETWORK_ID,
        ACCOUNT,
        bookkeepingOf('ab'.repeat(32) as GrantId),
      ),
    );
    const entries = [...ours, ...theirs, ...keys.registrations];

    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, DAPP_ORIGIN);
    const shown = (await handlers['open-inbox'](
      { networkId: NETWORK_ID, keyring: keyringOf(keys), entries },
      DAPP_ORIGIN,
    )) as ({ kind: string; record?: { part: string } } | null)[];
    const elsewhere = (await handlers['open-inbox'](
      { networkId: NETWORK_ID, keyring: keyringOf(keys), entries },
      'https://other.example',
    )) as unknown[];
    const unnamed = (await handlers['open-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      entries,
    })) as unknown[];
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(shown.map(entry => entry?.record?.part ?? null)).toEqual([
      'grant',
      'object',
      null,
      null,
      null,
    ]);
    expect(elsewhere).toEqual([null, null, null, null, null]);
    expect(unnamed).toEqual([null, null, null, null, null]);
  });

  it('seals the bookkeeping of the grant an issue names for its account and appends it, and nothing else', async () => {
    const { flow, args } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
    const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
    const bookkeeping = {
      grantId: flow.grantId,
      slot: flow.slot,
      scopeSalt: flow.scopeSalt,
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: spendScope.grantee.publicKey,
      object: {
        color: spendScope.color,
        recipient: spendScope.recipient,
        maxCoinValue: spendScope.maxCoinValue,
      },
    };
    const refusal = new FlowScopeError('issue-grant', { argument: 'grant' });

    for (const strayed of [
      { ...bookkeeping, slot: 1 },
      { ...bookkeeping, readPublicKey: READ_PUBLIC_KEY },
      { ...bookkeeping, scopeSalt: '23'.repeat(32) },
      {
        ...bookkeeping,
        object: { ...bookkeeping.object, maxCoinValue: '301' },
      },
      {
        ...bookkeeping,
        object: {
          ...bookkeeping.object,
          recipient: { kind: 'user-address', value: 'ab'.repeat(32) },
        },
      },
    ]) {
      await expect(
        handlers['seal-grant']({
          networkId: NETWORK_ID,
          account: ACCOUNT,
          grant: strayed,
        }),
      ).rejects.toThrow(refusal);
    }
    await expect(
      handlers['seal-grant']({
        networkId: NETWORK_ID,
        account: 'ad'.repeat(32),
        grant: bookkeeping,
      }),
    ).rejects.toThrow(refusal);
    await handlers.authorise(
      {
        ...addDeviceAuthorisation,
        circuit: ISSUE_GRANT_CIRCUIT,
        args: [...args],
      },
      DAPP_ORIGIN,
    );
    const entries = (await handlers['seal-grant']({
      networkId: NETWORK_ID,
      account: ACCOUNT,
      grant: bookkeeping,
    })) as string[];
    for (const entry of entries) {
      await expect(
        handlers.authorise(appendOf(entry), DAPP_ORIGIN),
      ).resolves.toMatchObject({
        scheme: 'jubjub-schnorr',
      });
    }
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(entries).toHaveLength(2);
    const local = createPasskeyEncryptionKey(keySource);
    const ownKeys = await local.createKeys(NETWORK_ID, {
      devicePublicKey: ownDeviceKey(),
    });
    const opened = await local.openInbox(
      NETWORK_ID,
      {
        account: ACCOUNT,
        encKey: ownKeys.encKey,
        envelopes: ownKeys.envelopes,
      },
      entries.map(entry => ByteArray.fromHex(HexBytes(entry))),
    );
    expect(opened.map(entry => entry?.kind)).toEqual(['grant', 'grant']);
  });

  it('answers a sign-in the grant records of a secp256k1 grant only when its id derives under the scheme its grant part names', async () => {
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    const local = createPasskeyEncryptionKey(keySource);
    const k256 = await prepareIssueGrantFlow(DAPP_HOSTNAME, k256SpendScope);
    const jubjub = await prepareIssueGrantFlow(DAPP_HOSTNAME);
    const bookkeepingOf = (grantId: GrantId) => ({
      grantId,
      slot: k256.flow.slot,
      scopeSalt: k256.flow.scopeSalt,
      granteeScheme: 'secp256k1-ecdsa' as const,
      granteePublicKey: k256SpendScope.grantee.publicKey,
      object: {
        color: k256SpendScope.color,
        recipient: k256SpendScope.recipient,
        maxCoinValue: k256SpendScope.maxCoinValue,
      },
    });
    const hexOf = (entries: Uint8Array[]) =>
      entries.map(entry => HexBytes.fromByteArray(entry));
    const entries = [
      ...hexOf(
        await local.sealGrant(
          NETWORK_ID,
          ACCOUNT,
          bookkeepingOf(k256.flow.grantId),
        ),
      ),
      ...hexOf(
        await local.sealGrant(
          NETWORK_ID,
          ACCOUNT,
          bookkeepingOf(jubjub.flow.grantId),
        ),
      ),
    ];

    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, DAPP_ORIGIN);
    const shown = (await handlers['open-inbox'](
      { networkId: NETWORK_ID, keyring: keyringOf(keys), entries },
      DAPP_ORIGIN,
    )) as ({
      kind: string;
      record?: { part: string; granteeScheme?: string };
    } | null)[];
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(shown.map(entry => entry?.record?.part ?? null)).toEqual([
      'grant',
      'object',
      null,
      null,
    ]);
    expect(shown[0]?.record?.granteeScheme).toBe('secp256k1-ecdsa');
  });

  it('refuses to seal bookkeeping of a secp256k1 grant that names another grantee key or the jubjub scheme', async () => {
    const { flow, args } = await prepareIssueGrantFlow(
      DAPP_HOSTNAME,
      k256SpendScope,
    );
    const { handlers } = await setupInSession(flow, DAPP_ORIGIN);
    const bookkeeping = {
      grantId: flow.grantId,
      slot: flow.slot,
      scopeSalt: flow.scopeSalt,
      granteeScheme: 'secp256k1-ecdsa',
      granteePublicKey: k256SpendScope.grantee.publicKey,
      object: {
        color: k256SpendScope.color,
        recipient: k256SpendScope.recipient,
        maxCoinValue: k256SpendScope.maxCoinValue,
      },
    };
    await handlers.authorise(
      {
        ...addDeviceAuthorisation,
        circuit: ISSUE_GRANT_CIRCUIT,
        args: [...args],
      },
      DAPP_ORIGIN,
    );

    await expect(
      handlers['seal-grant']({
        networkId: NETWORK_ID,
        account: ACCOUNT,
        grant: {
          ...bookkeeping,
          granteeScheme: 'jubjub-schnorr',
          granteePublicKey: spendScope.grantee.publicKey,
        },
      }),
    ).rejects.toThrow(new FlowScopeError('issue-grant', { argument: 'grant' }));
    await expect(
      handlers['seal-grant']({
        networkId: NETWORK_ID,
        account: ACCOUNT,
        grant: { ...bookkeeping, granteeScheme: 'jubjub-schnorr' },
      }),
    ).rejects.toThrow(new MalformedPayloadError('grant.granteePublicKey'));
    const entries = (await handlers['seal-grant']({
      networkId: NETWORK_ID,
      account: ACCOUNT,
      grant: bookkeeping,
    })) as string[];
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(entries).toHaveLength(2);
  });

  it('refuses a grant seal to a flow that issues nothing', async () => {
    const { handlers } = await setupInSession({
      kind: 'revoke-grant',
      grantId: 'ee'.repeat(32),
      account: ACCOUNT,
    });

    await expect(
      handlers['seal-grant']({
        networkId: NETWORK_ID,
        account: ACCOUNT,
        grant: {},
      }),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { kind: 'seal-grant' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });
});

describe('read grant sessions', () => {
  const coin = {
    nonce: new Uint8Array(32).fill(1),
    color: new Uint8Array(32).fill(2),
    value: 9n,
  };
  const OTHER_GRANT_ID = 'ee'.repeat(32);
  const SECOND_READ_SECRET = new Uint8Array(32).fill(0x52);
  const SECOND_READ_PUBLIC_KEY = HexBytes.fromByteArray(
    x25519.getPublicKey(SECOND_READ_SECRET),
  );
  const secondReadScope: GrantScopeInput = {
    ...readScope,
    grantee: {
      scheme: 'jubjub-schnorr',
      publicKey: HexBytes.fromByteArray(
        jubjub.Point.fromAffine(new JubjubDevice(56n).pk).toBytes(),
      ),
    },
    readPublicKey: SECOND_READ_PUBLIC_KEY,
  };
  const ROTATING_REVOKE_ALL: SignerFlow = {
    kind: 'revoke-all-grants',
    read: true,
    account: ACCOUNT,
    devices: [],
  };
  const rotatingRevoke = (grantId: string): SignerFlow => ({
    kind: 'revoke-grant',
    grantId,
    read: true,
    account: ACCOUNT,
    devices: [],
  });
  const authorisation = (circuit: string, args: unknown[]) => ({
    ...addDeviceAuthorisation,
    circuit,
    args,
  });
  const bytes = (hex: string) => ByteArray.fromHex(HexBytes(hex));
  const rotateCall = (key: string) =>
    authorisation(ROTATE_ENC_KEY_CIRCUIT, [bytes(key)]);
  const appendCall = (entry: string) =>
    authorisation(APPEND_INBOX_CIRCUIT, [bytes(entry)]);
  const sealRequest = (
    keyring: { account: string; encKey: string; envelopes: string[] },
    grantId: string,
    readPublicKey: string,
  ) => ({
    networkId: NETWORK_ID,
    keyring,
    grantId,
    account: ACCOUNT,
    readPublicKey,
  });

  /** Draws the next key from `keys` and signs the rotation to it, in the open session. */
  const rotateFrom = async (handlers: Handlers, keys: EncodedAccountKeys) => {
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
        registrations: keys.registrations,
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await handlers.authorise(rotateCall(drawn.encKey), DAPP_ORIGIN);
    return { ...drawn, registrations: keys.registrations };
  };

  /** One whole read issue in its own session: the rotation, then the issue. */
  const issueReadGrant = async (
    handlers: Handlers,
    keys: EncodedAccountKeys,
    scope: GrantScopeInput,
  ) => {
    const { flow, args } = await prepareIssueGrantFlow(DAPP_HOSTNAME, scope);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const rotated = await rotateFrom(handlers, keys);
    await handlers.authorise(
      authorisation(ISSUE_GRANT_CIRCUIT, [...args]),
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    return { flow, rotated };
  };

  const openSeal = async (
    seal: string,
    readSecret: Uint8Array,
    grantId: string,
  ) =>
    openGrantViewSeal(readSecret, bytes(seal), {
      grantId: grantId as GrantId,
      account: ACCOUNT,
    });

  it('serves a read issue the rotation: the inbox, fresh keys, the re-encryption, the rotation circuits, the issue, its bookkeeping and its seal', async () => {
    const { flow, args } = await prepareIssueGrantFlow(
      DAPP_HOSTNAME,
      readScope,
    );
    const { get, handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const entry = HexBytes.fromByteArray(
      await sealInboxEntry(bytes(keys.encKey), coin),
    );

    await handlers['device-public-key']({});
    await handlers['reader-public-key']({ networkId: NETWORK_ID });
    await expect(
      handlers['open-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        entries: [entry],
      }),
    ).resolves.toEqual([
      {
        kind: 'coin',
        coin: { nonce: '01'.repeat(32), color: '02'.repeat(32), value: '9' },
      },
    ]);
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
        registrations: keys.registrations,
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const [moved] = (await handlers['reencrypt-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      to: drawn.encKey,
      entries: [entry],
    })) as string[];
    await handlers.authorise(rotateCall(drawn.encKey), DAPP_ORIGIN);
    for (const appended of [...drawn.envelopes, moved]) {
      await expect(
        handlers.authorise(appendCall(appended), DAPP_ORIGIN),
      ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    }
    await handlers.authorise(
      authorisation(ISSUE_GRANT_CIRCUIT, [...args]),
      DAPP_ORIGIN,
    );
    const grantRecords = (await handlers['seal-grant']({
      networkId: NETWORK_ID,
      account: ACCOUNT,
      grant: {
        grantId: flow.grantId,
        slot: flow.slot,
        scopeSalt: flow.scopeSalt,
        granteeScheme: 'jubjub-schnorr',
        granteePublicKey: readScope.grantee.publicKey,
        readPublicKey: READ_PUBLIC_KEY,
        object: {
          color: readScope.color,
          recipient: readScope.recipient,
          maxCoinValue: readScope.maxCoinValue,
        },
      },
    })) as string[];
    const view = (await handlers['seal-view'](
      sealRequest(keyringOf(drawn), flow.grantId, READ_PUBLIC_KEY),
    )) as { seal: string; entry: string };
    for (const appended of [...grantRecords, view.entry]) {
      await handlers.authorise(appendCall(appended), DAPP_ORIGIN);
    }
    await handlers['flow-close'](FLOW_COMPLETED);

    const secret = await openSeal(view.seal, READ_SECRET, flow.grantId);
    expect(isLiveSecret(secret, bytes(drawn.encKey))).toBe(true);
    const reopened = await openInboxEntry(secret, bytes(moved));
    expect(reopened?.value).toBe(9n);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('refuses to seal before a rotation was signed, the key of another session or network, an unapproved grant, another account, the issued grant before its issue was signed, or another read key', async () => {
    const { flow, args } = await prepareIssueGrantFlow(
      DAPP_HOSTNAME,
      readScope,
    );
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
    const refusal = (argument: string) =>
      new FlowScopeError('issue-grant', { argument });

    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(keys), flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(refusal('keyring'));
    expect(deriveSecret).not.toHaveBeenCalled();
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(drawn), flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(refusal('keyring'));
    await handlers.authorise(rotateCall(drawn.encKey), DAPP_ORIGIN);
    const live = keyringOf(drawn);
    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(keys), flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(refusal('keyring'));
    await expect(
      handlers['seal-view']({
        ...sealRequest(live, flow.grantId, READ_PUBLIC_KEY),
        networkId: 'testnet',
      }),
    ).rejects.toThrow(refusal('networkId'));
    await expect(
      handlers['seal-view'](sealRequest(live, OTHER_GRANT_ID, READ_PUBLIC_KEY)),
    ).rejects.toThrow(refusal('readPublicKey'));
    await expect(
      handlers['seal-view']({
        ...sealRequest(live, flow.grantId, READ_PUBLIC_KEY),
        account: 'ac'.repeat(32),
      }),
    ).rejects.toThrow(refusal('account'));
    await expect(
      handlers['seal-view'](sealRequest(live, flow.grantId, READ_PUBLIC_KEY)),
    ).rejects.toThrow(refusal('issue'));
    await handlers.authorise(
      authorisation(ISSUE_GRANT_CIRCUIT, [...args]),
      DAPP_ORIGIN,
    );
    await expect(
      handlers['seal-view'](sealRequest(live, flow.grantId, 'ab'.repeat(32))),
    ).rejects.toThrow(refusal('readPublicKey'));
    await expect(
      handlers['seal-view'](sealRequest(live, flow.grantId, READ_PUBLIC_KEY)),
    ).resolves.toMatchObject({
      seal: expect.stringMatching(/^[\da-f]{188}$/) as unknown,
      entry: expect.stringMatching(/^[\da-f]{384}$/) as unknown,
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('seals the issued grant only once the session signed its issue, so a rotated session that never issues takes no secret', async () => {
    const { flow, args } = await prepareIssueGrantFlow(
      DAPP_HOSTNAME,
      readScope,
    );
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const rotated = keyringOf(await rotateFrom(handlers, keys));
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

    await expect(
      handlers['seal-view'](
        sealRequest(rotated, flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(new FlowScopeError('issue-grant', { argument: 'issue' }));
    expect(deriveSecret).not.toHaveBeenCalled();
    await handlers.authorise(
      authorisation(ISSUE_GRANT_CIRCUIT, [...args]),
      DAPP_ORIGIN,
    );
    const view = (await handlers['seal-view'](
      sealRequest(rotated, flow.grantId, READ_PUBLIC_KEY),
    )) as { seal: string };
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(
      isLiveSecret(
        await openSeal(view.seal, READ_SECRET, flow.grantId),
        bytes(rotated.encKey),
      ),
    ).toBe(true);
  });

  it('refuses a rotation to a key the session did not draw, and an append of anything it did not seal', async () => {
    const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME, readScope);
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const deviceSecret = vi.spyOn(keySource, 'deviceSecret');
    const refusal = new FlowScopeError('issue-grant', { argument: 'args[0]' });
    const foreign = HexBytes.fromByteArray(
      await sealInboxEntry(bytes(keys.encKey), coin),
    );

    await expect(
      handlers.authorise(
        authorisation(ROTATE_ENC_KEY_CIRCUIT, [NEW_ENTRY]),
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(refusal);
    await expect(
      handlers.authorise(
        authorisation(ROTATE_ENC_KEY_CIRCUIT, []),
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(refusal);
    await expect(
      handlers.authorise(rotateCall(keys.encKey), DAPP_ORIGIN),
    ).rejects.toThrow(refusal);
    await expect(
      handlers.authorise(appendCall(foreign), DAPP_ORIGIN),
    ).rejects.toThrow(refusal);
    await expect(
      handlers.authorise(appendCall(keys.envelopes[0]), DAPP_ORIGIN),
    ).rejects.toThrow(refusal);
    expect(deviceSecret).not.toHaveBeenCalled();
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    await expect(
      handlers.authorise(
        {
          ...rotateCall(drawn.encKey),
          account: 'ac'.repeat(32),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('issue-grant', { argument: 'account' }),
    );
    await expect(
      handlers.authorise(rotateCall(drawn.encKey), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await expect(
      handlers.authorise(appendCall(drawn.envelopes[0]), DAPP_ORIGIN),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('never rotates to a key an earlier session drew, so no rotation returns to an old secret', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const { flow } = await issueReadGrant(handlers, keys, readScope);

    await handlers['flow-open']({ flow: rotatingRevoke(flow.grantId) });
    for (const key of [keys.encKey]) {
      await expect(
        handlers.authorise(rotateCall(key), DAPP_ORIGIN),
      ).rejects.toThrow(
        new FlowScopeError('revoke-grant', { argument: 'args[0]' }),
      );
    }
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a re-encryption towards a key the session did not draw, or drew for another network, before touching the key source', async () => {
    const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME, readScope);
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const refusal = new FlowScopeError('issue-grant', { argument: 'to' });
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');

    await expect(
      handlers['reencrypt-inbox']({
        networkId: NETWORK_ID,
        keyring: keyringOf(keys),
        to: keys.encKey,
        entries: [],
      }),
    ).rejects.toThrow(refusal);
    await expect(
      handlers['reencrypt-inbox']({
        networkId: 'testnet',
        keyring: keyringOf(keys),
        to: drawn.encKey,
        entries: [],
      }),
    ).rejects.toThrow(refusal);
    expect(deriveSecret).not.toHaveBeenCalled();
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('refuses a spend issue the rotation kinds and circuits, so a spend approval cannot rotate the key', async () => {
    const { flow } = await prepareIssueGrantFlow(DAPP_HOSTNAME);
    const { handlers, keySource } = await setupInSession(flow, DAPP_ORIGIN);
    const deviceSecret = vi.spyOn(keySource, 'deviceSecret');

    for (const kind of [
      'reader-public-key',
      'find-live-envelope',
      'open-inbox',
      'create-keys',
      'reencrypt-inbox',
      'seal-view',
    ] as const) {
      await expect(
        (handlers[kind] as (payload: unknown) => Promise<unknown>)({}),
      ).rejects.toThrow(new FlowScopeError('issue-grant', { kind }));
    }
    await expect(
      handlers.authorise(rotateCall('07'.repeat(32)), DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('issue-grant', { circuit: ROTATE_ENC_KEY_CIRCUIT }),
    );
    expect(deviceSecret).not.toHaveBeenCalled();
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('lets an issue re-seal the read grants approved here before it, so two read grants both hold the new secret', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    const { flow, args } = await prepareIssueGrantFlow(
      DAPP_HOSTNAME,
      secondReadScope,
    );
    await handlers['flow-open']({ flow }, DAPP_ORIGIN);
    const rotated = await rotateFrom(handlers, first.rotated);

    const resealed = (await handlers['seal-view'](
      sealRequest(keyringOf(rotated), first.flow.grantId, READ_PUBLIC_KEY),
    )) as { seal: string };
    await handlers.authorise(
      authorisation(ISSUE_GRANT_CIRCUIT, [...args]),
      DAPP_ORIGIN,
    );
    const sealed = (await handlers['seal-view'](
      sealRequest(keyringOf(rotated), flow.grantId, SECOND_READ_PUBLIC_KEY),
    )) as { seal: string };
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(
      isLiveSecret(
        await openSeal(resealed.seal, READ_SECRET, first.flow.grantId),
        bytes(rotated.encKey),
      ),
    ).toBe(true);
    expect(
      isLiveSecret(
        await openSeal(sealed.seal, SECOND_READ_SECRET, flow.grantId),
        bytes(rotated.encKey),
      ),
    ).toBe(true);
  });

  it('serves a rotating revocation the rotation and re-seals only to read keys an issue approved here, never to the revoked grant', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    const second = await issueReadGrant(
      handlers,
      first.rotated,
      secondReadScope,
    );
    await handlers['flow-open']({ flow: rotatingRevoke(second.flow.grantId) });
    const rotated = await rotateFrom(handlers, second.rotated);

    await expect(
      handlers['seal-view'](
        sealRequest(
          keyringOf(rotated),
          second.flow.grantId,
          SECOND_READ_PUBLIC_KEY,
        ),
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'grantId' }),
    );
    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(rotated), first.flow.grantId, READ_PUBLIC_KEY),
      ),
    ).resolves.toMatchObject({ seal: expect.any(String) as unknown });
    await handlers.authorise(
      authorisation(REVOKE_GRANT_CIRCUIT, [bytes(second.flow.grantId)]),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('rotates past a revoked secp256k1 read grant, re-sealing to the jubjub read grant beside it and never to the revoked one', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    const second = await issueReadGrant(handlers, first.rotated, {
      ...secondReadScope,
      grantee: k256SpendScope.grantee,
    });
    await handlers['flow-open']({ flow: rotatingRevoke(second.flow.grantId) });
    const rotated = await rotateFrom(handlers, second.rotated);

    await expect(
      handlers['seal-view'](
        sealRequest(
          keyringOf(rotated),
          second.flow.grantId,
          SECOND_READ_PUBLIC_KEY,
        ),
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'grantId' }),
    );
    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(rotated), first.flow.grantId, READ_PUBLIC_KEY),
      ),
    ).resolves.toMatchObject({ seal: expect.any(String) as unknown });
    await expect(
      handlers.authorise(
        authorisation(REVOKE_GRANT_CIRCUIT, [bytes(second.flow.grantId)]),
      ),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('holds a rotating revocation to the account its descriptor names', async () => {
    const { handlers } = await setupInSession(rotatingRevoke(OTHER_GRANT_ID));

    await expect(
      handlers.authorise(
        {
          ...authorisation(REVOKE_GRANT_CIRCUIT, [bytes(OTHER_GRANT_ID)]),
          account: 'ad'.repeat(32),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'account' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('forgets the key of a grant whose revocation it signed, so no later session seals to it', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    await handlers['flow-open']({ flow: rotatingRevoke(first.flow.grantId) });
    const revokedAt = await rotateFrom(handlers, first.rotated);
    await handlers.authorise(
      authorisation(REVOKE_GRANT_CIRCUIT, [bytes(first.flow.grantId)]),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: rotatingRevoke(OTHER_GRANT_ID) });
    const rotated = await rotateFrom(handlers, revokedAt);

    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(rotated), first.flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'readPublicKey' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('tells the origin that signed a revocation that never landed why a later rotation does not seal to its grant, and still refuses the seal', async () => {
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    await handlers['flow-open'](
      { flow: rotatingRevoke(first.flow.grantId) },
      DAPP_ORIGIN,
    );
    const revokedAt = await rotateFrom(handlers, first.rotated);
    await handlers.authorise(
      authorisation(REVOKE_GRANT_CIRCUIT, [bytes(first.flow.grantId)]),
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open'](
      { flow: rotatingRevoke(OTHER_GRANT_ID) },
      DAPP_ORIGIN,
    );
    const rotated = await rotateFrom(handlers, revokedAt);
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
    const pending = sealRequest(
      keyringOf(rotated),
      first.flow.grantId,
      READ_PUBLIC_KEY,
    );

    await expect(handlers['seal-view'](pending, DAPP_ORIGIN)).rejects.toThrow(
      GrantRevocationPendingError,
    );
    await expect(
      handlers['seal-view'](pending, 'https://other.example'),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'readPublicKey' }),
    );
    await expect(
      handlers['seal-view'](
        sealRequest(
          keyringOf(rotated),
          first.flow.grantId,
          SECOND_READ_PUBLIC_KEY,
        ),
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'readPublicKey' }),
    );
    expect(deriveSecret).not.toHaveBeenCalled();
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('forgets every key of the account once a revoke-all is signed', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    const first = await issueReadGrant(handlers, keys, readScope);
    await handlers['flow-open']({ flow: ROTATING_REVOKE_ALL });
    const cleared = await rotateFrom(handlers, first.rotated);
    await handlers.authorise(
      authorisation(REVOKE_ALL_GRANTS_CIRCUIT, []),
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: rotatingRevoke(OTHER_GRANT_ID) });
    const rotated = await rotateFrom(handlers, cleared);

    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(rotated), first.flow.grantId, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { argument: 'readPublicKey' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('serves a rotating revoke-all the rotation but never a seal, and a plain revocation neither', async () => {
    const { handlers } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: ROTATING_REVOKE_ALL });
    const rotated = await rotateFrom(handlers, keys);

    await expect(
      handlers['seal-view'](
        sealRequest(keyringOf(rotated), OTHER_GRANT_ID, READ_PUBLIC_KEY),
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-all-grants', { kind: 'seal-view' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({
      flow: { kind: 'revoke-grant', grantId: OTHER_GRANT_ID, account: ACCOUNT },
    });
    await expect(
      handlers['create-keys'](
        {
          networkId: NETWORK_ID,
          devicePublicKey: ownDeviceKey(),
          keyring: keyringOf(keys),
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('revoke-grant', { kind: 'create-keys' }),
    );
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('re-encrypts exactly the shared maximum of entries in one request, and refuses more before touching the key source', async () => {
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: ROTATING_REVOKE_ALL });
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const request = (length: number) => ({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      to: drawn.encKey,
      entries: Array.from({ length }, () => '00'.repeat(192)),
    });

    await expect(
      handlers['reencrypt-inbox'](request(MAX_INBOX_ENTRIES_PER_REQUEST)),
    ).resolves.toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST);
    const deriveSecret = vi.spyOn(keySource, 'deriveSecret');
    await expect(
      handlers['reencrypt-inbox'](request(MAX_INBOX_ENTRIES_PER_REQUEST + 1)),
    ).rejects.toThrow(
      new InboxRequestTooLargeError(MAX_INBOX_ENTRIES_PER_REQUEST),
    );
    expect(deriveSecret).not.toHaveBeenCalled();
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('answers a re-encryption the new key opens and the old one does not', async () => {
    const { handlers, keySource } = setup();
    const keys = await drawAccountKeys(handlers);
    await handlers['flow-open']({ flow: ROTATING_REVOKE_ALL });
    const drawn = (await handlers['create-keys'](
      {
        networkId: NETWORK_ID,
        devicePublicKey: ownDeviceKey(),
        keyring: keyringOf(keys),
      },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const [moved] = (await handlers['reencrypt-inbox']({
      networkId: NETWORK_ID,
      keyring: keyringOf(keys),
      to: drawn.encKey,
      entries: [
        HexBytes.fromByteArray(await sealInboxEntry(bytes(keys.encKey), coin)),
      ],
    })) as string[];
    await handlers['flow-close'](FLOW_COMPLETED);
    const local = createPasskeyEncryptionKey(keySource);
    const reader = await local.readerPublicKey(NETWORK_ID);
    const envelopesOf = (encoded: EncodedAccountKeys) =>
      deviceEnvelopes(
        encoded.envelopes.map(entry => bytes(entry)),
        reader,
      );

    await expect(
      local.openInbox(
        NETWORK_ID,
        {
          account: ACCOUNT,
          encKey: bytes(drawn.encKey),
          envelopes: envelopesOf(drawn),
        },
        [bytes(moved)],
      ),
    ).resolves.toEqual([{ kind: 'coin', coin }]);
    await expect(
      local.openInbox(
        NETWORK_ID,
        {
          account: ACCOUNT,
          encKey: bytes(keys.encKey),
          envelopes: envelopesOf(keys),
        },
        [bytes(moved)],
      ),
    ).resolves.toEqual([null]);
  });
});

describe('record guards', () => {
  const OTHER_ORIGIN = 'https://other.example';
  const OTHER_HOSTNAME = 'other.example';
  const deployment = pendingDeployment(['d1'.repeat(192)]);
  const pendingRecord: PassportAccountRecord = { ...record, deployment };
  const grantOf = (origin: string, slot: number) => ({
    slot,
    scopeSalt: '22'.repeat(32),
    granteePublicKey: spendScope.grantee.publicKey,
    origin,
  });
  /** The id a grant of the spend grantee derives under a hostname and slot. */
  const grantIdOf = async (host: string, slot: number): Promise<string> =>
    deriveGrantId({
      contractAddress: ByteArray.fromHex(HexBytes(ACCOUNT)),
      granteePublicKey: granteePoint(spendScope.grantee),
      originHash: await originHash(host),
      slot: GrantSlot(slot),
    });

  /**
   * Stores a pending record through a creation started from the dApp
   * origin, handing the account to the authority its keys derive, and
   * answers the record stored.
   */
  const seedPending = async (
    handlers: Handlers,
  ): Promise<PassportAccountRecord & { deployment: typeof deployment }> => {
    const keys = await openCreation(handlers);
    const seeded = {
      ...record,
      deployment: { ...deployment, handoverAuthority: keys.authority },
    };
    await handlers['record-write']({ record: seeded }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    return seeded;
  };

  /** Reads the stored record back the way its creation sees it. */
  const readAsCreation = async (handlers: Handlers): Promise<unknown> => {
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    const read = await handlers['record-read']({}, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    return read;
  };

  it('shows a sign-in over a pending record only the key entries of its creation', async () => {
    const { handlers } = setup();
    await seedPending(handlers);

    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, OTHER_ORIGIN);
    const read = await handlers['record-read']({}, OTHER_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);

    expect(read).toEqual({
      ...record,
      deployment: { keyEntries: deployment.keyEntries },
    });
    expect(JSON.stringify(read)).not.toContain(deployment.authorityKey.value);
    expect(JSON.stringify(read)).not.toContain(deployment.saltHex);
  });

  it('keeps the stored deployment through every write of a flow that does not create', async () => {
    const { handlers } = setup();
    const seeded = await seedPending(handlers);
    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, OTHER_ORIGIN);

    for (const changed of [
      { ...deployment, lockAccount: true },
      { ...deployment, operations: [...deployment.operations, 'extra'] },
      { keyEntries: [] },
    ]) {
      await expect(
        handlers['record-write'](
          { record: { ...record, deployment: changed } },
          OTHER_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('sign-in', { argument: 'record.deployment' }),
      );
    }
    await handlers['record-write'](
      { record: { ...record, localUseCounter: '9' } },
      OTHER_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);

    await expect(handlers['record-exists']({})).resolves.toBe('pending');
    await expect(readAsCreation(handlers)).resolves.toEqual({
      ...seeded,
      localUseCounter: '9',
    });
  });

  it('refuses a creation over a pending record from another origin before any ceremony', async () => {
    const { get, handlers } = setup();
    await seedPending(handlers);
    get.mockClear();

    await expect(
      handlers['flow-open']({ flow: CREATE_ACCOUNT }, OTHER_ORIGIN),
    ).rejects.toThrow(
      new AccountCreationPendingError(
        'An unfinished Passport account creation on this signer was started from another site; resume it from the site that started the creation.',
      ),
    );
    await expect(
      handlers['flow-open']({ flow: CREATE_ACCOUNT }),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'origin' }),
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses another origin the read, write and appends of a creation it did not start', async () => {
    const { handlers } = setup();
    const keys = await openCreation(handlers);
    const kept = [keys.envelopes[0], keys.registrations[0]];
    await handlers['record-write'](
      {
        record: {
          ...record,
          deployment: pendingDeployment(kept, keys.authority),
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    const refused = new FlowScopeError('create-account', {
      argument: 'origin',
    });

    await expect(handlers['record-read']({}, OTHER_ORIGIN)).rejects.toThrow(
      refused,
    );
    await expect(
      handlers['record-write']({ record }, OTHER_ORIGIN),
    ).rejects.toThrow(refused);
    await expect(
      handlers.authorise(
        {
          ...addDeviceAuthorisation,
          circuit: APPEND_INBOX_CIRCUIT,
          args: [ByteArray.fromHex(HexBytes(kept[0]))],
        },
        OTHER_ORIGIN,
      ),
    ).rejects.toThrow(refused);
    await handlers['flow-close'](FLOW_COMPLETED);
    await expect(handlers['record-exists']({})).resolves.toBe('pending');
  });

  it('writes a pending record over empty storage only from the origin that drew its keys, with the approved lock choice', async () => {
    const { handlers } = setup();
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);

    await expect(
      handlers['record-write']({ record: pendingRecord }, DAPP_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'origin' }),
    );
    const keys = (await handlers['create-keys'](
      { networkId: NETWORK_ID, devicePublicKey: ownDeviceKey() },
      DAPP_ORIGIN,
    )) as EncodedAccountKeys;
    const drawn = {
      ...record,
      deployment: { ...deployment, handoverAuthority: keys.authority },
    };
    await expect(
      handlers['record-write'](
        {
          record: {
            ...record,
            deployment: {
              ...deployment,
              lockAccount: true,
              handoverAuthority: keys.authority,
            },
          },
        },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', {
        argument: 'record.deployment.lockAccount',
      }),
    );
    await expect(
      handlers['record-write'](
        { record: { ...record, deployment: { keyEntries: [] } } },
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('create-account', { argument: 'record.deployment' }),
    );
    await handlers['record-write']({ record: drawn }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);

    await expect(readAsCreation(handlers)).resolves.toEqual(drawn);
  });

  it('refuses a first creation write handing the account to an authority no key of the session derives', async () => {
    const { handlers } = setup();
    const earlier = await drawAccountKeys(handlers);
    const keys = await openCreation(handlers);
    const refused = new FlowScopeError('create-account', {
      argument: 'record.deployment.handoverAuthority',
    });

    for (const handoverAuthority of [
      UNDRAWN_AUTHORITY,
      earlier.authority,
      { tag: 'ecdsa', value: keys.authority.value },
    ]) {
      await expect(
        handlers['record-write'](
          {
            record: {
              ...record,
              deployment: { ...deployment, handoverAuthority },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(refused);
    }
    await expect(handlers['record-exists']({})).resolves.toBe('absent');
    await handlers['record-write'](
      {
        record: {
          ...record,
          deployment: { ...deployment, handoverAuthority: keys.authority },
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);

    await expect(handlers['record-exists']({})).resolves.toBe('pending');
  });

  it('holds a resumed creation to the stored deployment and its lock choice', async () => {
    const { handlers } = setup();
    const seeded = await seedPending(handlers);

    await handlers['flow-open'](
      { flow: { kind: 'create-account', lockAccount: true } },
      DAPP_ORIGIN,
    );
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).rejects.toThrow(
      new CreationLockMismatchError(
        'The unfinished Passport account creation was started with lockAccount false; resume it with the same lock choice.',
      ),
    );
    await handlers['flow-close'](FLOW_COMPLETED);

    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    for (const changed of [
      { saltHex: '33'.repeat(32) },
      { verifierKeysDigest: '0f'.repeat(32) },
      { handoverAuthority: { tag: 'schnorr', value: '44'.repeat(32) } },
      {
        handoverAuthority: {
          tag: 'ecdsa',
          value: seeded.deployment.handoverAuthority.value,
        },
      },
    ]) {
      await expect(
        handlers['record-write'](
          {
            record: {
              ...record,
              deployment: { ...seeded.deployment, ...changed },
            },
          },
          DAPP_ORIGIN,
        ),
      ).rejects.toThrow(
        new FlowScopeError('create-account', {
          argument: 'record.deployment',
        }),
      );
    }
    await handlers['record-write'](
      { record: { ...seeded, localUseCounter: '1' } },
      DAPP_ORIGIN,
    );
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);

    await expect(handlers['record-exists']({})).resolves.toBe('complete');
  });

  it('shows each origin only the grant bookkeeping kept under it, and lets it change only that', async () => {
    const { handlers } = setup();
    const OWN_GRANT_ID = await grantIdOf(DAPP_HOSTNAME, 0);
    const OTHER_GRANT_ID = await grantIdOf(OTHER_HOSTNAME, 1);
    const withGrants: PassportAccountRecord = {
      ...record,
      grants: {
        [OWN_GRANT_ID]: grantOf(DAPP_HOSTNAME, 0),
        [OTHER_GRANT_ID]: grantOf(OTHER_HOSTNAME, 1),
      },
    };
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, DAPP_ORIGIN);
    await handlers['record-write'](
      {
        record: {
          ...record,
          grants: { [OWN_GRANT_ID]: grantOf(DAPP_HOSTNAME, 0) },
        },
      },
      DAPP_ORIGIN,
    );
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, OTHER_ORIGIN);
    await handlers['record-write'](
      {
        record: {
          ...record,
          grants: { [OTHER_GRANT_ID]: grantOf(OTHER_HOSTNAME, 1) },
        },
      },
      OTHER_ORIGIN,
    );

    await expect(handlers['record-read']({}, OTHER_ORIGIN)).resolves.toEqual({
      ...record,
      grants: { [OTHER_GRANT_ID]: grantOf(OTHER_HOSTNAME, 1) },
    });
    await expect(
      handlers['record-write']({ record: withGrants }, OTHER_ORIGIN),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.grants' }),
    );
    await expect(
      handlers['record-write'](
        {
          record: {
            ...record,
            grants: { [OWN_GRANT_ID]: grantOf(OTHER_HOSTNAME, 0) },
          },
        },
        OTHER_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.grants' }),
    );
    await expect(
      handlers['record-write'](
        {
          record: {
            ...record,
            grants: { [OTHER_GRANT_ID]: grantOf(OTHER_HOSTNAME, 2) },
          },
        },
        OTHER_ORIGIN,
      ),
    ).rejects.toThrow(
      new FlowScopeError('sign-in', { argument: 'record.grants' }),
    );
    await handlers['record-write']({ record }, OTHER_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);

    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, DAPP_ORIGIN);
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual({
      ...record,
      grants: { [OWN_GRANT_ID]: grantOf(DAPP_HOSTNAME, 0) },
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('keeps a secp256k1 grant through a revocation write only when its id derives under the scheme it kept', async () => {
    const { handlers } = setup();
    const k256 = await prepareIssueGrantFlow(DAPP_HOSTNAME, k256SpendScope);
    const jubjubGrantId = await grantIdOf(DAPP_HOSTNAME, 0);
    const k256Grant = {
      ...grantOf(DAPP_HOSTNAME, 0),
      granteeScheme: 'secp256k1-ecdsa' as const,
      granteePublicKey: k256SpendScope.grantee.publicKey,
    };
    const withGrants = (grants: PassportAccountRecord['grants']) => ({
      record: { ...record, grants },
    });
    await handlers['flow-open']({ flow: CREATE_ACCOUNT }, DAPP_ORIGIN);
    await handlers['record-write']({ record }, DAPP_ORIGIN);
    await handlers['flow-close'](FLOW_COMPLETED);
    await handlers['flow-open'](
      {
        flow: {
          kind: 'revoke-grant',
          grantId: jubjubGrantId,
          account: ACCOUNT,
        },
      },
      DAPP_ORIGIN,
    );
    const refusal = new FlowScopeError('revoke-grant', {
      argument: 'record.grants',
    });

    await expect(
      handlers['record-write'](
        withGrants({ [jubjubGrantId]: k256Grant }),
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(refusal);
    await expect(
      handlers['record-write'](
        withGrants({
          [k256.flow.grantId]: {
            ...k256Grant,
            granteeScheme: 'jubjub-schnorr',
            granteePublicKey: spendScope.grantee.publicKey,
          },
        }),
        DAPP_ORIGIN,
      ),
    ).rejects.toThrow(refusal);
    await handlers['record-write'](
      withGrants({
        [k256.flow.grantId]: k256Grant,
        [jubjubGrantId]: grantOf(DAPP_HOSTNAME, 0),
      }),
      DAPP_ORIGIN,
    );
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual({
      ...record,
      grants: {
        [k256.flow.grantId]: k256Grant,
        [jubjubGrantId]: grantOf(DAPP_HOSTNAME, 0),
      },
    });
    await handlers['record-write'](
      withGrants({ [k256.flow.grantId]: k256Grant }),
      DAPP_ORIGIN,
    );
    await expect(
      handlers.authorise(
        {
          ...addDeviceAuthorisation,
          circuit: REVOKE_GRANT_CIRCUIT,
          args: [ByteArray.fromHex(HexBytes(jubjubGrantId))],
        },
        DAPP_ORIGIN,
      ),
    ).resolves.toMatchObject({ scheme: 'jubjub-schnorr' });
    await handlers['flow-close'](FLOW_COMPLETED);

    await handlers['flow-open']({ flow: { kind: 'sign-in' } }, DAPP_ORIGIN);
    await expect(handlers['record-read']({}, DAPP_ORIGIN)).resolves.toEqual({
      ...record,
      grants: { [k256.flow.grantId]: k256Grant },
    });
    await handlers['flow-close'](FLOW_COMPLETED);
  });

  it('holds a resumed creation that keeps or drops the deployment to the lock choice it was started with', async () => {
    const { handlers } = setup();
    const seeded = await seedPending(handlers);
    const otherLock: SignerFlow = { kind: 'create-account', lockAccount: true };
    const refused = new FlowScopeError('create-account', {
      argument: 'lockAccount',
    });

    await handlers['flow-open']({ flow: otherLock }, DAPP_ORIGIN);
    await expect(
      handlers['record-write']({ record: seeded }, DAPP_ORIGIN),
    ).rejects.toThrow(refused);
    await expect(
      handlers['record-write']({ record }, DAPP_ORIGIN),
    ).rejects.toThrow(refused);
    await handlers['flow-close'](FLOW_COMPLETED);

    await expect(handlers['record-exists']({})).resolves.toBe('pending');
  });
});
