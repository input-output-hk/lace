import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AccAddress,
  DeviceReaderInvalidError,
  DeviceRosterInvalidError,
  EncryptionKeyMismatchError,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';
import { deriveSymmetricSecret, sha256 } from '@lace-lib/crypto';
import { HexBytes } from '@lace-lib/util';
import * as ledger from '@midnightntwrk/ledger-v9';
import { x25519 } from '@noble/curves/ed25519.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { encryptionKeyOver, liveEnvelopeOver } from '../../src/acc/enc-keys';
import {
  deviceEnvelopes,
  isAddressedTo,
  MAX_KEYRING_SECRETS,
  openDeviceEnvelope,
  openDeviceRegistration,
  sealDeviceEnvelope,
  sealDeviceRegistration,
} from '../../src/acc/envelopes';
import { openInboxEntry, sealInboxEntry } from '../../src/acc/inbox';
import { authorityOf } from '../../src/acc/maintenance-authority';
import { verifierKeyInsert } from '../../src/acc/verifier-key-insert';

import { isLiveSecret, openGrantViewSeal } from './view-seal-reference';

import type { DeriveSecret } from '../../src/acc/enc-keys';
import type {
  AccountKeyring,
  DeviceReader,
  GrantBookkeeping,
  LiveDeviceReader,
  MaintenanceVerifierKey,
  MaintenanceVerifyingKey,
  ShieldedCoin,
} from '@lace-contract/passport';

const pins = vi.hoisted(() => ({ expectedVk: {} as Record<string, string> }));

vi.mock('../../src/acc/acc-module', () => pins);

const NETWORK = 'undeployed';
const READER_SECRET_DOMAIN = 'lace-passport:reader:v1';
const ACCOUNT = AccAddress('ac'.repeat(32));

/** A device reader as a rotation names it, live at counter 0 of epoch 0. */
const live = (reader: DeviceReader): LiveDeviceReader => ({
  ...reader,
  epoch: 0n,
  counter: 0n,
});

/** A device: its seed, the key over it, and its reader and device keys. */
const device = async () => {
  const seed = crypto.getRandomValues(new Uint8Array(64));
  const deriveSecret = vi.fn<DeriveSecret>(async params =>
    deriveSymmetricSecret(seed, params),
  );
  const key = encryptionKeyOver(deriveSecret);
  const readerPublicKey = await key.readerPublicKey(NETWORK);
  const reader: DeviceReader = {
    readerPublicKey: HexBytes.fromByteArray(readerPublicKey),
    devicePublicKey: HexBytes.fromByteArray(
      crypto.getRandomValues(new Uint8Array(32)),
    ),
  };
  const readerSecret = deriveSymmetricSecret(seed, {
    domain: READER_SECRET_DOMAIN,
    context: NETWORK,
    length: 32,
  });
  return { key, deriveSecret, readerPublicKey, reader, readerSecret };
};

const coin = (value = 9n): ShieldedCoin => ({
  nonce: crypto.getRandomValues(new Uint8Array(32)),
  color: crypto.getRandomValues(new Uint8Array(32)),
  value,
});

const keyringOf = (
  encKey: Uint8Array,
  entries: Uint8Array[],
  readerPublicKey: Uint8Array,
): AccountKeyring => ({
  account: ACCOUNT,
  encKey,
  envelopes: deviceEnvelopes(entries, readerPublicKey),
});

describe('encryptionKeyOver', () => {
  it('derives the reader key under the reader domain with the network as context, distinct per network', async () => {
    const { key, deriveSecret, readerPublicKey } = await device();

    expect(deriveSecret).toHaveBeenCalledWith({
      domain: READER_SECRET_DOMAIN,
      context: NETWORK,
      length: 32,
    });
    expect(readerPublicKey).toHaveLength(32);
    await expect(key.readerPublicKey(NETWORK)).resolves.toEqual(
      readerPublicKey,
    );
    await expect(key.readerPublicKey('devnet')).resolves.not.toEqual(
      readerPublicKey,
    );
  });

  it('draws a random account secret at creation, sealed to this device only, with a fresh roster registration', async () => {
    const { key, readerPublicKey, reader, readerSecret } = await device();

    const first = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const second = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });

    expect(first.encKey).not.toEqual(second.encKey);
    expect(first.envelopes).toHaveLength(1);
    expect(first.registrations).toHaveLength(1);
    expect(isAddressedTo(first.envelopes[0], readerPublicKey)).toBe(true);
    const opened = await openDeviceEnvelope(readerSecret, first.envelopes[0]);
    expect(opened && x25519.getPublicKey(opened.secret)).toEqual(first.encKey);
  });

  it('opens coins with the live secret and the older ones its envelopes deliver, and reports registrations and grant records', async () => {
    const { key, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const first = keyringOf(created.encKey, created.envelopes, readerPublicKey);
    const stranded = await sealInboxEntry(created.encKey, coin(1n));
    const rotated = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
      keyring: first,
      registrations: created.registrations,
    });
    const live = await sealInboxEntry(rotated.encKey, coin(2n));
    const inbox = [
      ...created.envelopes,
      ...created.registrations,
      stranded,
      ...rotated.envelopes,
      live,
      crypto.getRandomValues(new Uint8Array(192)),
    ];

    const opened = await key.openInbox(
      NETWORK,
      keyringOf(rotated.encKey, inbox, readerPublicKey),
      inbox,
    );

    expect(opened.map(entry => entry?.kind ?? null)).toEqual([
      null,
      'device',
      'coin',
      null,
      'coin',
      null,
    ]);
    expect(opened[1]).toEqual({ kind: 'device', device: reader });
    expect(rotated.registrations).toEqual([]);
  });

  it('refuses a keyring none of whose envelopes opens its enc_key', async () => {
    const { key, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });

    await expect(
      key.openInbox(
        NETWORK,
        keyringOf(
          x25519.getPublicKey(x25519.utils.randomSecretKey()),
          created.envelopes,
          readerPublicKey,
        ),
        [],
      ),
    ).rejects.toBeInstanceOf(EncryptionKeyMismatchError);
  });

  it('finds the live secret behind a flood of forged envelopes newer than it, and keeps at most the bounded earlier secrets', async () => {
    const { key, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const forged = await Promise.all(
      Array.from({ length: MAX_KEYRING_SECRETS * 2 + 8 }, async (_, index) => {
        if (index % 2 === 0) {
          return sealDeviceEnvelope(readerPublicKey, {
            secret: x25519.utils.randomSecretKey(),
            rosterKey: crypto.getRandomValues(new Uint8Array(32)),
          });
        }
        const garbage = await sealDeviceEnvelope(readerPublicKey, {
          secret: x25519.utils.randomSecretKey(),
          rosterKey: crypto.getRandomValues(new Uint8Array(32)),
        });
        garbage[150] ^= 0xff;
        return garbage;
      }),
    );
    const stranded = await sealInboxEntry(created.encKey, coin(3n));
    const inbox = [...created.envelopes, ...created.registrations, ...forged];
    const keyring = keyringOf(created.encKey, inbox, readerPublicKey);

    expect(keyring.envelopes).toHaveLength(MAX_KEYRING_SECRETS + 5);
    expect(isAddressedTo(keyring.envelopes[0], readerPublicKey)).toBe(true);
    const [opened] = await key.openInbox(NETWORK, keyring, [stranded]);
    expect(opened?.kind).toBe('coin');
    await expect(
      key.createKeys(NETWORK, {
        devicePublicKey: reader.devicePublicKey,
        keyring,
        registrations: created.registrations,
      }),
    ).resolves.toMatchObject({ envelopes: [expect.any(Uint8Array)] });
  });

  it('opens coins sealed to at most the bounded number of earlier secrets', async () => {
    const { key, readerPublicKey, reader } = await device();
    const earlier = await Promise.all(
      Array.from({ length: MAX_KEYRING_SECRETS + 1 }, async () =>
        key.createKeys(NETWORK, { devicePublicKey: reader.devicePublicKey }),
      ),
    );
    const current = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const oldest = await sealInboxEntry(earlier[0].encKey, coin(1n));
    const newest = await sealInboxEntry(
      earlier[MAX_KEYRING_SECRETS].encKey,
      coin(2n),
    );
    const inbox = [
      ...earlier.flatMap(keys => keys.envelopes),
      ...current.envelopes,
    ];

    const opened = await key.openInbox(
      NETWORK,
      keyringOf(current.encKey, inbox, readerPublicKey),
      [oldest, newest],
    );

    expect(opened.map(entry => entry?.kind ?? null)).toEqual([null, 'coin']);
  });

  it('seals a rotation to this device and the named registered readers only, with a fresh roster when asked', async () => {
    const owner = await device();
    const joiner = await device();
    const other = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });
    const keyring = keyringOf(
      created.encKey,
      created.envelopes,
      owner.readerPublicKey,
    );
    const joined = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(joiner.reader),
    );
    const third = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(other.reader),
    );
    const registrations = [
      ...created.registrations,
      joined.registration,
      third.registration,
    ];

    const rotated = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
      keyring,
      registrations,
      readers: [live(joiner.reader)],
      rotateRoster: true,
    });

    expect(rotated.envelopes).toHaveLength(2);
    expect(rotated.registrations).toHaveLength(2);
    expect(
      rotated.envelopes.map(envelope => [
        isAddressedTo(envelope, owner.readerPublicKey),
        isAddressedTo(envelope, joiner.readerPublicKey),
        isAddressedTo(envelope, other.readerPublicKey),
      ]),
    ).toEqual([
      [true, false, false],
      [false, true, false],
    ]);
    const joinerSecrets = await openDeviceEnvelope(
      joiner.readerSecret,
      rotated.envelopes[1],
    );
    expect(joinerSecrets && x25519.getPublicKey(joinerSecrets.secret)).toEqual(
      rotated.encKey,
    );
  });

  it('refuses a reader that is not registered as named, or named twice', async () => {
    const owner = await device();
    const joiner = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });
    const keyring = keyringOf(
      created.encKey,
      created.envelopes,
      owner.readerPublicKey,
    );
    const joined = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(joiner.reader),
    );
    const registrations = [...created.registrations, joined.registration];
    const rotate = async (readers: LiveDeviceReader[]) =>
      owner.key.createKeys(NETWORK, {
        devicePublicKey: owner.reader.devicePublicKey,
        keyring,
        registrations,
        readers,
      });

    await expect(
      rotate([live({ ...joiner.reader, devicePublicKey: 'ee'.repeat(32) })]),
    ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
    await expect(
      rotate([live(joiner.reader), live(joiner.reader)]),
    ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
    await expect(rotate([live(owner.reader)])).rejects.toBeInstanceOf(
      DeviceRosterInvalidError,
    );
    await expect(
      owner.key.createKeys(NETWORK, {
        devicePublicKey: owner.reader.devicePublicKey,
        readers: [live(joiner.reader)],
      }),
    ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
  });

  it('seals to no reader of the removed device, nor one the roster pairs with its key', async () => {
    const owner = await device();
    const joiner = await device();
    const leaver = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });
    const keyring = keyringOf(
      created.encKey,
      created.envelopes,
      owner.readerPublicKey,
    );
    const joined = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(joiner.reader),
    );
    const left = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(leaver.reader),
    );
    const removed = {
      devicePublicKey: leaver.reader.devicePublicKey,
      epoch: 0n,
      counter: 0n,
    };
    const rotate = async (
      registrations: Uint8Array[],
      readers: LiveDeviceReader[],
    ) =>
      owner.key.createKeys(NETWORK, {
        devicePublicKey: owner.reader.devicePublicKey,
        keyring,
        registrations,
        readers,
        rotateRoster: true,
        removed,
      });
    const registrations = [
      ...created.registrations,
      joined.registration,
      left.registration,
    ];

    await expect(
      rotate(registrations, [live(leaver.reader)]),
    ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
    await expect(
      rotate(registrations, [live(joiner.reader)]),
    ).resolves.toMatchObject({ envelopes: expect.any(Array) as unknown });

    const { registration: paired } = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live({
        readerPublicKey: joiner.reader.readerPublicKey,
        devicePublicKey: leaver.reader.devicePublicKey,
      }),
    );
    await expect(
      rotate([...registrations, paired], [live(joiner.reader)]),
    ).rejects.toBeInstanceOf(DeviceRosterInvalidError);
  });

  it('keeps the roster key of the oldest live envelope when a later one carries the live secret with another roster key', async () => {
    const owner = await device();
    const joiner = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });
    const genuine = await openDeviceEnvelope(
      owner.readerSecret,
      created.envelopes[0],
    );
    const forgedRosterKey = crypto.getRandomValues(new Uint8Array(32));
    const forged = await sealDeviceEnvelope(owner.readerPublicKey, {
      secret: genuine!.secret,
      rosterKey: forgedRosterKey,
    });
    const keyring = keyringOf(
      created.encKey,
      [...created.envelopes, forged],
      owner.readerPublicKey,
    );
    expect(keyring.envelopes[0]).toEqual(forged);

    const { registration } = await owner.key.sealToDevice(
      NETWORK,
      keyring,
      live(joiner.reader),
    );

    await expect(
      openDeviceRegistration(genuine!.rosterKey, registration),
    ).resolves.toEqual(joiner.reader);
    await expect(
      openDeviceRegistration(forgedRosterKey, registration),
    ).resolves.toBeNull();
    const planted = await sealDeviceRegistration(
      forgedRosterKey,
      joiner.reader,
    );
    const opened = await owner.key.openInbox(NETWORK, keyring, [
      ...created.registrations,
      planted,
    ]);
    expect(opened).toEqual([{ kind: 'device', device: owner.reader }, null]);
  });

  it('lets a joining device open the live keys it was sealed', async () => {
    const owner = await device();
    const joiner = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });
    const delivered = await owner.key.sealToDevice(
      NETWORK,
      keyringOf(created.encKey, created.envelopes, owner.readerPublicKey),
      live(joiner.reader),
    );
    const deposit = await sealInboxEntry(created.encKey, coin(4n));
    const inbox = [
      ...created.envelopes,
      ...created.registrations,
      delivered.envelope,
      delivered.registration,
      deposit,
    ];

    const opened = await joiner.key.openInbox(
      NETWORK,
      keyringOf(created.encKey, inbox, joiner.readerPublicKey),
      inbox,
    );

    expect(opened.filter(entry => entry?.kind === 'device')).toEqual([
      { kind: 'device', device: owner.reader },
      { kind: 'device', device: joiner.reader },
    ]);
    expect(opened[4]?.kind).toBe('coin');
  });

  it('refuses to seal to a reader key of small order', async () => {
    const owner = await device();
    const created = await owner.key.createKeys(NETWORK, {
      devicePublicKey: owner.reader.devicePublicKey,
    });

    await expect(
      owner.key.sealToDevice(
        NETWORK,
        keyringOf(created.encKey, created.envelopes, owner.readerPublicKey),
        live({
          readerPublicKey: '00'.repeat(32),
          devicePublicKey: 'd1'.repeat(32),
        }),
      ),
    ).rejects.toBeInstanceOf(DeviceReaderInvalidError);
  });

  it('re-encrypts entries from the keyring secrets to the new key, null for one that does not open', async () => {
    const { key, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const next = x25519.utils.randomSecretKey();
    const held = coin(6n);

    const moved = await key.reencryptInbox(
      NETWORK,
      {
        keyring: keyringOf(created.encKey, created.envelopes, readerPublicKey),
        to: x25519.getPublicKey(next),
      },
      [await sealInboxEntry(created.encKey, held), new Uint8Array(192)],
    );

    expect(moved[1]).toBeNull();
    const reopened = await openInboxEntry(next, moved[0] as Uint8Array);
    expect(reopened?.value).toBe(6n);
  });

  it('seals the live secret to a grantee and keeps the seal in a grant record only this device opens', async () => {
    const { key, readerPublicKey, reader } = await device();
    const other = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const keyring = keyringOf(
      created.encKey,
      created.envelopes,
      readerPublicKey,
    );
    const readSecret = x25519.utils.randomSecretKey();
    const grantId = GrantId('ab'.repeat(32));
    const account = ACCOUNT;

    const { seal, entry } = await key.sealView(NETWORK, keyring, {
      grantId,
      account,
      readPublicKey: HexBytes.fromByteArray(x25519.getPublicKey(readSecret)),
    });

    const secret = await openGrantViewSeal(readSecret, seal, {
      grantId,
      account,
    });
    expect(isLiveSecret(secret, created.encKey)).toBe(true);
    const [opened] = await key.openInbox(NETWORK, keyring, [entry]);
    expect(opened).toEqual({
      kind: 'grant',
      record: {
        part: 'view',
        grantId,
        encKeyPrefix: HexBytes.fromByteArray(created.encKey.slice(0, 3)),
        seal: HexBytes.fromByteArray(seal),
      },
    });
    const otherCreated = await other.key.createKeys(NETWORK, {
      devicePublicKey: other.reader.devicePublicKey,
    });
    await expect(
      other.key.openInbox(
        NETWORK,
        keyringOf(
          otherCreated.encKey,
          otherCreated.envelopes,
          other.readerPublicKey,
        ),
        [entry],
      ),
    ).resolves.toEqual([null]);
  });

  it('seals a grant as its grant and object parts', async () => {
    const { key, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const grant: GrantBookkeeping = {
      grantId: GrantId('ab'.repeat(32)),
      slot: GrantSlot(3),
      scopeSalt: GrantScopeSalt('cd'.repeat(32)),
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: 'ef'.repeat(32),
      readPublicKey: '12'.repeat(32),
      object: {
        color: '34'.repeat(32),
        recipient: { kind: 'user-address', value: '56'.repeat(32) },
        maxCoinValue: '1000',
      },
    };

    const entries = await key.sealGrant(NETWORK, ACCOUNT, grant);
    const opened = await key.openInbox(
      NETWORK,
      keyringOf(created.encKey, created.envelopes, readerPublicKey),
      entries,
    );

    const { object, ...fields } = grant;
    expect(opened).toEqual([
      { kind: 'grant', record: { part: 'grant', ...fields } },
      {
        kind: 'grant',
        record: { part: 'object', grantId: grant.grantId, object },
      },
    ]);
    await expect(
      key.openInbox(
        NETWORK,
        {
          ...keyringOf(created.encKey, created.envelopes, readerPublicKey),
          account: AccAddress('ad'.repeat(32)),
        },
        entries,
      ),
    ).resolves.toEqual([null, null]);
  });
});

describe('liveEnvelopeOver', () => {
  it('answers the position of the oldest envelope whose secret derives enc_key, past later ones sealing the same secret, or null for none', async () => {
    const { key, deriveSecret, readerPublicKey, reader, readerSecret } =
      await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const [genuine] = deviceEnvelopes(created.envelopes, readerPublicKey);
    const delivered = await openDeviceEnvelope(readerSecret, genuine);
    const stranger = async () =>
      sealDeviceEnvelope(readerPublicKey, {
        secret: x25519.utils.randomSecretKey(),
        rosterKey: crypto.getRandomValues(new Uint8Array(32)),
      });
    const resealed = await sealDeviceEnvelope(readerPublicKey, {
      secret: delivered!.secret,
      rosterKey: crypto.getRandomValues(new Uint8Array(32)),
    });
    const findLive = liveEnvelopeOver(deriveSecret);
    const keyringWith = (envelopes: Uint8Array[]): AccountKeyring => ({
      account: ACCOUNT,
      encKey: created.encKey,
      envelopes,
    });

    await expect(
      findLive(
        NETWORK,
        keyringWith([
          await stranger(),
          resealed,
          await stranger(),
          genuine,
          await stranger(),
        ]),
      ),
    ).resolves.toBe(3);
    await expect(
      findLive(NETWORK, keyringWith([await stranger(), resealed])),
    ).resolves.toBe(1);
    await expect(
      findLive(NETWORK, keyringWith([await stranger()])),
    ).resolves.toBeNull();
    await expect(
      findLive('devnet', keyringWith([genuine])),
    ).resolves.toBeNull();
  });

  it('passes over entries copying the live envelope tag over other bytes', async () => {
    const { key, deriveSecret, readerPublicKey, reader } = await device();
    const created = await key.createKeys(NETWORK, {
      devicePublicKey: reader.devicePublicKey,
    });
    const [genuine] = deviceEnvelopes(created.envelopes, readerPublicKey);
    const copied = () => {
      const copy = genuine.slice();
      copy.set(crypto.getRandomValues(new Uint8Array(126)), 66);
      return copy;
    };

    await expect(
      liveEnvelopeOver(deriveSecret)(NETWORK, {
        account: ACCOUNT,
        encKey: created.encKey,
        envelopes: [copied(), copied(), genuine, copied()],
      }),
    ).resolves.toBe(2);
  });
});

const PINNED_OPERATION = 'withdraw_unshielded_with_jubjub';
const HEADERLESS_OPERATION = 'add_device_with_jubjub';
const RECOVERY_OPERATION = 'recover_submit';
const K256_ARM_OPERATION = 'add_device_with_k256';

/**
 * A verifier key the pinned compiler line emits, for a one-circuit
 * counter contract. It stands in for a pinned Account Custody Contract
 * key: the test pins its digest for {@link PINNED_OPERATION}.
 */
const verifierKey = new Uint8Array(
  await readFile(path.join(__dirname, 'fixtures', 'counter-bump.verifier')),
);
const headerless = verifierKey.slice(8);

pins.expectedVk[PINNED_OPERATION] = HexBytes.fromByteArray(sha256(verifierKey));
pins.expectedVk[RECOVERY_OPERATION] = pins.expectedVk[PINNED_OPERATION];
pins.expectedVk[K256_ARM_OPERATION] = pins.expectedVk[PINNED_OPERATION];
pins.expectedVk[HEADERLESS_OPERATION] = HexBytes.fromByteArray(
  sha256(headerless),
);

/**
 * An account a device created and then rotated, keeping the roster key
 * or drawing a fresh one, with the keyring over both envelopes.
 */
const rotatedAccount = async (rotateRoster: boolean) => {
  const owner = await device();
  const created = await owner.key.createKeys(NETWORK, {
    devicePublicKey: owner.reader.devicePublicKey,
  });
  const rotated = await owner.key.createKeys(NETWORK, {
    devicePublicKey: owner.reader.devicePublicKey,
    keyring: keyringOf(
      created.encKey,
      created.envelopes,
      owner.readerPublicKey,
    ),
    registrations: created.registrations,
    rotateRoster,
  });
  const keyring = keyringOf(
    rotated.encKey,
    [...created.envelopes, ...rotated.envelopes],
    owner.readerPublicKey,
  );
  return { owner, created, rotated, keyring };
};

/** The roster key a device's envelope delivers. */
const rosterKeyOf = async (
  readerSecret: Uint8Array,
  envelope: Uint8Array,
): Promise<Uint8Array> => {
  const opened = await openDeviceEnvelope(readerSecret, envelope);
  if (!opened) throw new Error('The envelope does not open');
  return opened.rosterKey;
};

const replaceUpdate = (
  installed: MaintenanceVerifyingKey,
  counter: bigint,
): ledger.MaintenanceUpdate =>
  new ledger.MaintenanceUpdate(
    ACCOUNT,
    [
      new ledger.ReplaceAuthority(
        new ledger.ContractMaintenanceAuthority([installed], 1, counter + 1n),
      ),
    ],
    counter,
  );

/** Every secret a device's key source derived, as the bytes it handed out. */
const derivedSecrets = async (
  deriveSecret: ReturnType<typeof vi.fn<DeriveSecret>>,
): Promise<Uint8Array[]> =>
  Promise.all(
    deriveSecret.mock.results.map(
      async ({ value }) => value as Promise<Uint8Array>,
    ),
  );

const isZeroed = (bytes: ArrayBuffer | Uint8Array): boolean =>
  new Uint8Array(bytes).every(byte => byte === 0);

describe('encryptionKeyOver maintenance authority', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the authority the delivered roster key derives, kept with the roster key and new with a fresh one', async () => {
    const kept = await rotatedAccount(false);
    const fresh = await rotatedAccount(true);

    await expect(
      authorityOf(
        ledger,
        await rosterKeyOf(kept.owner.readerSecret, kept.created.envelopes[0]),
      ),
    ).resolves.toEqual(kept.created.authority);
    expect(kept.created.authority.tag).toBe('schnorr');
    expect(kept.rotated.authority).toEqual(kept.created.authority);
    expect(fresh.rotated.authority).not.toEqual(fresh.created.authority);
    await expect(
      authorityOf(
        ledger,
        await rosterKeyOf(fresh.owner.readerSecret, fresh.rotated.envelopes[0]),
      ),
    ).resolves.toEqual(fresh.rotated.authority);
    expect(kept.created.authority).not.toEqual(fresh.created.authority);
  });

  it('signs the replace a roster rotation needs with the earlier roster key, installing the live one', async () => {
    const { owner, created, rotated, keyring } = await rotatedAccount(true);

    const signed = await owner.key.signMaintenanceUpdate(NETWORK, {
      keyring,
      authority: created.authority,
      counter: 3n,
      changes: { kind: 'replace-authority', authority: rotated.authority },
    });

    expect(signed.authority).toEqual(rotated.authority);
    expect(
      ledger.verifySignature(
        created.authority,
        replaceUpdate(rotated.authority, 3n).dataToSign,
        signed.signature,
      ),
    ).toBe(true);
  });

  it('finds the earlier roster key behind any number of envelopes appended to the reader key', async () => {
    const { owner, created, rotated } = await rotatedAccount(true);
    const earlier = await openDeviceEnvelope(
      owner.readerSecret,
      created.envelopes[0],
    );
    const flood = await Promise.all(
      Array.from({ length: MAX_KEYRING_SECRETS + 4 }, async () =>
        sealDeviceEnvelope(owner.readerPublicKey, {
          secret: x25519.utils.randomSecretKey(),
          rosterKey: crypto.getRandomValues(new Uint8Array(32)),
        }),
      ),
    );
    const replayed = await sealDeviceEnvelope(owner.readerPublicKey, {
      secret: earlier!.secret,
      rosterKey: crypto.getRandomValues(new Uint8Array(32)),
    });
    const keyring = keyringOf(
      rotated.encKey,
      [...created.envelopes, ...flood, replayed, ...rotated.envelopes],
      owner.readerPublicKey,
    );

    const signed = await owner.key.signMaintenanceUpdate(NETWORK, {
      keyring,
      authority: created.authority,
      counter: 2n,
      changes: { kind: 'replace-authority', authority: rotated.authority },
    });

    expect(signed.authority).toEqual(rotated.authority);
    expect(
      ledger.verifySignature(
        created.authority,
        replaceUpdate(rotated.authority, 2n).dataToSign,
        signed.signature,
      ),
    ).toBe(true);
  });

  it('installs the authority of the oldest live envelope when a later one carries the live secret with another roster key', async () => {
    const { owner, created, rotated } = await rotatedAccount(true);
    const genuine = await openDeviceEnvelope(
      owner.readerSecret,
      rotated.envelopes[0],
    );
    const forgedRosterKey = crypto.getRandomValues(new Uint8Array(32));
    const forged = await sealDeviceEnvelope(owner.readerPublicKey, {
      secret: genuine!.secret,
      rosterKey: forgedRosterKey,
    });
    const keyring = keyringOf(
      rotated.encKey,
      [...created.envelopes, ...rotated.envelopes, forged],
      owner.readerPublicKey,
    );
    expect(keyring.envelopes[0]).toEqual(forged);
    const forgedAuthority = await authorityOf(ledger, forgedRosterKey);

    await expect(
      owner.key.signMaintenanceUpdate(NETWORK, {
        keyring,
        authority: created.authority,
        counter: 4n,
        changes: { kind: 'replace-authority', authority: forgedAuthority },
      }),
    ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);
    const signed = await owner.key.signMaintenanceUpdate(NETWORK, {
      keyring,
      authority: created.authority,
      counter: 4n,
      changes: { kind: 'replace-authority', authority: rotated.authority },
    });

    expect(signed.authority).toEqual(rotated.authority);
    expect(
      ledger.verifySignature(
        created.authority,
        replaceUpdate(rotated.authority, 4n).dataToSign,
        signed.signature,
      ),
    ).toBe(true);
  });

  it('signs an install of a pinned verifier key with the live authority', async () => {
    const { owner, rotated, keyring } = await rotatedAccount(true);

    const signed = await owner.key.signMaintenanceUpdate(NETWORK, {
      keyring,
      authority: rotated.authority,
      counter: 5n,
      changes: {
        kind: 'insert-verifier-keys',
        inserts: [{ operation: PINNED_OPERATION, verifierKey }],
      },
    });
    const update = new ledger.MaintenanceUpdate(
      ACCOUNT,
      [verifierKeyInsert(ledger, PINNED_OPERATION, verifierKey)],
      5n,
    );

    expect(signed.authority).toBeUndefined();
    expect(
      ledger.verifySignature(
        rotated.authority,
        update.dataToSign,
        signed.signature,
      ),
    ).toBe(true);
  });

  it('refuses an on-chain authority no roster key of the keyring derives', async () => {
    const { owner, keyring } = await rotatedAccount(true);
    const stranger = await rotatedAccount(false);

    await expect(
      owner.key.signMaintenanceUpdate(NETWORK, {
        keyring,
        authority: stranger.created.authority,
        counter: 0n,
        changes: {
          kind: 'insert-verifier-keys',
          inserts: [{ operation: PINNED_OPERATION, verifierKey }],
        },
      }),
    ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
  });

  it('refuses a replace that installs the earlier authority instead of the live one', async () => {
    const { owner, created, keyring } = await rotatedAccount(true);

    await expect(
      owner.key.signMaintenanceUpdate(NETWORK, {
        keyring,
        authority: created.authority,
        counter: 0n,
        changes: { kind: 'replace-authority', authority: created.authority },
      }),
    ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);
  });

  it.each<[string, MaintenanceVerifierKey[]]>([
    ['no verifier key', []],
    [
      'a recovery circuit, though its key is the pinned one',
      [{ operation: RECOVERY_OPERATION, verifierKey }],
    ],
    [
      'a k256 device arm circuit, though its key is the pinned one',
      [{ operation: K256_ARM_OPERATION, verifierKey }],
    ],
    [
      'an operation without a pin',
      [{ operation: 'deposit_shielded', verifierKey }],
    ],
    [
      'a key that is not the pinned one',
      [{ operation: PINNED_OPERATION, verifierKey: verifierKey.slice(1) }],
    ],
    [
      'a pinned key under another header',
      [{ operation: HEADERLESS_OPERATION, verifierKey: headerless }],
    ],
  ])(
    'refuses an install of %s before any key is opened',
    async (_case, inserts) => {
      const { owner, rotated, keyring } = await rotatedAccount(true);
      owner.deriveSecret.mockClear();

      await expect(
        owner.key.signMaintenanceUpdate(NETWORK, {
          keyring,
          authority: rotated.authority,
          counter: 0n,
          changes: { kind: 'insert-verifier-keys', inserts },
        }),
      ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);
      expect(owner.deriveSecret).not.toHaveBeenCalled();
    },
  );

  it('zeroes the reader secret and every derived authority secret, on success and on refusal', async () => {
    const { owner, created, rotated, keyring } = await rotatedAccount(true);
    owner.deriveSecret.mockClear();
    const deriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
    const derivedBits: ArrayBuffer[] = [];
    vi.spyOn(crypto.subtle, 'deriveBits').mockImplementation(
      async (...args: Parameters<SubtleCrypto['deriveBits']>) => {
        const bits = await deriveBits(...args);
        derivedBits.push(bits);
        return bits;
      },
    );

    await owner.key.signMaintenanceUpdate(NETWORK, {
      keyring,
      authority: created.authority,
      counter: 0n,
      changes: { kind: 'replace-authority', authority: rotated.authority },
    });
    await expect(
      owner.key.signMaintenanceUpdate(NETWORK, {
        keyring,
        authority: rotated.authority,
        counter: 0n,
        changes: { kind: 'replace-authority', authority: created.authority },
      }),
    ).rejects.toBeInstanceOf(MaintenanceUpdateRefusedError);

    const readerSecrets = await derivedSecrets(owner.deriveSecret);
    expect(readerSecrets).toHaveLength(2);
    expect(readerSecrets.every(secret => isZeroed(secret))).toBe(true);
    expect(derivedBits.length).toBeGreaterThan(0);
    expect(derivedBits.every(bits => isZeroed(bits))).toBe(true);
  });
});

describe('encryptionKeyOver holdsMaintenanceAuthority', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers true for the authority the live or an earlier roster key derives', async () => {
    const { owner, created, rotated, keyring } = await rotatedAccount(true);

    await expect(
      owner.key.holdsMaintenanceAuthority(NETWORK, keyring, rotated.authority),
    ).resolves.toBe(true);
    await expect(
      owner.key.holdsMaintenanceAuthority(NETWORK, keyring, created.authority),
    ).resolves.toBe(true);
  });

  it('finds the earlier roster key behind any number of envelopes appended to the reader key', async () => {
    const { owner, created, rotated } = await rotatedAccount(true);
    const flood = await Promise.all(
      Array.from({ length: MAX_KEYRING_SECRETS + 4 }, async () =>
        sealDeviceEnvelope(owner.readerPublicKey, {
          secret: x25519.utils.randomSecretKey(),
          rosterKey: crypto.getRandomValues(new Uint8Array(32)),
        }),
      ),
    );
    const keyring = keyringOf(
      rotated.encKey,
      [...created.envelopes, ...flood, ...rotated.envelopes],
      owner.readerPublicKey,
    );

    await expect(
      owner.key.holdsMaintenanceAuthority(NETWORK, keyring, created.authority),
    ).resolves.toBe(true);
  });

  it('answers false for an authority no roster key of the keyring derives', async () => {
    const { owner, keyring } = await rotatedAccount(true);
    const stranger = await rotatedAccount(false);

    await expect(
      owner.key.holdsMaintenanceAuthority(
        NETWORK,
        keyring,
        stranger.created.authority,
      ),
    ).resolves.toBe(false);
  });

  it('rejects a keyring none of whose envelopes opens its enc_key', async () => {
    const { owner, created } = await rotatedAccount(true);
    const keyring = keyringOf(
      new Uint8Array(32).fill(9),
      created.envelopes,
      owner.readerPublicKey,
    );

    await expect(
      owner.key.holdsMaintenanceAuthority(NETWORK, keyring, created.authority),
    ).rejects.toBeInstanceOf(EncryptionKeyMismatchError);
  });

  it('zeroes the reader secret and every derived authority secret', async () => {
    const { owner, created, keyring } = await rotatedAccount(true);
    const stranger = await rotatedAccount(false);
    owner.deriveSecret.mockClear();
    const deriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
    const derivedBits: ArrayBuffer[] = [];
    vi.spyOn(crypto.subtle, 'deriveBits').mockImplementation(
      async (...args: Parameters<SubtleCrypto['deriveBits']>) => {
        const bits = await deriveBits(...args);
        derivedBits.push(bits);
        return bits;
      },
    );

    await owner.key.holdsMaintenanceAuthority(
      NETWORK,
      keyring,
      created.authority,
    );
    await owner.key.holdsMaintenanceAuthority(
      NETWORK,
      keyring,
      stranger.created.authority,
    );

    const readerSecrets = await derivedSecrets(owner.deriveSecret);
    expect(readerSecrets).toHaveLength(2);
    expect(readerSecrets.every(secret => isZeroed(secret))).toBe(true);
    expect(derivedBits.length).toBeGreaterThan(0);
    expect(derivedBits.every(bits => isZeroed(bits))).toBe(true);
  });
});
