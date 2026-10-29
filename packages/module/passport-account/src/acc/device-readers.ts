import {
  DeviceReaderInvalidError,
  isSealableX25519Key,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { pureCircuits } from './acc-module';
import { decodeDevicePublicKey } from './envelopes';

import type { DeviceReader, LiveDeviceReader } from '@lace-contract/passport';

/**
 * How many use counters of each registered device are tried for its live
 * entry, as far as the use-counter rescan probes a device's own counter.
 */
const DEVICE_ENTRY_SCAN_LIMIT = 4096n;

/** Where a device's rolling entries live: the account and its epoch. */
export type DeviceEntryScope = { address: string; epoch: bigint };

/** The rolling entry one device key derives at a use counter, as lowercase hex. */
type EntryDerivation = (counter: bigint) => string;

/**
 * The rolling entries a compressed device key derives in a scope, with
 * the key decoded once for every counter tried, or undefined for a key
 * that is no Jubjub point.
 */
const entriesOf = (
  { address, epoch }: DeviceEntryScope,
  devicePublicKey: string,
): EntryDerivation | undefined => {
  const point = decodeDevicePublicKey(devicePublicKey);
  if (!point) return undefined;
  const account = { bytes: ByteArray.fromHex(HexBytes(address)) };
  return counter =>
    HexBytes.fromByteArray(
      pureCircuits.derive_device_entry_with_jubjub(
        account,
        point,
        epoch,
        counter,
      ),
    );
};

/**
 * The rolling entry a compressed device key derives at one use counter,
 * as lowercase hex, or undefined for a key that is no Jubjub point.
 */
export const deviceEntryOf = (
  scope: DeviceEntryScope,
  devicePublicKey: string,
  counter: bigint,
): string | undefined => entriesOf(scope, devicePublicKey)?.(counter);

/**
 * Whether a compressed device key derives `entryHex` at any use counter
 * up to {@link DEVICE_ENTRY_SCAN_LIMIT}: whether it is the key of the
 * device holding that entry.
 */
export const derivesEntry = (
  scope: DeviceEntryScope,
  devicePublicKey: string,
  entryHex: string,
): boolean => {
  const entryAt = entriesOf(scope, devicePublicKey);
  if (!entryAt) return false;
  for (let counter = 0n; counter < DEVICE_ENTRY_SCAN_LIMIT; counter++) {
    if (entryAt(counter) === entryHex) return true;
  }
  return false;
};

/**
 * Holds a joining device's keys to the entry it is enrolled under: its
 * reader key must be one the account seals to, and its device key a
 * Jubjub point whose entry at use counter 0, the counter a fresh device
 * starts from, is the commitment being added, so the account keys are
 * never sealed to a reader paired with another device's key.
 *
 * @throws {@link DeviceReaderInvalidError} when the reader key is not
 * sealable, the device key is no point, or its first entry is not the
 * commitment.
 */
export const assertJoiningDevice = (
  scope: DeviceEntryScope,
  reader: DeviceReader,
  commitmentHex: string,
): void => {
  if (
    !isSealableX25519Key(reader.readerPublicKey) ||
    deviceEntryOf(scope, reader.devicePublicKey, 0n) !==
      commitmentHex.toLowerCase()
  ) {
    throw new DeviceReaderInvalidError();
  }
};

/** What {@link resolveLiveReaders} resolves, and against what. */
export type ResolveLiveReadersProps = {
  scope: DeviceEntryScope;
  /** The devices the live roster key registers, as opened from the inbox. */
  registered: readonly DeviceReader[];
  /** Whether an entry, as lowercase hex, is in the ledger's device set. */
  isLive: (entryHex: string) => boolean;
  /** The live entries whose devices may be sealed to, as lowercase hex. */
  allowed: ReadonlySet<string>;
  /**
   * A live entry outside `allowed` whose registration is sought too, as
   * lowercase hex: the entry a removal takes out.
   */
  target?: string;
};

/** A registered device resolved against the ledger: its reader with its live entry. */
export type ResolvedReader = { reader: LiveDeviceReader; entryHex: string };

/**
 * The roster a rotation seals to: `readers`, one per allowed live device;
 * `dropped`, the allowed live entries whose devices get no new key,
 * because their registrations conflict or they have none; and `outside`,
 * the registrations found whose live entry is not allowed, the target's
 * among them when it has one.
 */
export type ResolvedRoster = {
  readers: ResolvedReader[];
  dropped: string[];
  outside: ResolvedReader[];
};

/** Where a device key derives a live entry: the use counter and the entry. */
type LiveEntry = { counter: bigint; entryHex: string };

/** What {@link liveEntries} scans: the device keys and the entries sought. */
type LiveEntriesProps = Pick<ResolveLiveReadersProps, 'isLive' | 'scope'> & {
  devicePublicKeys: ReadonlySet<string>;
  sought: ReadonlySet<string>;
};

/**
 * The live entry of each device key that derives one, by key. Every key
 * is decoded once and the keys are tried in lockstep, one use counter at
 * a time from 0, so each resolves at its lowest live counter. The scan
 * ends at {@link DEVICE_ENTRY_SCAN_LIMIT} or once every `sought` entry
 * is matched: an entry derives from one device key only, so no key still
 * unresolved can derive a sought entry after that.
 */
const liveEntries = ({
  scope,
  devicePublicKeys,
  isLive,
  sought,
}: LiveEntriesProps): Map<string, LiveEntry> => {
  const found = new Map<string, LiveEntry>();
  const unmatched = new Set(sought);
  let unresolved = [...devicePublicKeys].flatMap(key => {
    const entryAt = entriesOf(scope, key);
    return entryAt ? [{ key, entryAt }] : [];
  });
  for (
    let counter = 0n;
    counter < DEVICE_ENTRY_SCAN_LIMIT &&
    unresolved.length > 0 &&
    unmatched.size > 0;
    counter++
  ) {
    unresolved = unresolved.filter(({ key, entryAt }) => {
      const entryHex = entryAt(counter);
      if (!isLive(entryHex)) return true;
      found.set(key, { counter, entryHex });
      unmatched.delete(entryHex);
      return false;
    });
  }
  return found;
};

/** Adds `value` to the set `map` holds under `key`. */
const addTo = (
  map: Map<string, Set<string>>,
  key: string,
  value: string,
): void => {
  map.set(key, (map.get(key) ?? new Set()).add(value));
};

/**
 * The registered devices that are enrolled now, each with its live entry:
 * every device key is tried at use counters from 0 until it derives an
 * entry the ledger's device set holds, at most
 * {@link DEVICE_ENTRY_SCAN_LIMIT} of them, and the scan stops once every
 * allowed entry and the target are matched, so registrations it has not
 * resolved by then can derive none of them. A registration whose key
 * derives no live entry is left out, as one a device wrote before it was
 * enrolled, one of a removed device, or one planted with a key of
 * nobody's. One device's registration written twice counts once.
 * Registrations whose live entry is not allowed are set apart first, so a
 * removed device's own registrations never weigh on the rest. Among the
 * others, which one is genuine cannot be told apart when they conflict,
 * so none of a conflict is sealed to: a reader key registered for two
 * live devices is left out, and a live device claimed by two reader keys
 * keeps none of them. Every allowed entry left without a reader, that
 * way or for want of any registration, is reported dropped, so the user
 * sees every device that gets no new key and has to be enrolled again.
 */
export const resolveLiveReaders = ({
  scope,
  registered,
  isLive,
  allowed,
  target,
}: ResolveLiveReadersProps): ResolvedRoster => {
  const resolved = new Map<string, ResolvedReader>();
  const outside: ResolvedReader[] = [];
  const entriesOfReader = new Map<string, Set<string>>();
  const readersOfEntry = new Map<string, Set<string>>();
  const live = liveEntries({
    scope,
    devicePublicKeys: new Set(
      registered.map(({ devicePublicKey }) => devicePublicKey),
    ),
    isLive,
    sought: target === undefined ? allowed : new Set([...allowed, target]),
  });
  for (const device of registered) {
    const entry = live.get(device.devicePublicKey);
    if (!entry) continue;
    const candidate: ResolvedReader = {
      reader: { ...device, epoch: scope.epoch, counter: entry.counter },
      entryHex: entry.entryHex,
    };
    if (!allowed.has(entry.entryHex)) {
      outside.push(candidate);
      continue;
    }
    resolved.set(`${device.readerPublicKey}:${entry.entryHex}`, candidate);
    addTo(entriesOfReader, device.readerPublicKey, entry.entryHex);
    addTo(readersOfEntry, entry.entryHex, device.readerPublicKey);
  }
  const readers = [...resolved.values()].filter(
    ({ reader, entryHex }) =>
      (entriesOfReader.get(reader.readerPublicKey)?.size ?? 0) === 1 &&
      (readersOfEntry.get(entryHex)?.size ?? 0) === 1,
  );
  const kept = new Set(readers.map(({ entryHex }) => entryHex));
  return {
    readers,
    dropped: [...allowed].filter(entry => !kept.has(entry)),
    outside,
  };
};
