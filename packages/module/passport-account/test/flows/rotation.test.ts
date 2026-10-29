import {
  AccAddress,
  DeviceRosterInvalidError,
  GrantId,
  GrantRevocationPendingError,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  encodeDevicePublicKey,
  MAX_DEVICE_ENTRIES,
  sealDeviceEnvelope,
} from '../../src/acc/envelopes';
import { JubjubDevice } from '../../src/acc/signer';
import {
  liveDeviceEntries,
  rotateEncKey,
  sealViews,
} from '../../src/flows/rotation';

import type { Ledger } from '../../src/acc/acc-module';
import type { GrantCircuitCall } from '../../src/acc/grants';
import type * as InboxWalk from '../../src/acc/inbox-walk';
import type { CallChain, RotateEncKeyProps } from '../../src/flows/rotation';
import type { IndexerClient } from '../../src/infra/indexer';
import type {
  DeviceReader,
  OpenedInboxEntry,
  PassportAccountInfo,
  PassportEncryptionKey,
} from '@lace-contract/passport';

const mocks = vi.hoisted(() => ({ walkInbox: vi.fn() }));

vi.mock('../../src/acc/inbox-walk', async importOriginal => ({
  ...(await importOriginal<typeof InboxWalk>()),
  walkInbox: mocks.walkInbox,
}));

const accountAddress = 'ac'.repeat(32);
const account: PassportAccountInfo = {
  address: accountAddress,
  bindingVersion: '0.1.0-lace.1',
  status: 'ready',
  networkId: 'undeployed',
};
const networkId = 'undeployed';
const epoch = 0n;
const encKey = new Uint8Array(32).fill(2);
const newKey = new Uint8Array(32).fill(3);

const entryOf = (device: JubjubDevice, counter = 0n): string =>
  HexBytes.fromByteArray(
    device.entryAt(ByteArray.fromHex(HexBytes(accountAddress)), epoch, counter),
  );

const readerKey = (): Uint8Array =>
  x25519.getPublicKey(x25519.utils.randomSecretKey());

const selfDevice = new JubjubDevice(31n);
const deviceA = new JubjubDevice(41n);
const deviceB = new JubjubDevice(43n);
const selfReaderKey = readerKey();
const readerOf = (device: JubjubDevice): DeviceReader => ({
  readerPublicKey: HexBytes.fromByteArray(readerKey()),
  devicePublicKey: encodeDevicePublicKey(device.pk),
});
const self: DeviceReader = {
  readerPublicKey: HexBytes.fromByteArray(selfReaderKey),
  devicePublicKey: encodeDevicePublicKey(selfDevice.pk),
};
const readerA = readerOf(deviceA);
const readerB = readerOf(deviceB);

/** A registration entry, distinct per `fill`, opened to whatever device the test maps it to. */
const registration = (fill: number): Uint8Array =>
  Uint8Array.from({ length: 192 }, (_, index) => {
    if (index === 0) return 0xd2;
    if (index === 1) return 0x02;
    return index < 94 ? fill : 0;
  });

const envelope = await sealDeviceEnvelope(selfReaderKey, {
  secret: new Uint8Array(32).fill(5),
  rosterKey: new Uint8Array(32).fill(6),
});

const drawnKeys = {
  encKey: newKey,
  envelopes: [new Uint8Array(192).fill(0xd1)],
  registrations: [registration(0x77)],
  authority: { tag: 'schnorr' as const, value: '7a'.repeat(32) },
};

const ledgerFor = (
  inbox: readonly Uint8Array[],
  liveEntries: readonly string[],
): Ledger =>
  ({
    device_epoch: epoch,
    auth_nonce: 1n,
    enc_key: encKey,
    inbox_count: BigInt(inbox.length),
    inbox: {
      member: (ordinal: bigint) => ordinal < BigInt(inbox.length),
      lookup: (ordinal: bigint) => inbox[Number(ordinal)],
    },
    devices: {
      member: (entry: Uint8Array) =>
        liveEntries.includes(HexBytes.fromByteArray(entry)),
      [Symbol.iterator]: () =>
        liveEntries
          .map(entry => ByteArray.fromHex(HexBytes(entry)))
          [Symbol.iterator](),
    },
  } as unknown as Ledger);

type Scenario = {
  registered: [Uint8Array, DeviceReader][];
  liveEntries: string[];
  devices: string[];
  afterAppends?: Uint8Array[];
  landed?: [Uint8Array, DeviceReader][];
  target?: string;
};

const run = ({
  registered,
  liveEntries,
  devices,
  afterAppends,
  landed = [],
  target,
}: Scenario) => {
  const inbox = [envelope, ...registered.map(([entry]) => entry)];
  const opened = new Map<Uint8Array, OpenedInboxEntry>(
    [...registered, ...landed].map(([entry, device]) => [
      entry,
      { kind: 'device', device },
    ]),
  );
  const encryptionKey = {
    readerPublicKey: vi.fn(),
    createKeys: vi.fn<PassportEncryptionKey['createKeys']>(
      async () => drawnKeys,
    ),
    sealToDevice: vi.fn(),
    openInbox: vi.fn<PassportEncryptionKey['openInbox']>(
      async (_networkId, _keyring, entries) =>
        entries.map(entry => opened.get(entry) ?? null),
    ),
    sealGrant: vi.fn(),
    reencryptInbox: vi.fn(async () => []),
    sealView: vi.fn(),
  };
  const submitted: string[] = [];
  let current = ledgerFor(inbox, liveEntries);
  const chain: CallChain = {
    submit: vi.fn(async ({ circuit }: GrantCircuitCall) => {
      submitted.push(circuit);
      if (afterAppends && circuit === 'append_inbox_with_jubjub') {
        current = ledgerFor(afterAppends, liveEntries);
      }
    }),
    append: vi.fn(async () => {}),
    position: () => ({
      ledgerState: current,
      localUseCounter: '2',
      devices: [{ commitmentHex: entryOf(selfDevice), isLocal: true }],
    }),
  };
  const props: RotateEncKeyProps = {
    account,
    encryptionKey,
    view: {
      reencryptInbox: encryptionKey.reencryptInbox,
      sealView: encryptionKey.sealView,
    },
    local: {
      readerPublicKey: selfReaderKey,
      devicePublicKey: self.devicePublicKey,
    },
    chain,
    indexer: {} as IndexerClient,
    networkId,
    onProgress: vi.fn(),
    devices,
    rotateRoster: true,
    ...(target === undefined ? {} : { target }),
  };
  return { props, encryptionKey, submitted };
};

const allLive = [entryOf(selfDevice), entryOf(deviceA), entryOf(deviceB)];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.walkInbox.mockResolvedValue({
    holdings: [],
    holdingEntries: [],
    skippedEntries: 0,
  });
});

describe('rotateEncKey', () => {
  it('seals only to the registered devices whose live entry the session named, with where that entry is, never to this device twice', async () => {
    const { props, encryptionKey, submitted } = run({
      registered: [
        [registration(1), self],
        [registration(2), readerA],
        [registration(3), readerB],
      ],
      liveEntries: allLive,
      devices: [entryOf(selfDevice), entryOf(deviceA)],
    });

    await expect(rotateEncKey(props)).resolves.toMatchObject({
      encKey: newKey,
      authority: drawnKeys.authority,
      keyring: { account: AccAddress(accountAddress), encKey: newKey },
    });

    expect(encryptionKey.createKeys).toHaveBeenCalledExactlyOnceWith(
      networkId,
      expect.objectContaining({
        devicePublicKey: self.devicePublicKey,
        readers: [{ ...readerA, epoch, counter: 0n }],
        rotateRoster: true,
      }),
    );
    expect(submitted.at(-1)).toBe('rotate_enc_key_with_jubjub');
  });

  it('drops a registration whose device key derives no live entry, as one planted with a key of nobody', async () => {
    const planted = readerOf(new JubjubDevice(47n));
    const { props, encryptionKey } = run({
      registered: [
        [registration(2), readerA],
        [registration(4), planted],
      ],
      liveEntries: allLive,
      devices: allLive,
    });

    await rotateEncKey(props);

    expect(encryptionKey.createKeys).toHaveBeenCalledWith(
      networkId,
      expect.objectContaining({
        readers: [{ ...readerA, epoch, counter: 0n }],
      }),
    );
  });

  it('drops both readers when two reader keys claim one live device, reporting that device, without refusing', async () => {
    const { props, encryptionKey, submitted } = run({
      registered: [
        [registration(2), readerA],
        [registration(5), readerOf(deviceA)],
        [registration(3), readerB],
      ],
      liveEntries: allLive,
      devices: allLive,
    });

    await expect(rotateEncKey(props)).resolves.toMatchObject({
      dropped: [entryOf(deviceA)],
    });

    expect(encryptionKey.createKeys).toHaveBeenCalledWith(
      networkId,
      expect.objectContaining({
        readers: [{ ...readerB, epoch, counter: 0n }],
      }),
    );
    expect(submitted.at(-1)).toBe('rotate_enc_key_with_jubjub');
  });

  it('drops a reader key registered for two live devices, and both devices it claims, without refusing', async () => {
    const { props, encryptionKey } = run({
      registered: [
        [registration(2), readerA],
        [
          registration(5),
          { ...readerA, devicePublicKey: readerB.devicePublicKey },
        ],
        [registration(3), readerB],
      ],
      liveEntries: allLive,
      devices: allLive,
    });

    const { dropped } = await rotateEncKey(props);

    expect([...dropped].sort()).toEqual(
      [entryOf(deviceA), entryOf(deviceB)].sort(),
    );
    expect(encryptionKey.createKeys).toHaveBeenCalledWith(
      networkId,
      expect.objectContaining({ readers: [] }),
    );
  });

  it('sets the removal target apart before conflicts and names its registration to the key', async () => {
    const { props, encryptionKey } = run({
      registered: [
        [registration(2), readerA],
        [
          registration(5),
          { ...readerB, devicePublicKey: readerA.devicePublicKey },
        ],
        [registration(3), readerB],
      ],
      liveEntries: allLive,
      devices: [entryOf(selfDevice), entryOf(deviceB)],
      target: entryOf(deviceA),
    });

    await expect(rotateEncKey(props)).resolves.toMatchObject({ dropped: [] });

    expect(encryptionKey.createKeys).toHaveBeenCalledWith(
      networkId,
      expect.objectContaining({
        readers: [{ ...readerB, epoch, counter: 0n }],
        removed: {
          devicePublicKey: readerA.devicePublicKey,
          epoch,
          counter: 0n,
        },
      }),
    );
  });

  it('names no removed device when the target has no registration', async () => {
    const { props, encryptionKey } = run({
      registered: [[registration(3), readerB]],
      liveEntries: allLive,
      devices: [entryOf(selfDevice), entryOf(deviceB)],
      target: entryOf(deviceA),
    });

    await rotateEncKey(props);

    const [, request] = encryptionKey.createKeys.mock.calls[0];
    expect(request).not.toHaveProperty('removed');
  });

  it('rotates once its own keys landed and no other registration did', async () => {
    const appended = [
      envelope,
      registration(2),
      ...drawnKeys.envelopes,
      ...drawnKeys.registrations,
    ];
    const { props, submitted } = run({
      registered: [[registration(2), readerA]],
      liveEntries: allLive,
      devices: allLive,
      afterAppends: appended,
    });

    await rotateEncKey(props);

    expect(submitted.at(-1)).toBe('rotate_enc_key_with_jubjub');
  });

  it('rotates when a registration that opens under no roster key landed while its keys were appended', async () => {
    const junk = registration(8);
    const { props, submitted } = run({
      registered: [[registration(2), readerA]],
      liveEntries: allLive,
      devices: allLive,
      afterAppends: [
        envelope,
        registration(2),
        ...drawnKeys.envelopes,
        ...drawnKeys.registrations,
        junk,
      ],
    });

    await rotateEncKey(props);

    expect(submitted.at(-1)).toBe('rotate_enc_key_with_jubjub');
  });

  it('refuses with DeviceRosterInvalidError, before rotate_enc_key, when a registration the live roster key opens landed while its keys were appended', async () => {
    const genuine = registration(9);
    const { props, submitted } = run({
      registered: [[registration(2), readerA]],
      liveEntries: allLive,
      devices: allLive,
      landed: [[genuine, readerB]],
      afterAppends: [
        envelope,
        registration(2),
        ...drawnKeys.envelopes,
        ...drawnKeys.registrations,
        genuine,
      ],
    });

    await expect(rotateEncKey(props)).rejects.toBeInstanceOf(
      DeviceRosterInvalidError,
    );
    expect(submitted).not.toContain('rotate_enc_key_with_jubjub');
  });

  it('reports a named device with no registration as dropped, never this device', async () => {
    const { props } = run({
      registered: [[registration(2), readerA]],
      liveEntries: allLive,
      devices: allLive,
    });

    await expect(rotateEncKey(props)).resolves.toMatchObject({
      dropped: [entryOf(deviceB)],
    });
  });
});

describe('liveDeviceEntries', () => {
  const ledgerOf = (count: number) =>
    ledgerFor(
      [],
      Array.from({ length: count }, (_, index) =>
        index.toString(16).padStart(64, '0'),
      ),
    );

  it('names the live entries less the removal target', () => {
    expect(liveDeviceEntries(ledgerOf(3), '01'.padStart(64, '0'))).toEqual([
      '0'.repeat(64),
      '2'.padStart(64, '0'),
    ]);
  });

  it('refuses more live entries than a rotation names', () => {
    expect(liveDeviceEntries(ledgerOf(MAX_DEVICE_ENTRIES))).toHaveLength(
      MAX_DEVICE_ENTRIES,
    );
    expect(() => liveDeviceEntries(ledgerOf(MAX_DEVICE_ENTRIES + 1))).toThrow(
      DeviceRosterInvalidError,
    );
  });
});

describe('sealViews', () => {
  const sealedId = GrantId('a1'.repeat(32));
  const unsealedId = GrantId('b2'.repeat(32));
  const pendingId = GrantId('c3'.repeat(32));
  const readPublicKey = 'dd'.repeat(32);
  const delivery = { seal: new Uint8Array([1]), entry: new Uint8Array([2]) };

  it('lists a grant refused for a pending revocation apart from one refused otherwise', async () => {
    const sealView = vi.fn(
      async (
        _networkId: string,
        _keyring: unknown,
        { grantId }: { grantId: string },
      ) => {
        if (grantId === unsealedId) throw new Error('refused');
        if (grantId === pendingId) throw new GrantRevocationPendingError();
        return delivery;
      },
    );

    const views = await sealViews({
      view: { sealView, reencryptInbox: vi.fn() },
      networkId,
      keyring: {
        account: AccAddress(accountAddress),
        encKey: newKey,
        envelopes: [],
      },
      account: AccAddress(accountAddress),
      targets: [sealedId, unsealedId, pendingId].map(grantId => ({
        grantId,
        readPublicKey,
      })),
    });

    expect(views).toEqual({
      sealed: [
        {
          grantId: sealedId,
          readPublicKey,
          seal: '01',
          sealedEncKey: HexBytes.fromByteArray(newKey),
        },
      ],
      unsealed: [unsealedId],
      revocationPending: [pendingId],
      entries: [delivery.entry],
    });
  });
});
