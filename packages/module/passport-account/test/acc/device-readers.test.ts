import { DeviceReaderInvalidError } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it, vi } from 'vitest';

import { pureCircuits } from '../../src/acc/acc-module';
import {
  assertJoiningDevice,
  derivesEntry,
  deviceEntryOf,
  resolveLiveReaders,
} from '../../src/acc/device-readers';
import { encodeDevicePublicKey } from '../../src/acc/envelopes';
import { JubjubDevice } from '../../src/acc/signer';

import type * as Envelopes from '../../src/acc/envelopes';
import type { DeviceReader } from '@lace-contract/passport';

const decodes = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../src/acc/envelopes', async importOriginal => {
  const original = await importOriginal<typeof Envelopes>();
  return {
    ...original,
    decodeDevicePublicKey: (
      ...args: Parameters<typeof original.decodeDevicePublicKey>
    ) => {
      decodes.count += 1;
      return original.decodeDevicePublicKey(...args);
    },
  };
});

const address = 'ac'.repeat(32);
const epoch = 2n;
const scope = { address, epoch };

const readerOf = (device: JubjubDevice): DeviceReader => ({
  readerPublicKey: HexBytes.fromByteArray(
    x25519.getPublicKey(x25519.utils.randomSecretKey()),
  ),
  devicePublicKey: encodeDevicePublicKey(device.pk),
});

const entryOf = (device: JubjubDevice, counter: bigint): string =>
  HexBytes.fromByteArray(
    device.entryAt(ByteArray.fromHex(HexBytes(address)), epoch, counter),
  );

describe('assertJoiningDevice', () => {
  it('accepts a device whose key derives the enrolled commitment at use counter 0', () => {
    const device = JubjubDevice.generate();

    expect(() => {
      assertJoiningDevice(scope, readerOf(device), entryOf(device, 0n));
    }).not.toThrow();
    expect(() => {
      assertJoiningDevice(
        scope,
        readerOf(device),
        entryOf(device, 0n).toUpperCase(),
      );
    }).not.toThrow();
  });

  it('refuses a commitment the device key does not derive at use counter 0', () => {
    const device = JubjubDevice.generate();

    expect(() => {
      assertJoiningDevice(scope, readerOf(device), entryOf(device, 1n));
    }).toThrow(DeviceReaderInvalidError);
    expect(() => {
      assertJoiningDevice(
        scope,
        readerOf(device),
        entryOf(JubjubDevice.generate(), 0n),
      );
    }).toThrow(DeviceReaderInvalidError);
  });

  it('refuses a device key that is no point and a reader key of small order', () => {
    const device = JubjubDevice.generate();
    const commitment = entryOf(device, 0n);

    expect(() => {
      assertJoiningDevice(
        scope,
        { ...readerOf(device), devicePublicKey: 'ff'.repeat(32) },
        commitment,
      );
    }).toThrow(DeviceReaderInvalidError);
    expect(() => {
      assertJoiningDevice(
        scope,
        { ...readerOf(device), readerPublicKey: '00'.repeat(32) },
        commitment,
      );
    }).toThrow(DeviceReaderInvalidError);
  });
});

describe('deviceEntryOf', () => {
  it('derives the entry the contract derives for a device key and counter', () => {
    const device = JubjubDevice.generate();

    expect(deviceEntryOf(scope, encodeDevicePublicKey(device.pk), 5n)).toBe(
      HexBytes.fromByteArray(
        pureCircuits.derive_device_entry_with_jubjub(
          { bytes: ByteArray.fromHex(HexBytes(address)) },
          device.pk,
          epoch,
          5n,
        ),
      ),
    );
    expect(deviceEntryOf(scope, encodeDevicePublicKey(device.pk), 5n)).toBe(
      entryOf(device, 5n),
    );
  });

  it('derives nothing for a key that is no point', () => {
    expect(deviceEntryOf(scope, 'ff'.repeat(32), 0n)).toBeUndefined();
  });
});

describe('derivesEntry', () => {
  it('answers whether a device key derives an entry within the scan', () => {
    const device = JubjubDevice.generate();
    const key = encodeDevicePublicKey(device.pk);

    expect(derivesEntry(scope, key, entryOf(device, 0n))).toBe(true);
    expect(derivesEntry(scope, key, entryOf(device, 7n))).toBe(true);
    expect(derivesEntry(scope, key, entryOf(JubjubDevice.generate(), 0n))).toBe(
      false,
    );
    expect(derivesEntry(scope, 'ff'.repeat(32), entryOf(device, 0n))).toBe(
      false,
    );
  });
});

describe('resolveLiveReaders', () => {
  const first = JubjubDevice.generate();
  const second = JubjubDevice.generate();
  const removed = JubjubDevice.generate();
  const firstReader = readerOf(first);
  const secondReader = readerOf(second);
  const removedReader = readerOf(removed);
  const firstEntry = entryOf(first, 3n);
  const secondEntry = entryOf(second, 1n);
  const removedEntry = entryOf(removed, 0n);
  const live = new Set([firstEntry, secondEntry, removedEntry]);
  const isLive = (entry: string): boolean => live.has(entry);
  const allowed = new Set([firstEntry, secondEntry]);

  it('keeps each registered device with its live entry, counter and epoch', () => {
    expect(
      resolveLiveReaders({
        scope,
        registered: [firstReader, secondReader],
        isLive,
        allowed,
      }),
    ).toEqual({
      readers: [
        {
          reader: { ...firstReader, epoch, counter: 3n },
          entryHex: firstEntry,
        },
        {
          reader: { ...secondReader, epoch, counter: 1n },
          entryHex: secondEntry,
        },
      ],
      dropped: [],
      outside: [],
    });
  });

  it('passes over a registration whose key derives no live entry or is no point, and counts one written twice once', () => {
    const resolved = resolveLiveReaders({
      scope,
      registered: [
        firstReader,
        readerOf(JubjubDevice.generate()),
        { ...secondReader, devicePublicKey: 'ff'.repeat(32) },
        firstReader,
      ],
      isLive,
      allowed,
    });

    expect(
      resolved.readers.map(({ reader }) => reader.readerPublicKey),
    ).toEqual([firstReader.readerPublicKey]);
    expect(resolved.dropped).toEqual([secondEntry]);
  });

  it('drops both readers of a live device claimed by two reader keys and reports it', () => {
    const resolved = resolveLiveReaders({
      scope,
      registered: [firstReader, readerOf(first), secondReader],
      isLive,
      allowed,
    });

    expect(
      resolved.readers.map(({ reader }) => reader.readerPublicKey),
    ).toEqual([secondReader.readerPublicKey]);
    expect(resolved.dropped).toEqual([firstEntry]);
  });

  it('drops a reader key registered for two live devices and reports the devices left without a reader', () => {
    const resolved = resolveLiveReaders({
      scope,
      registered: [
        firstReader,
        { ...secondReader, readerPublicKey: firstReader.readerPublicKey },
      ],
      isLive,
      allowed,
    });

    expect(resolved.readers).toEqual([]);
    expect(resolved.dropped).toEqual([firstEntry, secondEntry]);
  });

  it('sets apart registrations whose live entry is not allowed before it looks for conflicts', () => {
    const resolved = resolveLiveReaders({
      scope,
      registered: [
        firstReader,
        secondReader,
        removedReader,
        { ...removedReader, devicePublicKey: firstReader.devicePublicKey },
      ],
      isLive,
      allowed,
    });

    expect(resolved.outside).toEqual([
      {
        reader: { ...removedReader, epoch, counter: 0n },
        entryHex: removedEntry,
      },
    ]);
    expect(resolved.dropped).toEqual([firstEntry]);
    expect(
      resolved.readers.map(({ reader }) => reader.readerPublicKey),
    ).toEqual([secondReader.readerPublicKey]);
  });

  it('lets a removed device pair its reader with its own key without a conflict', () => {
    const resolved = resolveLiveReaders({
      scope,
      registered: [firstReader, secondReader, removedReader, removedReader],
      isLive,
      allowed,
    });

    expect(resolved.dropped).toEqual([]);
    expect(resolved.readers).toHaveLength(2);
    expect(resolved.outside.map(({ entryHex }) => entryHex)).toEqual([
      removedEntry,
      removedEntry,
    ]);
  });

  it('decodes each device key once and stops once every allowed entry is matched', () => {
    const derive = vi.spyOn(pureCircuits, 'derive_device_entry_with_jubjub');
    const stranger = readerOf(JubjubDevice.generate());
    decodes.count = 0;

    const resolved = resolveLiveReaders({
      scope,
      registered: [firstReader, secondReader, stranger, firstReader],
      isLive,
      allowed,
    });

    expect(resolved.dropped).toEqual([]);
    expect(resolved.readers).toHaveLength(2);
    expect(decodes.count).toBe(3);
    expect(derive).toHaveBeenCalledTimes(10);
    derive.mockRestore();
  });

  it('keeps scanning for the target once every allowed entry is matched', () => {
    const lateEntry = entryOf(removed, 6n);
    const withLate = new Set([secondEntry, lateEntry]);
    const props = {
      scope,
      registered: [secondReader, removedReader],
      isLive: (entry: string): boolean => withLate.has(entry),
      allowed: new Set([secondEntry]),
    };

    expect(resolveLiveReaders(props).outside).toEqual([]);
    expect(resolveLiveReaders({ ...props, target: lateEntry })).toEqual({
      readers: [
        {
          reader: { ...secondReader, epoch, counter: 1n },
          entryHex: secondEntry,
        },
      ],
      dropped: [],
      outside: [
        {
          reader: { ...removedReader, epoch, counter: 6n },
          entryHex: lateEntry,
        },
      ],
    });
  });
});
