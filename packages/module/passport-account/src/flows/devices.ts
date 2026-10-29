import {
  AccAddress,
  LastDeviceError,
  NotAuthorisedError,
  RemovalTargetNotFoundError,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import {
  ADD_DEVICE_CIRCUIT,
  REMOVE_DEVICE_CIRCUIT,
} from '../acc/device-circuits';
import { assertJoiningDevice } from '../acc/device-readers';
import { readGrants } from '../acc/read-grants';

import {
  isNotAuthorisedAbort,
  readAccountLedger,
  UNKNOWN_ENTRY_ABORT,
} from './account-call';
import { inKeySession } from './key-session';
import {
  assertHoldsRosterAuthority,
  assertMaintenanceSigner,
  followRosterAuthority,
} from './maintenance';
import {
  callChain,
  liveDeviceEntries,
  readAccountInbox,
  readLocalDevice,
  rotateEncKey,
  sealViews,
  viewCapability,
} from './rotation';
import {
  completedRecord,
  liveStoredReadGrants,
  retainStoredGrants,
  withSealedViews,
} from './stored-grants';

import type { AccountLedger } from './account-call';
import type { CallChain, LocalDevice, RotatedEncKey } from './rotation';
import type { AccountCallInput, FlowContext, StoredGrants } from './types';
import type { Ledger } from '../acc/acc-module';
import type {
  AccountKeyring,
  DeviceReader,
  PassportAccountInfo,
  PassportDevice,
} from '@lace-contract/passport';

/**
 * Contract aborts meaning the removal would leave the account without an
 * authorising device: the caller rule and the redundant count floor.
 */
const LAST_DEVICE_ABORTS = [
  'failed assert: cannot remove the authorising device',
  'failed assert: cannot remove last device',
];

/** What a device call reads from the account state the caller acted on. */
export type DeviceCallInput = AccountCallInput & {
  /** Entry commitment of the device the call targets. */
  commitmentHex: string;
};

/**
 * What an enrolment carries beyond the entry: the joining device's reader
 * and device keys, when the account keys are to be delivered to it.
 */
export type AddDeviceInput = DeviceCallInput & { reader?: DeviceReader };

/**
 * What an accepted device call leaves behind: the roster as the chain now
 * holds it, with this device's row on its successor entry, and the
 * advanced use counter that entry sits at. A removal also names the
 * `enc_key` the rotation it ran stepped to, as 32-byte lowercase hex, and
 * the live device entries whose devices got no new key because their
 * registrations conflict, which need to be enrolled again.
 */
export type DeviceRoster = {
  devices: PassportDevice[];
  localUseCounter: string;
  encKey?: string;
  droppedDevices?: string[];
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
  if (isNotAuthorisedAbort(message)) {
    return new NotAuthorisedError(message);
  }
  return error;
};

/**
 * Whether any read grant of the account is live: its grantees hold the
 * live account secret, so a device handed the keys while one is live
 * gets a fresh secret first.
 */
const hasLiveReadGrant = (ledgerState: Ledger): boolean =>
  readGrants(ledgerState).some(record => record.active && record.scope.read);

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

/** A device's entry as the call that targets it takes it. */
const entryArgument = (commitmentHex: string): Uint8Array =>
  ByteArray.fromHex(HexBytes(commitmentHex.toLowerCase()));

/**
 * This device's keyring over the ledger the chain is at: the live secret
 * and the earlier ones its envelopes deliver.
 */
const keyringAt = (
  account: PassportAccountInfo,
  chain: CallChain,
  local: LocalDevice,
): AccountKeyring =>
  readAccountInbox(
    account.address,
    chain.position().ledgerState,
    local.readerPublicKey,
  ).keyring;

/** The counter the chain left this device at, or the one it started from. */
const chainCounter = (chain: CallChain, input: DeviceCallInput): string =>
  chain.position().localUseCounter ?? input.localUseCounter ?? '0';

type DeviceSession = {
  /**
   * The grant bookkeeping the record keeps, narrowed to the grants whose
   * kept fields open what the chain holds under their id.
   */
  grants: StoredGrants | undefined;
  chain: CallChain;
  /**
   * Replaces the grant bookkeeping the record keeps and persists it with
   * the counter the chain is at; every later call keeps it too.
   */
  keep: (grants: StoredGrants | undefined) => Promise<void>;
};

/**
 * Opens what a device flow runs on inside its key session: the grant
 * bookkeeping of the record, read where it costs no extra prompt so every
 * write keeps it, and a chain of gated calls from the ledger read ahead
 * of the session, each persisting the counter it advanced this device to
 * before the next call. The bookkeeping is checked against the ledger
 * first, so an entry that does not open the grant the chain holds under
 * its id, as one an issue wrote before a call that never landed, is
 * neither re-sealed to nor kept.
 */
const openDeviceSession = async (
  input: DeviceCallInput,
  { ledgerState, indexer }: AccountLedger,
  { seams, accountRecords, onProgress }: FlowContext,
): Promise<DeviceSession> => {
  const { account, devices, localUseCounter } = input;
  const record = await accountRecords.read();
  let grants = await retainStoredGrants(
    record?.grants,
    readGrants(ledgerState),
    account.address,
  );
  const write = async (counter: string): Promise<void> =>
    accountRecords.write(completedRecord(account, counter, { grants }));
  const chain = callChain({
    account,
    start: { ledgerState, localUseCounter, devices },
    indexer,
    seams,
    onProgress,
    onAdvanced: write,
  });
  return {
    grants,
    chain,
    keep: async next => {
      grants = next;
      await write(chainCounter(chain, input));
    },
  };
};

/**
 * Enrols a new device key on the account. `commitmentHex` carries the new
 * device's entry commitment, derived out of band by the joining device;
 * the local device authorises `add_device_with_jubjub` through the
 * gated-call pattern. The roster gains the commitment on success only,
 * marked as remote, and the same result moves the local device's own row
 * to the successor entry the call left it on, so the roster and the use
 * counter never disagree about where this device stands.
 *
 * When `reader` names the joining device's reader and device keys, the
 * account keys are delivered to it in the same session: its device key
 * must derive the enrolled commitment at use counter 0 and its reader key
 * must be one the account seals to, both checked before any prompt. The
 * encryption key seals the live secret and the roster key to the reader
 * key, and the envelope and the device's registration under the roster
 * key are appended to the inbox, one gated call each, ahead of the
 * enrolment, so an enrolment that lands never leaves the device without
 * its keys; until it lands the registration names no live entry and a
 * rotation passes over it. While any read grant is live its grantees
 * hold the live secret, and one could seal it to the joining reader with
 * a roster key of its own ahead of the genuine envelope, so the account
 * keys are rotated first in the same session, with a fresh roster key,
 * as a removal rotates them, the joining device handed the new secret no
 * grantee has seen, and the live read grants this client holds the read
 * key of sealed it after; with no live read grant only enrolled devices
 * hold the secret, and the live keys are handed over as they are. A
 * rotation moves the maintenance authority of an unlocked account to the
 * one the new roster key derives before the keys are handed over, so the
 * joining device can sign maintenance updates once enrolled; an
 * encryption key that cannot sign them refuses such an enrolment with
 * MaintenanceUpdateRefusedError before any prompt, and a device none of
 * whose roster keys derives the authority on chain refuses it with
 * MaintenanceAuthorityMismatchError inside the session, before the
 * rotation. The
 * joining device then signs in and reads the holdings with its own
 * passkey alone. Without `reader` the
 * device can authorise but reads nothing until some device delivers it
 * the keys.
 *
 * The advanced counter is persisted to the account record after every
 * call, before the roster is returned, so the next flow rescans from a
 * fresh anchor. A failure leaves the roster unreturned.
 *
 * A rejected authorisation (bad signature, malformed key, or a caller
 * entry the on-chain set no longer holds) rejects with NotAuthorisedError;
 * a record whose address holds no live contract rejects with
 * AccountContractMissingError; joining keys that do not match the entry
 * reject with DeviceReaderInvalidError. The transactions' proving and
 * sponsoring stages and 'recording' are reported through `onProgress`.
 */
export const addDevice = async (
  { reader, ...input }: AddDeviceInput,
  context: FlowContext,
): Promise<DeviceRoster> => {
  const { seams, onProgress } = context;
  const { account, commitmentHex } = input;
  const { networkId } = seams.passportNetwork;
  try {
    const ledger = await readAccountLedger(
      account.address,
      seams.passportNetwork,
    );
    if (reader) {
      assertJoiningDevice(
        { address: account.address, epoch: ledger.ledgerState.device_epoch },
        reader,
        commitmentHex,
      );
    }
    const view =
      reader && hasLiveReadGrant(ledger.ledgerState)
        ? viewCapability(seams.passportEncryptionKey)
        : undefined;
    const devices = view ? liveDeviceEntries(ledger.ledgerState) : undefined;
    if (view) {
      await assertMaintenanceSigner({
        address: account.address,
        indexer: ledger.indexer,
        encryptionKey: seams.passportEncryptionKey,
      });
    }
    return await inKeySession(
      seams.passportAuthoriser,
      {
        kind: 'add-device',
        commitmentHex,
        account: AccAddress(account.address),
        ...(reader ? { reader } : {}),
        ...(devices ? { devices } : {}),
      },
      async () => {
        const { grants, chain, keep } = await openDeviceSession(
          input,
          ledger,
          context,
        );
        let rotated: RotatedEncKey | undefined;
        if (reader) {
          const local = await readLocalDevice(seams);
          if (view && devices) {
            await assertHoldsRosterAuthority({
              address: account.address,
              seams,
              indexer: ledger.indexer,
              keyring: keyringAt(account, chain, local),
            });
            rotated = await rotateEncKey({
              account,
              encryptionKey: seams.passportEncryptionKey,
              view,
              local,
              chain,
              indexer: ledger.indexer,
              networkId,
              onProgress,
              devices,
              rotateRoster: true,
            });
            await followRosterAuthority({
              address: account.address,
              seams,
              keyring: keyringAt(account, chain, local),
              authority: rotated.authority,
              onProgress,
            });
          }
          const delivery = await seams.passportEncryptionKey.sealToDevice(
            networkId,
            rotated?.keyring ?? keyringAt(account, chain, local),
            {
              ...reader,
              epoch: ledger.ledgerState.device_epoch,
              counter: 0n,
            },
          );
          await chain.append('recording', [
            delivery.envelope,
            delivery.registration,
          ]);
          if (view && rotated) {
            const views = await sealViews({
              view,
              networkId,
              keyring: rotated.keyring,
              account: AccAddress(account.address),
              targets: liveStoredReadGrants(
                grants,
                readGrants(chain.position().ledgerState),
              ),
            });
            await keep(withSealedViews(grants, views));
            await chain.append('recording', views.entries);
          }
        }
        await chain.submit({
          circuit: ADD_DEVICE_CIRCUIT,
          args: [entryArgument(commitmentHex)],
        });
        return {
          devices: withDevice(chain.position().devices, commitmentHex),
          localUseCounter: chainCounter(chain, input),
          ...(rotated
            ? {
                encKey: HexBytes.fromByteArray(rotated.encKey),
                droppedDevices: rotated.dropped,
              }
            : {}),
        };
      },
    );
  } catch (error) {
    throw classifyContractAbort(error, ADD_DEVICE_CIRCUIT);
  }
};

/**
 * Refuses a removal the contract would refuse before any prompt: a
 * target the on-chain device set does not hold, and the local device,
 * which cannot remove itself. The rotation a removal runs comes first,
 * so a removal refused only after it would have cost the target device
 * its keys for nothing.
 *
 * @throws {@link RemovalTargetNotFoundError} when the target is gone.
 * @throws {@link LastDeviceError} when the target is this device.
 */
const assertRemovable = (
  { devices, commitmentHex }: DeviceCallInput,
  { ledgerState }: AccountLedger,
): void => {
  if (!ledgerState.devices.member(entryArgument(commitmentHex))) {
    throw new RemovalTargetNotFoundError(
      `The account holds no device entry ${commitmentHex}.`,
    );
  }
  const local = devices.find(device => device.isLocal);
  if (local?.commitmentHex.toLowerCase() === commitmentHex.toLowerCase()) {
    throw new LastDeviceError(
      'The device that authorises a removal cannot remove itself.',
    );
  }
};

/**
 * Revokes a device key from the account and rotates the account keys so
 * the removed device reads nothing newer. `commitmentHex` names the
 * target by its current entry commitment, which is the literal set
 * element the contract removes; the local device authorises
 * `remove_device_with_jubjub` through the gated-call pattern.
 *
 * Ahead of the removal, in the same session, the encryption key is
 * rotated with a fresh roster key and sealed only to this device and to
 * the registered devices whose device key derives a live entry other
 * than the target, which the key session names to the user before it
 * opens; the live holdings are re-encrypted towards it, and it is sealed
 * again to every live read grant this client holds the read key of, each
 * seal kept on chain in a grant record. The removed device's envelopes
 * stay in the inbox and keep opening the secrets they held, but none
 * opens the new one, and the registrations under the old roster key no
 * longer count, any it planted for itself included. Once `enc_key` is
 * replaced, and before the removal, the maintenance authority of an
 * unlocked account is moved to the one the new roster key derives, so
 * the removed device loses its upgrade rights; a locked account has no
 * authority to move. An encryption key that cannot sign maintenance
 * updates refuses the removal of a device from an unlocked account with
 * MaintenanceUpdateRefusedError before any prompt, and a device none of
 * whose roster keys derives the authority on chain refuses it with
 * MaintenanceAuthorityMismatchError inside the session, before the
 * rotation, so nothing is submitted. A roster in which
 * two readers claim one live device, or one reader two, refuses with
 * DeviceRosterInvalidError rather than guess.
 *
 * The roster drops the commitment on success only, and the same result
 * moves the local device's own row to the successor entry the call left
 * it on. The advanced counter is persisted to the account record after
 * every call. The contract's own guards surface as typed errors: a
 * removal that would strand the account (the authorising device, or the
 * count floor) rejects with LastDeviceError, a rejected authorisation
 * (bad signature or malformed key) with NotAuthorisedError, and a target
 * entry that is no longer in the on-chain set with
 * RemovalTargetNotFoundError; the target's presence and the local device
 * are checked before any prompt, and an encryption key that cannot
 * rotate refuses with ReadUnavailableError before any prompt too. The
 * rotation's stages, 'recording' and the transactions' proving and
 * sponsoring are reported through `onProgress`.
 */
export const removeDevice = async (
  input: DeviceCallInput,
  context: FlowContext,
): Promise<DeviceRoster> => {
  const { seams, onProgress } = context;
  const { account, commitmentHex } = input;
  const { networkId } = seams.passportNetwork;
  try {
    const view = viewCapability(seams.passportEncryptionKey);
    const ledger = await readAccountLedger(
      account.address,
      seams.passportNetwork,
    );
    assertRemovable(input, ledger);
    const devices = liveDeviceEntries(ledger.ledgerState, commitmentHex);
    await assertMaintenanceSigner({
      address: account.address,
      indexer: ledger.indexer,
      encryptionKey: seams.passportEncryptionKey,
    });
    return await inKeySession(
      seams.passportAuthoriser,
      {
        kind: 'remove-device',
        commitmentHex,
        account: AccAddress(account.address),
        devices,
      },
      async () => {
        const { grants, chain, keep } = await openDeviceSession(
          input,
          ledger,
          context,
        );
        const local = await readLocalDevice(seams);
        await assertHoldsRosterAuthority({
          address: account.address,
          seams,
          indexer: ledger.indexer,
          keyring: keyringAt(account, chain, local),
        });
        const rotated = await rotateEncKey({
          account,
          encryptionKey: seams.passportEncryptionKey,
          view,
          local,
          chain,
          indexer: ledger.indexer,
          networkId,
          onProgress,
          devices,
          rotateRoster: true,
          target: commitmentHex.toLowerCase(),
        });
        await followRosterAuthority({
          address: account.address,
          seams,
          keyring: keyringAt(account, chain, local),
          authority: rotated.authority,
          onProgress,
        });
        const views = await sealViews({
          view,
          networkId,
          keyring: rotated.keyring,
          account: AccAddress(account.address),
          targets: liveStoredReadGrants(
            grants,
            readGrants(chain.position().ledgerState),
          ),
        });
        await keep(withSealedViews(grants, views));
        await chain.append('recording', views.entries);
        await chain.submit({
          circuit: REMOVE_DEVICE_CIRCUIT,
          args: [entryArgument(commitmentHex)],
        });
        return {
          devices: withoutDevice(chain.position().devices, commitmentHex),
          localUseCounter: chainCounter(chain, input),
          encKey: HexBytes.fromByteArray(rotated.encKey),
          droppedDevices: rotated.dropped,
        };
      },
    );
  } catch (error) {
    throw classifyContractAbort(error, REMOVE_DEVICE_CIRCUIT);
  }
};
