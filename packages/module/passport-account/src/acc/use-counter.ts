import {
  DeviceEntryNotFoundError,
  DeviceEpoch,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import type {
  AccAddress,
  DeviceCommitmentHex,
  PassportAuthoriser,
} from '@lace-contract/passport';

/** How far past the last known counter the rescan probes. */
const RESCAN_LIMIT = 4096n;

/**
 * Candidates batched per deviceCommitments call. 64 keeps a typical rescan
 * (small counter drift) at one ceremony while it caps a full-window miss at
 * 64 ceremonies instead of 4096, and the per-chunk membership check stops
 * the scan before the remaining commitments are ever computed.
 */
const RESCAN_CHUNK = 64n;

/**
 * The slice of the decoded Account Custody Contract ledger state the
 * rescan reads: the current key-rotation epoch and membership in the
 * on-chain device entry set.
 */
export type DeviceLedgerState = {
  readonly device_epoch: bigint;
  readonly devices: { member: (entry: Uint8Array) => boolean };
};

export type ResolveUseCounterProps = {
  ledgerState: DeviceLedgerState;
  authoriser: PassportAuthoriser;
  address: AccAddress;
  /** Counter the device last knew about; the probe starts here. */
  knownUseCounter?: UseCounter;
};

/** A device entry confirmed to be live in the on-chain device set. */
export type ResolvedDeviceEntry = {
  useCounter: UseCounter;
  commitmentHex: DeviceCommitmentHex;
};

type ProbeWindowProps = {
  ledgerState: DeviceLedgerState;
  authoriser: PassportAuthoriser;
  address: AccAddress;
  epoch: DeviceEpoch;
  /** Candidate counters to probe, as the half-open range [from, to). */
  from: bigint;
  to: bigint;
};

const isLiveEntry = (
  ledgerState: DeviceLedgerState,
  commitmentHex: DeviceCommitmentHex,
): boolean =>
  ledgerState.devices.member(ByteArray.fromHex(HexBytes(commitmentHex)));

const probeInBatches = async (
  deviceCommitments: NonNullable<PassportAuthoriser['deviceCommitments']>,
  { ledgerState, address, epoch, from, to }: ProbeWindowProps,
): Promise<ResolvedDeviceEntry | undefined> => {
  for (let chunkStart = from; chunkStart < to; chunkStart += RESCAN_CHUNK) {
    const counters: UseCounter[] = [];
    const chunkEnd =
      chunkStart + RESCAN_CHUNK < to ? chunkStart + RESCAN_CHUNK : to;
    for (let candidate = chunkStart; candidate < chunkEnd; candidate++) {
      counters.push(UseCounter(candidate));
    }
    const commitments = await deviceCommitments(address, epoch, counters);
    for (const [index, useCounter] of counters.entries()) {
      const commitmentHex = commitments[index];
      if (isLiveEntry(ledgerState, commitmentHex)) {
        return { useCounter, commitmentHex };
      }
    }
  }
  return undefined;
};

const probeOneByOne = async ({
  ledgerState,
  authoriser,
  address,
  epoch,
  from,
  to,
}: ProbeWindowProps): Promise<ResolvedDeviceEntry | undefined> => {
  for (let candidate = from; candidate < to; candidate++) {
    const useCounter = UseCounter(candidate);
    const commitmentHex = await authoriser.deviceCommitment(
      address,
      epoch,
      useCounter,
    );
    if (isLiveEntry(ledgerState, commitmentHex)) {
      return { useCounter, commitmentHex };
    }
  }
  return undefined;
};

const probeWindow = async (
  props: ProbeWindowProps,
): Promise<ResolvedDeviceEntry | undefined> => {
  const { deviceCommitments } = props.authoriser;
  return deviceCommitments
    ? probeInBatches(deviceCommitments, props)
    : probeOneByOne(props);
};

/**
 * Recovers the device's current use counter from chain. The Account
 * Custody Contract stores one rolling entry per device, positioned at the
 * counter of its next authorisation, so the local counter can fall behind
 * after out-of-band calls or lost state. Candidate counters are probed
 * from the last known value (0 when unknown): the commitment computed for
 * each candidate is tested for membership in the on-chain device set, and
 * the first live entry wins. That window ends after RESCAN_LIMIT
 * candidates, and only then are the counters below the anchor probed,
 * from 0 up to it: a device removed and re-enrolled gets a fresh entry at
 * a low counter while the persisted anchor still holds the old high one,
 * and without the second pass such a device reads as revoked. A device
 * with no entry in either pass is not registered on the account, has been
 * revoked, or holds a counter beyond the probed window (a synced passkey
 * used heavily on another device can outrun RESCAN_LIMIT between
 * sign-ins here); the miss raises DeviceEntryNotFoundError, which names
 * that ambiguity. An authoriser exposing deviceCommitments is probed in
 * RESCAN_CHUNK batches so one key ceremony covers a whole chunk of
 * candidates; otherwise each candidate costs one deviceCommitment call.
 */
export const resolveUseCounter = async ({
  ledgerState,
  authoriser,
  address,
  knownUseCounter,
}: ResolveUseCounterProps): Promise<ResolvedDeviceEntry> => {
  const epoch = DeviceEpoch(ledgerState.device_epoch);
  const anchor: bigint = knownUseCounter ?? 0n;
  const probe = async (from: bigint, to: bigint) =>
    probeWindow({ ledgerState, authoriser, address, epoch, from, to });

  const ahead = await probe(anchor, anchor + RESCAN_LIMIT);
  if (ahead) return ahead;

  const behind = await probe(0n, anchor);
  if (behind) return behind;

  throw new DeviceEntryNotFoundError(
    `No live device entry on the ledger within ${RESCAN_LIMIT} counters of the last known one (${anchor}), nor below it; the device is not registered on this account, or its counter has moved beyond the probed window.`,
  );
};
