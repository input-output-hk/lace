import {
  AccAddress,
  AccountContractMissingError,
  DeviceEpoch,
  LastDeviceError,
  NotAuthorisedError,
  RemovalTargetNotFoundError,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { ledger } from '../acc/acc-module';
import { connectAccountHandle, executeGatedCall } from '../acc/gated-call';
import { createIndexerClient } from '../infra/indexer';
import { createMidnightProviders } from '../infra/providers';

import { inKeySession } from './key-session';

import type { FlowContext } from './types';
import type {
  PassportAccountInfo,
  PassportDevice,
} from '@lace-contract/passport';

const ADD_DEVICE_CIRCUIT = 'add_device_with_jubjub';
const REMOVE_DEVICE_CIRCUIT = 'remove_device_with_jubjub';

/**
 * Contract aborts meaning the removal would leave the account without an
 * authorising device: the caller rule and the redundant count floor.
 */
const LAST_DEVICE_ABORTS = [
  'failed assert: cannot remove the authorising device',
  'failed assert: cannot remove last device',
];

/** Contract aborts meaning the authorising key was rejected. */
const NOT_AUTHORISED_ABORTS = [
  'failed assert: invalid signature',
  'failed assert: device key',
];

/**
 * Raised by the caller checks in require_authorised and by the target
 * check in _do_remove_device: the same string for two different failures.
 */
const UNKNOWN_ENTRY_ABORT = 'failed assert: unknown device entry';

/** What a device call reads from the account state the caller acted on. */
export type DeviceCallInput = {
  /** Entry commitment of the device the call targets. */
  commitmentHex: string;
  account: PassportAccountInfo;
  devices: PassportDevice[];
  /** Counter this device last knew about; undefined rescans from zero. */
  localUseCounter: string | undefined;
};

/**
 * What an accepted device call leaves behind: the roster as the chain now
 * holds it, with this device's row on its successor entry, and the
 * advanced use counter that entry sits at.
 */
export type DeviceRoster = {
  devices: PassportDevice[];
  localUseCounter: string;
};

type DeviceCallConfig = {
  /** Gated circuit the call targets. */
  circuit: string;
  /** Device roster after the call is accepted on chain. */
  nextDevices: (
    devices: PassportDevice[],
    commitmentHex: string,
  ) => PassportDevice[];
};

/** What the local device holds once the contract accepted the call. */
type AcceptedDeviceCall = {
  advancedCounter: UseCounter;
  localCommitmentHex: string;
};

/**
 * Types a raw contract abort by the assert message the Account Custody
 * Contract raises; anything unrecognised passes through unchanged.
 * An unknown-entry abort on the remove circuit is attributed to the
 * removal target, not the caller: the circuit checks the caller first,
 * and the caller's entry was resolved against live ledger state inside
 * the same gate, so only a mid-flight roll of the caller's own entry
 * could produce it, while a stale target commitment always does.
 */
const classifyContractAbort = (error: unknown, circuit: string): unknown => {
  const message = error instanceof Error ? error.message : String(error);
  if (LAST_DEVICE_ABORTS.some(abort => message.includes(abort))) {
    return new LastDeviceError(message);
  }
  if (message.includes(UNKNOWN_ENTRY_ABORT)) {
    return circuit === REMOVE_DEVICE_CIRCUIT
      ? new RemovalTargetNotFoundError(message)
      : new NotAuthorisedError(message);
  }
  if (NOT_AUTHORISED_ABORTS.some(abort => message.includes(abort))) {
    return new NotAuthorisedError(message);
  }
  return error;
};

/** The devices list with the enrolled commitment appended. */
const withDevice = (
  devices: PassportDevice[],
  commitmentHex: string,
): PassportDevice[] => [...devices, { commitmentHex, isLocal: false }];

/** The devices list with the revoked commitment dropped. */
const withoutDevice = (
  devices: PassportDevice[],
  commitmentHex: string,
): PassportDevice[] =>
  devices.filter(device => device.commitmentHex !== commitmentHex);

/**
 * The devices list with the local device's row moved to the commitment it
 * holds after an accepted call. An entry is single use: the call consumed
 * the one the row carried and the contract inserted its successor, so
 * leaving the row as it was would name an entry the on-chain set no
 * longer holds. Only existing rows are rewritten, so a removal that
 * dropped the local row does not resurrect it.
 */
const withRefreshedLocalDevice = (
  devices: PassportDevice[],
  commitmentHex: string,
): PassportDevice[] =>
  devices.map(device =>
    device.isLocal ? { ...device, commitmentHex } : device,
  );

/**
 * Submits one gated device call and reports the position it left the local
 * device in. The successor commitment is computed against the epoch read
 * before the call, which is the epoch the accepted call ran under: a gated
 * call never changes device_epoch (it is only written at construction), so
 * the pre-call epoch names the very entry the contract inserted.
 */
const runGatedDeviceCall = async (
  circuit: string,
  { commitmentHex, account, localUseCounter }: DeviceCallInput,
  { seams }: FlowContext,
): Promise<AcceptedDeviceCall> => {
  const entry = ByteArray.fromHex(HexBytes(commitmentHex));
  const {
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  } = seams;
  const indexer = createIndexerClient({
    indexerUrl: passportNetwork.indexerUrl,
    indexerWsUrl: passportNetwork.indexerWsUrl,
  });
  const state = await indexer.queryContractState(account.address);
  if (!state) {
    throw new AccountContractMissingError(
      `No live Account Custody Contract found at ${account.address}.`,
    );
  }
  const providers = await createMidnightProviders({
    network: passportNetwork,
    prover: passportProver,
    sponsor: passportSponsor,
  });
  const handle = await connectAccountHandle(providers, account.address);
  const address = AccAddress(account.address);
  const ledgerState = ledger(state.data);
  const advancedCounter = await executeGatedCall({
    handle,
    authoriser: passportAuthoriser,
    circuit,
    args: [entry],
    address,
    ledgerState,
    knownUseCounter:
      localUseCounter === undefined
        ? undefined
        : UseCounter(BigInt(localUseCounter)),
  });
  return {
    advancedCounter,
    localCommitmentHex: await passportAuthoriser.deviceCommitment(
      address,
      DeviceEpoch(ledgerState.device_epoch),
      advancedCounter,
    ),
  };
};

/**
 * Runs one gated device call inside a single key session, so the
 * use-counter rescan and the authorisation cost one ceremony rather than
 * one per authoriser call. The advanced counter is persisted to the
 * account record before the roster is returned, so a caller never
 * publishes a roster ahead of the record that anchors the next rescan.
 * The contract's own aborts surface as typed errors; anything else, and
 * a failing on-chain status in particular, rejects unchanged with nothing
 * written.
 */
const runDeviceCall = async (
  { circuit, nextDevices }: DeviceCallConfig,
  input: DeviceCallInput,
  context: FlowContext,
): Promise<DeviceRoster> => {
  const { commitmentHex, account, devices } = input;
  const { seams, accountRecords } = context;
  try {
    return await inKeySession(seams.passportAuthoriser, async () => {
      const { advancedCounter, localCommitmentHex } = await runGatedDeviceCall(
        circuit,
        input,
        context,
      );
      const localUseCounter = advancedCounter.toString();
      await accountRecords.write({
        address: account.address,
        bindingVersion: account.bindingVersion,
        localUseCounter,
      });
      return {
        devices: withRefreshedLocalDevice(
          nextDevices(devices, commitmentHex),
          localCommitmentHex,
        ),
        localUseCounter,
      };
    });
  } catch (error) {
    throw classifyContractAbort(error, circuit);
  }
};

/**
 * Enrols a new device key on the account. `commitmentHex` carries the new
 * device's entry commitment, derived out of band by the joining device;
 * the local device authorises `add_device_with_jubjub` through the
 * gated-call pattern. The roster gains the commitment on success only,
 * marked as remote, and the same result moves the local device's own row
 * to the successor entry the call left it on, so the roster and the use
 * counter never disagree about where this device stands. The advanced
 * counter is persisted to the account record before the roster is
 * returned, so the next flow rescans from a fresh anchor. A failure leaves
 * nothing changed: the roster is not returned and the record is not
 * written.
 *
 * A rejected authorisation (bad signature, malformed key, or a caller
 * entry the on-chain set no longer holds) rejects with NotAuthorisedError;
 * a record whose address holds no live contract rejects with
 * AccountContractMissingError.
 *
 * addDevice reports no intermediate stage: the rescan, the proof and the
 * submission all settle before there is anything to report, so the
 * providers are created without a stage sink. Wiring one in is a product
 * decision, not an omission.
 */
export const addDevice = async (
  input: DeviceCallInput,
  context: FlowContext,
): Promise<DeviceRoster> =>
  runDeviceCall(
    { circuit: ADD_DEVICE_CIRCUIT, nextDevices: withDevice },
    input,
    context,
  );

/**
 * Revokes a device key from the account. `commitmentHex` names the target
 * by its current entry commitment, which is the literal set element the
 * contract removes; the local device authorises `remove_device_with_jubjub`
 * through the gated-call pattern. The roster drops the commitment on
 * success only, and the same result moves the local device's own row to
 * the successor entry the call left it on; a removal that dropped the
 * local row leaves it dropped. The advanced counter is persisted to the
 * account record before the roster is returned. A failure leaves nothing
 * changed.
 *
 * The contract's own guards surface as typed errors: a removal that would
 * strand the account (the authorising device, or the count floor) rejects
 * with LastDeviceError, a rejected authorisation (bad signature or
 * malformed key) with NotAuthorisedError, and a target entry that is no
 * longer in the on-chain set with RemovalTargetNotFoundError.
 *
 * Reports no intermediate stage, for the same reason as {@link addDevice}.
 */
export const removeDevice = async (
  input: DeviceCallInput,
  context: FlowContext,
): Promise<DeviceRoster> =>
  runDeviceCall(
    { circuit: REMOVE_DEVICE_CIRCUIT, nextDevices: withoutDevice },
    input,
    context,
  );
