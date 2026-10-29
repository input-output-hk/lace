import {
  AccAddress,
  DeviceRosterInvalidError,
  GrantRevocationPendingError,
  GrantRosterUnsettledError,
  ReadUnavailableError,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { resolveLiveReaders } from '../acc/device-readers';
import {
  prepareAppendInbox,
  prepareRotateEncKey,
} from '../acc/enc-key-rotation';
import {
  deviceEnvelopes,
  encodeDevicePublicKey,
  isAddressedTo,
  isDeviceRegistration,
  MAX_DEVICE_ENTRIES,
} from '../acc/envelopes';
import { inboxEntries, walkInbox } from '../acc/inbox-walk';

import {
  queryAccountLedger,
  submitAccountCall,
  withRefreshedLocalDevice,
} from './account-call';

import type { FlowProgress, FlowStage } from './types';
import type { Ledger } from '../acc/acc-module';
import type { GrantCircuitCall } from '../acc/grants';
import type { IndexerClient } from '../infra/indexer';
import type {
  AccountKeyring,
  GrantId,
  LiveDeviceReader,
  MaintenanceVerifyingKey,
  RemovedDevice,
  PassportAccountInfo,
  PassportDependencies,
  PassportDevice,
  PassportEncryptionKey,
} from '@lace-contract/passport';

/**
 * How long an accepted call is given to show in the indexer's view of the
 * ledger, which can lag the block the call landed in.
 */
const LEDGER_POLL_ATTEMPTS = 30;
const LEDGER_POLL_DELAY_MS = 1000;

const sleep = async (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

/** The members of the encryption key that sharing the viewing secret needs. */
export type ViewCapability = Required<
  Pick<PassportEncryptionKey, 'reencryptInbox' | 'sealView'>
>;

/**
 * The encryption key's view members, which a rotation and a read grant's
 * issue need: the re-encryption a rotation moves the holdings through
 * and the sealing a grantee receives the secret by.
 *
 * @throws {@link ReadUnavailableError} when the key offers either not,
 * as a key that only opens entries does.
 */
export const viewCapability = (
  encryptionKey: PassportEncryptionKey,
): ViewCapability => {
  const { reencryptInbox, sealView } = encryptionKey;
  if (!reencryptInbox || !sealView) throw new ReadUnavailableError();
  return { reencryptInbox, sealView };
};

/**
 * This device as the account keys know it: the reader public key its
 * envelopes are sealed to, and its compressed device public key, which
 * pairs the two in the roster.
 */
export type LocalDevice = {
  readerPublicKey: Uint8Array;
  devicePublicKey: string;
};

/** Resolves this device's reader and device keys, inside the caller's key session. */
export const readLocalDevice = async ({
  passportAuthoriser,
  passportEncryptionKey,
  passportNetwork,
}: PassportDependencies): Promise<LocalDevice> => ({
  readerPublicKey: await passportEncryptionKey.readerPublicKey(
    passportNetwork.networkId,
  ),
  devicePublicKey: encodeDevicePublicKey(
    await passportAuthoriser.devicePublicKey(),
  ),
});

/**
 * The account's inbox as this device reads it: every entry in inbox
 * order, and the keyring of the ledger's `enc_key` with this device's
 * own envelopes, newest first.
 */
export type AccountInbox = { entries: Uint8Array[]; keyring: AccountKeyring };

/** Reads the inbox and this device's keyring of the account from its ledger. */
export const readAccountInbox = (
  account: string,
  ledgerState: Pick<Ledger, 'enc_key' | 'inbox_count' | 'inbox'>,
  readerPublicKey: Uint8Array,
): AccountInbox => {
  const entries = inboxEntries(ledgerState);
  return {
    entries,
    keyring: {
      account: AccAddress(account),
      encKey: ledgerState.enc_key,
      envelopes: deviceEnvelopes(entries, readerPublicKey),
    },
  };
};

/**
 * The device entries the ledger holds, as lowercase hex, less `except`:
 * the devices a rotation may seal the new secret to, which a key session
 * names to the user before it opens.
 *
 * @throws {@link DeviceRosterInvalidError} when there are more than
 * {@link MAX_DEVICE_ENTRIES}, which no signer would accept.
 */
export const liveDeviceEntries = (
  ledgerState: Pick<Ledger, 'devices'>,
  except?: string,
): string[] => {
  const entries = [...ledgerState.devices]
    .map(entry => HexBytes.fromByteArray(entry))
    .filter(entry => entry !== except?.toLowerCase());
  if (entries.length > MAX_DEVICE_ENTRIES) {
    throw new DeviceRosterInvalidError(
      `The account holds ${entries.length} device entries, more than the ${MAX_DEVICE_ENTRIES} a rotation names.`,
    );
  }
  return entries;
};

/**
 * Where a gated call runs from: the ledger state it binds, which must
 * hold the auth nonce the contract will consume, this device's counter
 * and the device roster as last seen.
 */
export type CallPosition = {
  ledgerState: Ledger;
  localUseCounter: string | undefined;
  devices: PassportDevice[];
};

/**
 * The ledger once the indexer reflects a call that advanced the auth
 * nonce past `authNonce`. A chain of gated calls must have each bind the
 * nonce the previous one left behind, which the indexer can serve a
 * moment late.
 *
 * @throws {@link GrantRosterUnsettledError} when the indexer never
 * reflects the call within the polling window.
 */
const awaitAdvancedLedger = async (
  indexer: IndexerClient,
  address: string,
  authNonce: bigint,
): Promise<Ledger> => {
  for (let attempt = 0; attempt < LEDGER_POLL_ATTEMPTS; attempt++) {
    const ledgerState = await queryAccountLedger(indexer, address);
    if (ledgerState.auth_nonce > authNonce) return ledgerState;
    await sleep(LEDGER_POLL_DELAY_MS);
  }
  throw new GrantRosterUnsettledError(
    `The ledger of ${address} never reflected the accepted call.`,
  );
};

export type CallChainProps = {
  account: PassportAccountInfo;
  start: CallPosition;
  indexer: IndexerClient;
  seams: PassportDependencies;
  onProgress: FlowProgress;
  /** Told the counter each accepted call advanced this device to, so the record keeps up. */
  onAdvanced: (localUseCounter: string) => Promise<void>;
};

/**
 * Gated calls submitted one after another in the caller's key session:
 * `submit` runs one from the position the last left, and `append` writes
 * inbox entries, one call each, entering `stage` first when there is any.
 */
export type CallChain = {
  submit: (call: GrantCircuitCall) => Promise<void>;
  append: (stage: FlowStage, entries: readonly Uint8Array[]) => Promise<void>;
  position: () => CallPosition;
};

/**
 * Starts a chain of gated calls at `start`. Each accepted call reports
 * the counter it advanced this device to, then waits for the indexer to
 * reflect it, so the next call binds the auth nonce it left; the local
 * roster row follows the entry each call leaves it on.
 */
export const callChain = ({
  account,
  start,
  indexer,
  seams,
  onProgress,
  onAdvanced,
}: CallChainProps): CallChain => {
  let current = start;
  const submit = async (call: GrantCircuitCall): Promise<void> => {
    const { advancedCounter, localCommitmentHex } = await submitAccountCall(
      {
        circuit: call.circuit,
        args: call.args,
        account,
        localUseCounter: current.localUseCounter,
        ledgerState: current.ledgerState,
        onStage: onProgress,
      },
      seams,
    );
    const localUseCounter = advancedCounter.toString();
    await onAdvanced(localUseCounter);
    current = {
      ledgerState: await awaitAdvancedLedger(
        indexer,
        account.address,
        current.ledgerState.auth_nonce,
      ),
      localUseCounter,
      devices: withRefreshedLocalDevice(current.devices, localCommitmentHex),
    };
  };
  return {
    submit,
    append: async (stage, entries) => {
      if (entries.length > 0) onProgress(stage);
      for (const entry of entries) {
        await submit(prepareAppendInbox(entry));
      }
    },
    position: () => current,
  };
};

export type RotateEncKeyProps = {
  account: PassportAccountInfo;
  encryptionKey: PassportEncryptionKey;
  view: ViewCapability;
  local: LocalDevice;
  chain: CallChain;
  indexer: IndexerClient;
  networkId: string;
  onProgress: FlowProgress;
  /**
   * The device entries, as lowercase hex, whose devices may keep reading:
   * the live ones the key session named, a device being removed left out.
   */
  devices: readonly string[];
  /** Whether the roster key is drawn fresh too, as a removal needs. */
  rotateRoster?: boolean;
  /** The entry a removal takes out, as lowercase hex. */
  target?: string;
};

/** The registrations of an inbox, by hex. */
const registrationsOf = (entries: readonly Uint8Array[]): Set<string> =>
  new Set(
    entries
      .filter(isDeviceRegistration)
      .map(entry => HexBytes.fromByteArray(entry)),
  );

/**
 * Who a rotation seals the new secret to, beside this device: `readers`,
 * the registered devices enrolled now whose live entry is among the
 * entries the key session named; `dropped`, the named entries whose
 * registrations conflict or that have none, which get no new key; and
 * `removed`, the
 * registration of the device a removal takes out, when it has one.
 */
type SealedRoster = {
  readers: LiveDeviceReader[];
  dropped: string[];
  removed?: RemovedDevice;
};

/**
 * The roster a rotation seals to: the registrations the live roster key
 * opens, resolved against the ledger's device set so only a registration
 * whose device key derives a live entry counts, and only one whose entry
 * is among `devices`. A registration naming nobody's live device is
 * passed over, and named devices left without a reader, by a conflict or
 * for want of a registration, are reported dropped, see
 * {@link resolveLiveReaders}; this device, sealed to regardless, is never
 * reported dropped. The registration whose live entry is `target`, the
 * entry a removal takes out, is named so no reader paired with its device
 * is sealed to.
 */
const sealedRoster = async ({
  account,
  encryptionKey,
  networkId,
  local,
  ledgerState,
  inbox,
  devices,
  target,
  localEntry,
}: {
  account: PassportAccountInfo;
  encryptionKey: PassportEncryptionKey;
  networkId: string;
  local: LocalDevice;
  ledgerState: Ledger;
  inbox: AccountInbox;
  devices: readonly string[];
  target: string | undefined;
  localEntry: string | undefined;
}): Promise<SealedRoster> => {
  const registered = (
    await encryptionKey.openInbox(
      networkId,
      inbox.keyring,
      inbox.entries.filter(isDeviceRegistration),
    )
  ).flatMap(opened => (opened?.kind === 'device' ? [opened.device] : []));
  const self = HexBytes.fromByteArray(local.readerPublicKey);
  const { readers, dropped, outside } = resolveLiveReaders({
    scope: { address: account.address, epoch: ledgerState.device_epoch },
    registered,
    isLive: entryHex =>
      ledgerState.devices.member(ByteArray.fromHex(HexBytes(entryHex))),
    allowed: new Set(devices),
    target,
  });
  const removed = outside.find(({ entryHex }) => entryHex === target);
  return {
    readers: readers
      .filter(({ reader }) => reader.readerPublicKey !== self)
      .map(({ reader }) => reader),
    dropped: dropped.filter(entry => entry !== localEntry),
    ...(removed
      ? {
          removed: {
            devicePublicKey: removed.reader.devicePublicKey,
            epoch: removed.reader.epoch,
            counter: removed.reader.counter,
          },
        }
      : {}),
  };
};

/**
 * What a rotation leaves behind: the new `enc_key`, this device's keyring
 * of it, the live device entries whose devices got no new key because
 * their registrations conflict, as lowercase hex, which need to be
 * enrolled again, and the maintenance authority the delivered roster key
 * derives, a new one when the roster key was drawn fresh.
 */
export type RotatedEncKey = {
  encKey: Uint8Array;
  keyring: AccountKeyring;
  dropped: string[];
  authority: MaintenanceVerifyingKey;
};

/**
 * Rotates the account encryption key to a fresh random secret and
 * re-encrypts every live holding towards it, as the scoped grants
 * standard requires before a read grant is issued and after one is
 * revoked, and as a device removal requires so the removed device reads
 * nothing newer. The holdings are walked with the keyring of the ledger's
 * `enc_key` from the position the chain is at, a keyring this device's
 * envelopes do not open rejecting with EncryptionKeyMismatchError before
 * anything is submitted. The encryption key draws the new secret and
 * seals it, with the roster key, to this device and to every registered
 * device that is enrolled now and among `devices`, and answers the
 * ciphertexts alone: one envelope per device and, when the roster key is
 * fresh, one registration each. Should any registration the live roster
 * key opens land while the rotation runs, as another device's enrolment
 * does, the rotation refuses with DeviceRosterInvalidError before
 * `enc_key` is replaced, so a device enrolled meanwhile is never left
 * without the new key; registrations that open under no roster key are
 * noise and do not stop it. Devices whose registrations conflict are
 * left out and reported in the result. The holdings are
 * re-encrypted towards the new key, the envelopes and registrations are
 * appended, `enc_key` is replaced through `rotate_enc_key_with_jubjub`,
 * and each re-encrypted holding is appended, one gated call each, all in
 * the key session the caller holds. The envelopes land ahead of the
 * rotation, so no device is left without the key the chain then holds;
 * a rotation interrupted after it leaves holdings under the previous
 * key, which every device still opens from its older envelopes and the
 * next rotation re-encrypts. The previous secret is never derived again
 * by anyone: entries sealed towards it stay readable to whoever held it,
 * and nothing newer is.
 */
export const rotateEncKey = async ({
  account,
  encryptionKey,
  view,
  local,
  chain,
  indexer,
  networkId,
  onProgress,
  devices,
  rotateRoster,
  target,
}: RotateEncKeyProps): Promise<RotatedEncKey> => {
  const { ledgerState } = chain.position();
  const inbox = readAccountInbox(
    account.address,
    ledgerState,
    local.readerPublicKey,
  );
  const { entries, keyring } = inbox;
  const { holdingEntries } = await walkInbox({
    address: account.address,
    ledgerState,
    indexer,
    openEntries: async coinEntries =>
      (
        await encryptionKey.openInbox(networkId, keyring, coinEntries)
      ).map(opened => (opened?.kind === 'coin' ? opened.coin : null)),
  });
  const { readers, dropped, removed } = await sealedRoster({
    account,
    encryptionKey,
    networkId,
    local,
    ledgerState,
    inbox,
    devices,
    target,
    localEntry: chain
      .position()
      .devices.find(device => device.isLocal)
      ?.commitmentHex.toLowerCase(),
  });
  const keys = await encryptionKey.createKeys(networkId, {
    devicePublicKey: local.devicePublicKey,
    keyring,
    registrations: entries.filter(isDeviceRegistration),
    readers,
    ...(rotateRoster === undefined ? {} : { rotateRoster }),
    ...(removed ? { removed } : {}),
  });
  const reencrypted = (
    await view.reencryptInbox(
      networkId,
      { keyring, to: keys.encKey },
      holdingEntries,
    )
  ).filter((entry): entry is Uint8Array => entry !== null);

  onProgress('rotating');
  for (const entry of [...keys.envelopes, ...keys.registrations]) {
    await chain.submit(prepareAppendInbox(entry));
  }
  const before = registrationsOf(entries);
  const appended = registrationsOf(keys.registrations);
  const landed = inboxEntries(chain.position().ledgerState).filter(
    entry =>
      isDeviceRegistration(entry) &&
      !before.has(HexBytes.fromByteArray(entry)) &&
      !appended.has(HexBytes.fromByteArray(entry)),
  );
  if (
    landed.length > 0 &&
    (await encryptionKey.openInbox(networkId, keyring, landed)).some(
      opened => opened?.kind === 'device',
    )
  ) {
    throw new DeviceRosterInvalidError(
      `Registrations landed in the inbox of ${account.address} while its keys rotated; rotate again.`,
    );
  }
  await chain.submit(prepareRotateEncKey(keys.encKey));
  await chain.append('reencrypting', reencrypted);
  return {
    encKey: keys.encKey,
    dropped,
    authority: keys.authority,
    keyring: {
      account: AccAddress(account.address),
      encKey: keys.encKey,
      envelopes: keys.envelopes.filter(envelope =>
        isAddressedTo(envelope, local.readerPublicKey),
      ),
    },
  };
};

/** A read grant a live secret is sealed to: its id and its grantee's read key. */
export type ViewTarget = { grantId: GrantId; readPublicKey: string };

/** A read grant's seal of the live secret, as hex, with the `enc_key` it holds. */
export type SealedView = ViewTarget & { seal: string; sealedEncKey: string };

/**
 * What sealing the live secret to read grants left: the seals made, the
 * grants the key refused to seal to, apart from those it refused because
 * their revocation was signed but has not landed, listed in
 * `revocationPending`, and the grant records that keep the seals on
 * chain, to append.
 */
export type SealedViews = {
  sealed: SealedView[];
  unsealed: GrantId[];
  revocationPending: GrantId[];
  entries: Uint8Array[];
};

export type SealViewsProps = {
  view: ViewCapability;
  networkId: string;
  keyring: AccountKeyring;
  account: AccAddress;
  targets: readonly ViewTarget[];
};

/**
 * Seals the live secret of `keyring` to each read grant's read key, with
 * the grant record that keeps each seal on chain for this device. A
 * grant the key refuses to seal to, an expired key session included, is
 * listed unsealed rather than failing a rotation that already landed, or
 * as revocation pending when the key refuses it with
 * GrantRevocationPendingError.
 */
export const sealViews = async ({
  view,
  networkId,
  keyring,
  account,
  targets,
}: SealViewsProps): Promise<SealedViews> => {
  const sealedEncKey = HexBytes.fromByteArray(keyring.encKey);
  const result: SealedViews = {
    sealed: [],
    unsealed: [],
    revocationPending: [],
    entries: [],
  };
  for (const target of targets) {
    let refusal: unknown;
    const delivery = await view
      .sealView(networkId, keyring, { ...target, account })
      .catch((error: unknown) => {
        refusal = error;
        return undefined;
      });
    if (!delivery) {
      const refused =
        refusal instanceof GrantRevocationPendingError
          ? result.revocationPending
          : result.unsealed;
      refused.push(target.grantId);
      continue;
    }
    result.sealed.push({
      ...target,
      seal: HexBytes.fromByteArray(delivery.seal),
      sealedEncKey,
    });
    result.entries.push(delivery.entry);
  }
  return result;
};
