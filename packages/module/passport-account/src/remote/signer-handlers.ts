import {
  AccAddress,
  AccountCreationPendingError,
  AccountExistsError,
  DeviceEpoch,
  GrantOriginMissingError,
  GrantRevocationPendingError,
  GrantSlot,
  MaintenanceAuthorityMismatchError,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import {
  ADD_DEVICE_CIRCUIT,
  REMOVE_DEVICE_CIRCUIT,
} from '../acc/device-circuits';
import {
  APPEND_INBOX_CIRCUIT,
  ROTATE_ENC_KEY_CIRCUIT,
} from '../acc/enc-key-circuits';
import { encodeDevicePublicKey } from '../acc/envelopes';
import {
  ISSUE_GRANT_CIRCUIT,
  REVOKE_ALL_GRANTS_CIRCUIT,
  REVOKE_GRANT_CIRCUIT,
} from '../acc/grant-circuits';
import { MAX_INBOX_ENTRIES_PER_REQUEST } from '../acc/inbox';
import { isSameAuthority } from '../acc/maintenance-authority';
import {
  isPendingDeployment,
  lockChoiceMismatch,
} from '../acc/pending-deployment';
import {
  loadDeviceEntryDerivation,
  loadGrantDerivation,
} from '../acc/signing-loader';
import {
  createPasskeyEncryptionKey,
  createPasskeyLiveEnvelopeFinder,
} from '../ceremony/encryption-key';
import { createPasskeyAuthoriser } from '../ceremony/passkey';
import { storedGranteeScheme } from '../flows/types';
import {
  createAccountRecordStore,
  toAccountRecords,
} from '../store/account-record';

import { createApprovedReadKeys } from './approved-read-keys';
import {
  decodeAccount,
  decodeBigInt,
  decodeBigInts,
  decodeBoolean,
  decodeBytes,
  decodeGrantBookkeeping,
  decodeGrantId,
  decodeInboxEntries,
  decodeKeyring,
  decodeLiveReader,
  decodeMaintenanceChanges,
  decodeMaintenanceKey,
  decodeRecord,
  decodeRemovedDevice,
  encodeAccountKeys,
  encodeAuthorisation,
  encodeBytes,
  encodeOpenedEntry,
  encodePoint,
  encodeSignedMaintenanceUpdate,
  MalformedPayloadError,
} from './codec';
import { createCreationKeyEntries } from './creation-key-entries';
import {
  FlowScopeError,
  GrantBindingMismatchError,
  InboxRequestTooLargeError,
  KeySessionRequiredError,
  SessionExpiredError,
} from './errors';
import { decodeSignerFlow } from './flow-descriptor';
import { createRetiredEncKeys } from './retired-enc-keys';

import type { DecodedSignerFlow, IssueGrantFlow } from './flow-descriptor';
import type { IssueGrantBinding } from '../acc/challenges';
import type {
  PendingCreationMarker,
  PendingDeployment,
} from '../acc/pending-deployment';
import type { GrantDerivation } from '../acc/signing-loader';
import type { PassportAccountRecord, StoredGrants } from '../flows/types';
import type { KeyValueStorageFactory } from '@lace-contract/module';
import type {
  AccountKeyring,
  GrantBookkeeping,
  GrantViewSealRequest,
  LiveDeviceReader,
  MaintenanceChanges,
  MaintenanceVerifyingKey,
  OpenedInboxEntry,
  RemovedDevice,
} from '@lace-contract/passport';
import type {
  PasskeySessionKeySource,
  SignerFlow,
  SignerFlowKind,
  SignerRequestHandlers,
  SignerRequestKind,
} from '@lace-lib/passkey';

/** Handlers for the Passport request kinds of the remote signer protocol. */
export type PassportSignerHandlers = Pick<
  SignerRequestHandlers,
  Exclude<
    SignerRequestKind,
    | 'cardano-account-public-key'
    | 'cardano-custody-public-key'
    | 'sign-cardano-custody-data'
    | 'sign-cardano-custody-tx'
    | 'sign-cardano-data'
    | 'sign-cardano-tx'
  >
>;

/** The timer functions the session deadline runs on; the globals by default. */
export type SessionTimers = {
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (timer: unknown) => void;
};

/**
 * Longer than a localnet account deploy with proving, which is the slowest
 * flow a session serves, yet bounded so a window the dApp forgot about
 * does not hold key material indefinitely.
 */
const DEFAULT_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export type CreatePassportSignerHandlersProps = {
  /** The key source the signer page built over its own passkey. */
  keySource: PasskeySessionKeySource;
  /** Storage on the signer origin, where the account record lives. */
  createKeyValueStorage: KeyValueStorageFactory;
  /**
   * How long a key session stays held after its flow-open, in
   * milliseconds, before it is released as if the flow had closed; five
   * minutes by default.
   */
  sessionTimeoutMs?: number;
  /** Told which flow lost its session when the timeout elapses. */
  onSessionExpired?: (flow: SignerFlow) => void;
  /** Timers the deadline runs on; injected so tests can drive them. */
  timers?: SessionTimers;
};

/** The request kinds a held session serves to its flow. */
type ScopedKind = Exclude<
  keyof PassportSignerHandlers,
  'flow-close' | 'flow-open' | 'record-exists'
>;

type FlowScope = {
  kinds: ReadonlySet<ScopedKind>;
  circuits: ReadonlySet<string>;
};

/** The authorisation fields a flow binds beyond its circuit. */
type AuthorisationBinding = { account: string; circuit: string; args: unknown };

const READ_KEY_LENGTH = 32;
const ENC_KEY_LENGTH = 32;

/** Names the argument an authorisation strays from its approval on, if any. */
type ArgumentCheck = (binding: AuthorisationBinding) => string | undefined;

/** The `enc_key` a signed rotation installed, with the network it lives on. */
type RotatedKey = { key: string; networkId: string };

/**
 * A key this session drew: the network it is for, the `enc_key` it
 * replaces (none at creation), whether the roster key was drawn fresh
 * with it, and the maintenance authority that roster key derives.
 */
type CreatedKey = {
  networkId: string;
  from: string | undefined;
  rotateRoster: boolean;
  authority: MaintenanceVerifyingKey;
};

type HeldKeySession = {
  flow: DecodedSignerFlow;
  scope: FlowScope;
  unboundArgument: ArgumentCheck;
  release: () => void;
  settled: Promise<void>;
  deadline: unknown;
  /** The account keys this session drew, by `enc_key` hex, with their network. */
  createdKeys: Map<string, CreatedKey>;
  /** The inbox entries this session sealed, by hex, the only ones it may append. */
  producedEntries: Set<string>;
  rotatedTo?: RotatedKey & {
    rotateRoster: boolean;
    authority: MaintenanceVerifyingKey;
  };
  /** Whether the one revocation the approval covers was signed. */
  isRevocationSigned: boolean;
  /** Whether the descriptor's grant issue was signed, which its seal needs. */
  isIssueSigned: boolean;
};

/** A create-account descriptor, with the lock choice the user approved. */
type CreationFlow = Extract<DecodedSignerFlow, { kind: 'create-account' }>;

const scope = (kinds: ScopedKind[], circuits: string[] = []): FlowScope => ({
  kinds: new Set(kinds),
  circuits: new Set(circuits),
});

const GATED_CALL_KINDS: ScopedKind[] = [
  'device-commitments',
  'authorise',
  'record-read',
  'record-write',
];

/** What a flow reads about this device: its device key and its reader key. */
const LOCAL_DEVICE_KINDS: ScopedKind[] = [
  'device-public-key',
  'reader-public-key',
];

/**
 * What a flow that opens the account keys sends to find its live
 * envelope among more of this device's envelopes than one keyring
 * carries.
 */
const KEYRING_KINDS: ScopedKind[] = ['find-live-envelope'];

/**
 * What a key rotation adds to a session: this device's keys, the inbox
 * opened with the live keyring to walk the live holdings and read the
 * roster, the fresh account keys, the re-encryption, and the two circuits
 * that land them.
 */
const ROTATION_KINDS: ScopedKind[] = [
  ...LOCAL_DEVICE_KINDS,
  ...KEYRING_KINDS,
  'open-inbox',
  'create-keys',
  'reencrypt-inbox',
];
const ROTATION_CIRCUITS = [ROTATE_ENC_KEY_CIRCUIT, APPEND_INBOX_CIRCUIT];

/**
 * What moves the maintenance authority after a fresh-roster rotation, and
 * what an install of missing operations signs its verifier keys with.
 */
const MAINTENANCE_KINDS: ScopedKind[] = ['sign-maintenance-update'];

/**
 * What a fresh-roster rotation moves the maintenance authority with: the
 * check, ahead of the rotation, that this device holds the authority on
 * chain, and the replace that follows it.
 */
const ROSTER_AUTHORITY_KINDS: ScopedKind[] = [
  ...MAINTENANCE_KINDS,
  'holds-maintenance-authority',
];

/**
 * What each flow sends inside its session, read off the flows themselves.
 * Create-account resolves this device's keys, reads the record a previous
 * attempt left unfinished, draws the account keys, deploys and activates
 * without a signature, derives the initial entry commitment, appends its
 * own envelope and registration and writes the record; it checks presence
 * before the session, which stays ungated, and opens one only over no
 * record or a pending one. Sign-in resolves this device's keys, reads the
 * record, opens its keys and bookkeeping from the inbox, rescans
 * commitments and writes the healed record. The device and grant flows
 * rescan commitments, authorise their one circuit, derive the successor
 * commitment, and read the record before they write it, so the grant
 * bookkeeping it carries survives the write; an issue writes it a second
 * time, ahead of the call, and appends the grant's bookkeeping once it
 * lands. A device removal also rotates the account keys, see
 * {@link ROTATION_KINDS}, and seals the new secret again to the live read
 * grants. A holdings read resolves this device's reader key and opens
 * inbox entries: it calls no circuit and touches no record. A removal
 * also checks that this device holds the maintenance authority before it
 * rotates and moves it to the new roster key after, see
 * {@link ROSTER_AUTHORITY_KINDS}. An install resolves this device's reader key,
 * finds its live envelope and signs the verifier key inserts of the
 * operations its descriptor names; it calls no circuit either. An enrolment
 * that delivers the account keys, and a grant flow that shares or
 * withdraws the viewing secret, widen their scope, see {@link flowScope}.
 */
const FLOW_SCOPES: Record<SignerFlowKind, FlowScope> = {
  'create-account': scope(
    [
      ...LOCAL_DEVICE_KINDS,
      'record-read',
      'create-keys',
      'device-commitments',
      'authorise',
      'record-write',
    ],
    [APPEND_INBOX_CIRCUIT],
  ),
  'sign-in': scope([
    ...LOCAL_DEVICE_KINDS,
    ...KEYRING_KINDS,
    'record-read',
    'open-inbox',
    'device-commitments',
    'record-write',
  ]),
  'add-device': scope(GATED_CALL_KINDS, [ADD_DEVICE_CIRCUIT]),
  'remove-device': scope(
    [
      ...GATED_CALL_KINDS,
      ...ROTATION_KINDS,
      ...ROSTER_AUTHORITY_KINDS,
      'seal-view',
    ],
    [REMOVE_DEVICE_CIRCUIT, ...ROTATION_CIRCUITS],
  ),
  'issue-grant': scope(
    [...GATED_CALL_KINDS, 'seal-grant'],
    [ISSUE_GRANT_CIRCUIT, APPEND_INBOX_CIRCUIT],
  ),
  'revoke-grant': scope(GATED_CALL_KINDS, [REVOKE_GRANT_CIRCUIT]),
  'revoke-all-grants': scope(GATED_CALL_KINDS, [REVOKE_ALL_GRANTS_CIRCUIT]),
  'read-holdings': scope(['reader-public-key', ...KEYRING_KINDS, 'open-inbox']),
  'install-operations': scope([
    'reader-public-key',
    ...KEYRING_KINDS,
    ...MAINTENANCE_KINDS,
  ]),
};

/** Whether a grant descriptor asks for a session that rotates the encryption key. */
const rotatesForGrant = (flow: DecodedSignerFlow): boolean =>
  flow.kind === 'issue-grant'
    ? flow.scope.read === true
    : (flow.kind === 'revoke-grant' || flow.kind === 'revoke-all-grants') &&
      flow.read === true;

/**
 * The account a session acts on as its descriptor names it: a device
 * flow's, an install's, an issue's and a revocation's. A creation, a
 * sign-in and a holdings read name none.
 */
const sessionAccount = (flow: DecodedSignerFlow): string | undefined => {
  switch (flow.kind) {
    case 'add-device':
    case 'install-operations':
    case 'issue-grant':
    case 'remove-device':
    case 'revoke-all-grants':
    case 'revoke-grant':
      return flow.account;
    case 'create-account':
    case 'read-holdings':
    case 'sign-in':
      return undefined;
  }
};

/**
 * The scope a session serves its flow: the flow's own kinds and circuits,
 * widened for an enrolment that names the joining device's keys by this
 * device's keys, the sealing of the account keys to the joining device
 * and the appends that deliver them, and, when its descriptor names the
 * device entries of a rotation ahead of it because a read grant is live,
 * by that rotation, the check and move of the maintenance authority it
 * calls for and the re-seal of the live read grants, the joining device then
 * sealed only the key the session rotated to; and for a read
 * grant's issue or a
 * revocation that rotates the key by what the rotation sends, and for
 * one that seals the new secret again by the seal request. A grant
 * session whose descriptor does not read keeps its own circuits, so an
 * approval to grant a spend can never rotate the key.
 */
const flowScope = (flow: DecodedSignerFlow): FlowScope => {
  const base = FLOW_SCOPES[flow.kind];
  if (flow.kind === 'add-device' && flow.reader && flow.devices) {
    return scope(
      [
        ...base.kinds,
        ...ROTATION_KINDS,
        ...ROSTER_AUTHORITY_KINDS,
        'seal-view',
        'seal-to-device',
      ],
      [...base.circuits, ...ROTATION_CIRCUITS],
    );
  }
  if (flow.kind === 'add-device' && flow.reader) {
    return scope(
      [
        ...base.kinds,
        ...LOCAL_DEVICE_KINDS,
        ...KEYRING_KINDS,
        'seal-to-device',
      ],
      [...base.circuits, APPEND_INBOX_CIRCUIT],
    );
  }
  if (!rotatesForGrant(flow)) return base;
  const kinds = [...base.kinds, ...ROTATION_KINDS];
  if (flow.kind !== 'revoke-all-grants') kinds.push('seal-view');
  return scope(kinds, [...base.circuits, ...ROTATION_CIRCUITS]);
};

const defaultTimers: SessionTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: timer => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
};

/**
 * The hostname of the dApp origin the channel reports. It is the client
 * id a grant issued through the signer is bound to, the relying party id
 * the Passport module defaults to on that origin, the origin a grant's
 * bookkeeping is kept under, and the origin an account creation is
 * bound to. It is never read from a descriptor, so a dApp cannot have
 * the signer act under another site's name.
 */
const originHost = (dappOrigin: string): string => new URL(dappOrigin).hostname;

/**
 * Re-derives what an issue-grant descriptor claims before any ceremony:
 * the scope digest from the carried scope and salt, and the grant id
 * from the account, the grantee key under its scheme, the observed dApp
 * origin and the slot. The scope is held to the contract's issue rules
 * first, so the signer never signs over a scope the contract would
 * refuse.
 *
 * @throws {@link GrantOriginMissingError} when no dApp origin reached
 * the handler.
 * @throws {@link GrantBindingMismatchError} when the carried digest or
 * id differs from the derived one.
 */
const assertGrantBinding = async (
  flow: IssueGrantFlow,
  dappOrigin: string | undefined,
  derivation: GrantDerivation,
): Promise<void> => {
  if (dappOrigin === undefined) {
    throw new GrantOriginMissingError(
      'The signer needs the dApp origin to bind a grant; none was reported.',
    );
  }
  const encoded = derivation.circuitScope(flow.scope);
  derivation.assertIssueRules(encoded);
  const digest = derivation.scopeDigest(
    ByteArray.fromHex(HexBytes(flow.scopeSalt)),
    derivation.scopeArgs(encoded),
  );
  if (encodeBytes(digest) !== flow.scopeDigest) {
    throw new GrantBindingMismatchError('scopeDigest');
  }
  const grantId = derivation.deriveGrantId({
    contractAddress: ByteArray.fromHex(HexBytes(flow.account)),
    granteePublicKey: derivation.granteePoint(flow.scope.grantee),
    originHash: await derivation.originHash(originHost(dappOrigin)),
    slot: flow.slot,
  });
  if (grantId !== flow.grantId) {
    throw new GrantBindingMismatchError('grantId');
  }
};

/**
 * The bytes an authorisation names when its circuit takes one 32-byte
 * argument, as the device and revoke-grant flows send it. Anything else
 * reads as none, so it cannot match an approval.
 */
const bytesArgument = (args: unknown): string | undefined => {
  if (!Array.isArray(args) || args.length !== 1) return undefined;
  const [entry] = args as unknown[];
  return entry instanceof Uint8Array ? encodeBytes(entry) : undefined;
};

/**
 * The check an issue authorisation must pass: the account must be the
 * descriptor's, and the grant id and scope digest read from the
 * arguments, the same way the authoriser derives the challenge it signs,
 * must be the approved ones. The digest is the image of the scope
 * arguments and the salt, so an argument list that encodes any other
 * scope cannot pass.
 */
const issueArgumentCheck =
  (flow: IssueGrantFlow, derivation: GrantDerivation): ArgumentCheck =>
  ({ account, args }) => {
    if (account !== flow.account) return 'account';
    if (!Array.isArray(args)) return 'args';
    let binding: IssueGrantBinding;
    try {
      binding = derivation.issueGrantBinding(args);
    } catch {
      return 'args';
    }
    if (encodeBytes(binding.grantId) !== flow.grantId) return 'args[0]';
    if (encodeBytes(binding.scopeDigest) !== flow.scopeDigest) {
      return 'args[1..17]';
    }
    return undefined;
  };

const singleBytesArgumentCheck =
  (expected: string): ArgumentCheck =>
  ({ args }) =>
    bytesArgument(args) === expected ? undefined : 'args[0]';

const noArgumentCheck: ArgumentCheck = ({ args }) =>
  Array.isArray(args) && args.length === 0 ? undefined : 'args';

/**
 * A check held also to the account a descriptor names, so a device flow
 * acts on the account the user approved and a rotating revocation
 * rotates the key of the account whose grants it revokes.
 */
const accountArgumentCheck =
  (account: string | undefined, check: ArgumentCheck): ArgumentCheck =>
  binding =>
    account !== undefined && binding.account !== account
      ? 'account'
      : check(binding);

const anyArgumentCheck: ArgumentCheck = () => undefined;

const REVOCATION_CIRCUITS = [REVOKE_GRANT_CIRCUIT, REVOKE_ALL_GRANTS_CIRCUIT];

/**
 * Binds a decoded flow before its session opens and returns the check
 * its authorisations must pass. An issue-grant flow loads the grant
 * derivation here, the first Midnight code the signer evaluates, and is
 * re-derived against the dApp origin; the other flows bind their one
 * argument, or none, from the descriptor alone.
 */
const bindFlow = async (
  flow: DecodedSignerFlow,
  dappOrigin: string | undefined,
): Promise<ArgumentCheck> => {
  switch (flow.kind) {
    case 'add-device':
    case 'remove-device':
      return accountArgumentCheck(
        flow.account,
        singleBytesArgumentCheck(flow.commitmentHex),
      );
    case 'revoke-grant':
      return accountArgumentCheck(
        flow.account,
        singleBytesArgumentCheck(flow.grantId),
      );
    case 'install-operations':
    case 'revoke-all-grants':
      return accountArgumentCheck(flow.account, noArgumentCheck);
    case 'issue-grant': {
      const derivation = await loadGrantDerivation();
      await assertGrantBinding(flow, dappOrigin, derivation);
      return issueArgumentCheck(flow, derivation);
    }
    case 'create-account':
    case 'read-holdings':
    case 'sign-in':
      return anyArgumentCheck;
  }
};

/**
 * Whether a grant's bookkeeping is the one the issue descriptor names: the
 * id, slot, salt and grantee key with its scheme, the read key of a read
 * grant and none otherwise, and the object fields of the approved scope.
 */
const isApprovedBookkeeping = (
  flow: IssueGrantFlow,
  grant: GrantBookkeeping,
): boolean =>
  grant.grantId === flow.grantId &&
  grant.slot === flow.slot &&
  grant.scopeSalt === flow.scopeSalt &&
  grant.granteeScheme === flow.scope.grantee.scheme &&
  grant.granteePublicKey === flow.scope.grantee.publicKey &&
  grant.readPublicKey === flow.scope.readPublicKey &&
  grant.object.color === flow.scope.color &&
  grant.object.maxCoinValue === flow.scope.maxCoinValue &&
  JSON.stringify(grant.object.recipient) ===
    JSON.stringify(flow.scope.recipient);

/** Refuses an inbox request carrying more entries than one request may. */
const assertEntryBound = (entries: unknown): void => {
  if (
    Array.isArray(entries) &&
    entries.length > MAX_INBOX_ENTRIES_PER_REQUEST
  ) {
    throw new InboxRequestTooLargeError(MAX_INBOX_ENTRIES_PER_REQUEST);
  }
};

/**
 * The device entries a rotating descriptor names, whose devices the new
 * secret may be sealed to, or undefined for a flow that does not rotate.
 */
const rotationDevices = (flow: DecodedSignerFlow): string[] | undefined => {
  switch (flow.kind) {
    case 'add-device':
    case 'remove-device':
    case 'issue-grant':
    case 'revoke-grant':
    case 'revoke-all-grants':
      return flow.devices;
    case 'create-account':
    case 'install-operations':
    case 'read-holdings':
    case 'sign-in':
      return undefined;
  }
};

/**
 * Names the field a rotation's readers stray on: each reader's device key
 * must derive, at the epoch and counter it names, one of the device
 * entries the descriptor showed, and no two readers the same entry, so
 * the new secret reaches only devices the user saw, one reader each, and
 * never the device a removal takes out.
 */
const unboundReaders = async (
  flow: DecodedSignerFlow,
  account: string,
  readers: readonly LiveDeviceReader[],
): Promise<string | undefined> => {
  const devices = rotationDevices(flow);
  if (devices === undefined) return 'devices';
  if (readers.length === 0) return undefined;
  const allowed = new Set(devices);
  const used = new Set<string>();
  const { deviceEntryOf } = await loadDeviceEntryDerivation();
  for (const [index, reader] of readers.entries()) {
    const entry = deviceEntryOf(
      { address: account, epoch: reader.epoch },
      reader.devicePublicKey,
      reader.counter,
    );
    if (entry === undefined || !allowed.has(entry) || used.has(entry)) {
      return `readers[${index}]`;
    }
    used.add(entry);
  }
  return undefined;
};

/** What a removal's create-keys request names: its readers and the removed device. */
type RemovalNaming = {
  readers: readonly LiveDeviceReader[];
  removed: RemovedDevice | undefined;
};

/**
 * Names the field a removal's create-keys strays on. A named removed
 * device must derive the removal's target entry at the epoch and counter
 * it gives, which only the target's own key can, and the seam then seals
 * to no reader carrying that key or paired with it in the roster. With
 * none named, as for a target enrolled without keys, no reader's device
 * key may derive the target entry at any counter within the scan bound;
 * each distinct device key is scanned once.
 */
const unboundRemoval = async (
  flow: DecodedSignerFlow,
  account: string,
  { readers, removed }: RemovalNaming,
): Promise<string | undefined> => {
  if (flow.kind !== 'remove-device') return undefined;
  const { deviceEntryOf, derivesEntry } = await loadDeviceEntryDerivation();
  if (removed) {
    return deviceEntryOf(
      { address: account, epoch: removed.epoch },
      removed.devicePublicKey,
      removed.counter,
    ) === flow.commitmentHex
      ? undefined
      : 'removed';
  }
  const scanned = new Map<string, boolean>();
  const index = readers.findIndex(({ epoch, devicePublicKey }) => {
    const key = `${epoch}:${devicePublicKey}`;
    const isTarget =
      scanned.get(key) ??
      derivesEntry(
        { address: account, epoch },
        devicePublicKey,
        flow.commitmentHex,
      );
    scanned.set(key, isTarget);
    return isTarget;
  });
  return index === -1 ? undefined : `readers[${index}]`;
};

/**
 * The grant record parts a sign-in may see: those of grants whose id
 * derives from the account, the grantee key under its scheme and the slot
 * a grant part names and the hostname of the dApp origin asking, and the
 * object and view parts of those grants, so a dApp reads back only the
 * bookkeeping of grants issued under its own origin.
 */
const grantsOfOrigin = async (
  opened: readonly (OpenedInboxEntry | null)[],
  account: string,
  dappOrigin: string | undefined,
): Promise<Set<string>> => {
  const shown = new Set<string>();
  if (dappOrigin === undefined) return shown;
  const derivation = await loadGrantDerivation();
  const origin = await derivation.originHash(originHost(dappOrigin));
  for (const entry of opened) {
    if (entry?.kind !== 'grant' || entry.record.part !== 'grant') continue;
    const { grantId, granteeScheme, granteePublicKey, slot } = entry.record;
    try {
      const derived = derivation.deriveGrantId({
        contractAddress: ByteArray.fromHex(HexBytes(account)),
        granteePublicKey: derivation.granteePoint({
          scheme: granteeScheme,
          publicKey: granteePublicKey,
        }),
        originHash: origin,
        slot,
      });
      if (derived === grantId) shown.add(grantId);
    } catch {
      continue;
    }
  }
  return shown;
};

/** Where an opened inbox goes: its account and the dApp origin asking. */
type OpenedFor = { account: string; dappOrigin: string | undefined };

/**
 * What a flow's session answers of an opened inbox: a holdings read the
 * coins alone; a sign-in the grant records of grants issued under the
 * asking origin, see {@link grantsOfOrigin}, and nothing else; any other
 * flow the coins and the registered devices, never grant records.
 */
const shownToFlow = async (
  flow: DecodedSignerFlow,
  opened: readonly (OpenedInboxEntry | null)[],
  { account, dappOrigin }: OpenedFor,
): Promise<(OpenedInboxEntry | null)[]> => {
  if (flow.kind === 'read-holdings') {
    return opened.map(entry => (entry?.kind === 'coin' ? entry : null));
  }
  if (flow.kind === 'sign-in') {
    const shown = await grantsOfOrigin(opened, account, dappOrigin);
    return opened.map(entry =>
      entry?.kind === 'grant' && shown.has(entry.record.grantId) ? entry : null,
    );
  }
  return opened.map(entry => (entry?.kind === 'grant' ? null : entry));
};

/**
 * The stored grants kept under the hostname of the dApp origin asking,
 * or undefined when it keeps none: a dApp reads and writes only the
 * bookkeeping of grants issued under its own origin.
 */
const grantsOfHost = (
  grants: StoredGrants | undefined,
  host: string | undefined,
): StoredGrants | undefined => {
  const own = Object.entries(grants ?? {}).filter(
    ([, grant]) => grant.origin === host,
  );
  return own.length > 0 ? Object.fromEntries(own) : undefined;
};

/**
 * The record a flow is shown: a creation the whole pending deployment it
 * resumes, any other flow only the marker of an unfinished creation, and
 * every flow only the grants kept under its own origin.
 */
const shownRecord = (
  flow: DecodedSignerFlow,
  { deployment, grants, ...identity }: PassportAccountRecord,
  host: string | undefined,
): PassportAccountRecord => {
  const shownDeployment: PendingCreationMarker | PendingDeployment | undefined =
    deployment === undefined || flow.kind === 'create-account'
      ? deployment
      : { keyEntries: deployment.keyEntries };
  const shownGrants = grantsOfHost(grants, host);
  return {
    ...identity,
    ...(shownDeployment === undefined ? {} : { deployment: shownDeployment }),
    ...(shownGrants === undefined ? {} : { grants: shownGrants }),
  };
};

/**
 * Whether every grant id derives from the account, the entry's grantee
 * key under its scheme, its slot and the hostname, so the id is one this
 * origin issued. The grant derivation is loaded only when a write carries
 * grants.
 */
const derivesOwnGrantIds = async (
  account: string,
  host: string,
  grants: readonly (readonly [string, StoredGrants[string]])[],
): Promise<boolean> => {
  const derivation = await loadGrantDerivation();
  const origin = await derivation.originHash(host);
  return grants.every(([id, grant]) => {
    try {
      return (
        derivation.deriveGrantId({
          contractAddress: ByteArray.fromHex(HexBytes(account)),
          granteePublicKey: derivation.granteePoint({
            scheme: storedGranteeScheme(grant),
            publicKey: grant.granteePublicKey,
          }),
          originHash: origin,
          slot: GrantSlot(grant.slot),
        }) === id
      );
    } catch {
      return false;
    }
  });
};

/**
 * Names the field a maintenance update strays from its approval on. An
 * install signs only verifier key inserts, each of an operation its
 * descriptor names and none twice. A device flow signs only the replace
 * that follows the fresh-roster rotation it signed, over the keyring of
 * the key the session rotated to, on the same network, and only towards
 * the authority the roster key that rotation drew derives. The dApp
 * chooses the envelopes of the keyring, so one sealing the rotated
 * secret with a roster key of a grantee's could otherwise pass as live,
 * and the authority the session drew is the only one the user approved
 * handing to the devices listed. Which verifier keys an insert may carry
 * the encryption key holds to itself.
 */
const unboundMaintenance = (
  { flow, rotatedTo }: HeldKeySession,
  { key, networkId }: RotatedKey,
  changes: MaintenanceChanges,
): string | undefined => {
  if (flow.kind === 'install-operations') {
    if (changes.kind !== 'insert-verifier-keys') return 'changes';
    const named = new Set(flow.operations);
    const signed = new Set<string>();
    for (const [index, { operation }] of changes.inserts.entries()) {
      if (!named.has(operation) || signed.has(operation)) {
        return `changes.inserts[${index}]`;
      }
      signed.add(operation);
    }
    return undefined;
  }
  if (changes.kind !== 'replace-authority') return 'changes';
  if (!rotatedTo?.rotateRoster || rotatedTo.key !== key) return 'keyring';
  if (rotatedTo.networkId !== networkId) return 'networkId';
  return isSameAuthority(changes.authority, rotatedTo.authority)
    ? undefined
    : 'changes.authority';
};

/** Whether two pending deployments are the same in every field. */
const isSameDeployment = (
  left: PendingDeployment,
  right: PendingDeployment,
): boolean =>
  left.lockAccount === right.lockAccount &&
  left.verifierKeysDigest === right.verifierKeysDigest &&
  left.saltHex === right.saltHex &&
  left.authorityKey.tag === right.authorityKey.tag &&
  left.authorityKey.value === right.authorityKey.value &&
  left.handoverAuthority.tag === right.handoverAuthority.tag &&
  left.handoverAuthority.value === right.handoverAuthority.value &&
  left.operations.join(',') === right.operations.join(',') &&
  left.keyEntries.join(',') === right.keyEntries.join(',');

/**
 * Builds the signer-side handlers for the Passport request kinds over the
 * same local implementations a dApp-hosted passkey uses, so both ends of
 * the channel share one encoding. The record store seals the account
 * record under the key source's record key on the signer origin.
 *
 * A flow-open opens the local key session and holds it until the matching
 * flow-close, so every request the dApp sends in between is served from
 * the one ceremony that opened it. The open resolves once the ceremony
 * has settled: a dismissed prompt rejects it, and no session is held. A
 * flow-close with no session open is a no-op, so a close that races a
 * failed open cannot fail the dApp. Either way it answers with the
 * outcome it was given, so the signer page can show how the flow ended.
 *
 * Every request that reaches the key source is refused with
 * KeySessionRequiredError unless a flow-open is held, and the flows only
 * send them inside a session. Outside one, a device key, commitment,
 * authorisation, account key or inbox request would open a ceremony of
 * its own that no approval covered, and a record read or write would cost
 * no approval at all: the record is shared by every opener and is the only
 * pointer to the deployed contract, and its key is cached across
 * sessions. Presence stays open: it reveals only whether a record exists
 * and whether it describes an unfinished creation, both kept beside the
 * sealed envelope, and the create-account flow checks it before asking
 * for any approval, so a complete record is refused without a ceremony.
 * Only inside a create-account session do the record read and write
 * carry the pending deployment, the contract's maintenance authority key
 * included, between the dApp running the waves and this origin storing
 * it sealed. A creation is bound to the hostname of the dApp origin that
 * drew its keys, kept in signer-only storage with its key entries: no
 * other origin opens a creation over the pending record, reads or writes
 * it, or appends the kept entries. The descriptor names the lock choice,
 * which a fresh creation's deployment must carry and a resumed one's
 * must already hold. Any other flow reads only the key entries of an
 * unfinished creation, and its writes keep the stored deployment as it
 * is, a write naming one refused, so a sign-in over a pending record
 * leaves it pending until its creation completes it. Every flow reads
 * only the grant bookkeeping kept under its own origin and changes only
 * that, the rest kept as stored. No write may change the address of a
 * stored record, and a creation may not write over a complete record or
 * change a stored deployment; once a complete record is written, the
 * creation's key entries are cleared.
 *
 * The approval covers one flow, so the session serves only what that flow
 * sends: a kind outside its scope, or an authorisation for a circuit it
 * does not call, is refused with FlowScopeError before the key source is
 * touched. A sign-in approval therefore cannot be turned into a device
 * enrolment, a holdings approval opens inbox entries and signs nothing,
 * at most MAX_INBOX_ENTRIES_PER_REQUEST of them per request, as does a
 * rotation's re-encryption, a larger request refused with
 * InboxRequestTooLargeError before the key source is touched, and a
 * device or grant approval signs its own circuits only, and only for
 * what the user saw: a device authorisation must name the descriptor's
 * account and its single argument must be the entry bytes of the
 * descriptor's commitment, a revoke-grant authorisation's the bytes of
 * its grant id, a revoke-all authorisation must carry no argument, a
 * revocation must name the descriptor's account and is signed once per
 * approval, and
 * an issue-grant authorisation must name the descriptor's account and
 * read back to its grant id and scope digest, so an approval cannot sign
 * for another device, grant or scope. The flow descriptor is checked
 * before the session opens, so a malformed one is refused without a
 * ceremony.
 *
 * A keyring carries at most MAX_INBOX_ENTRIES_PER_REQUEST envelopes too.
 * A flow that opens the account keys may page more of this device's
 * envelopes through `find-live-envelope`, which answers only where in
 * the page the live one sits, so envelopes anyone appended to this
 * device's reader key cost the flow requests, never the live secret.
 *
 * A maintenance update is built and signed inside the encryption key,
 * the same implementation a local passkey runs, which signs only with
 * the authority a roster key of the keyring derives when that authority
 * is the one the request says the chain holds, installs by a replace
 * only the authority the live roster key derives, and inserts only the
 * verifier keys the module pins for operations it deploys; it never
 * signs bytes it is sent. The session holds it to its approval too: a
 * removal, and an enrolment that rotates under a live read grant, sign
 * only a replace, only over the keyring of the fresh-roster key the
 * session rotated to, and only towards the authority the roster key that
 * session drew derives, since the dApp picks the keyring's envelopes and
 * so which roster key the encryption key takes as live; an install signs
 * only inserts of the operations its descriptor names. A keyring none of whose roster keys
 * derives the authority is answered null rather than refused, so the
 * dApp pages the envelopes older than the live one beside it, since
 * the roster key the authority was derived from may sit behind any
 * number of envelopes anyone appended.
 *
 * An issue-grant descriptor is also re-derived before the session opens:
 * the scope digest from its scope and salt, and the grant id from its
 * account, grantee key and slot and from the hostname of the dApp origin
 * the channel observed, never from anything the dApp claims. A digest
 * or id that differs is refused with GrantBindingMismatchError, so the
 * scope the user approves is the scope the signature binds, and the
 * grant is bound to the site that asked for it. A scope the contract
 * would refuse, a shielded operation or a rolling window among them, is
 * refused the same way the local flow refuses it, with
 * GrantScopeInvalidError. Its bookkeeping is sealed only as the
 * descriptor names it.
 *
 * The account secret is random and never derived: `create-keys` draws a
 * fresh one for the session and seals it, with the roster key, to this
 * device, whose device key the request must name, and to the devices the
 * live roster key registers, less those a removal excludes, and only a
 * removal may exclude any, one at most. The secret leaves only sealed:
 * in envelopes to reader keys, re-encrypted holdings, and through
 * `seal-view`, which seals the live secret of the key this session
 * rotated the account to, for the descriptor's account and towards a
 * read key the user approved: for an issue the descriptor's for its own
 * grant, and for any other grant, as for a revocation or a removal, one
 * approved on this signer by an earlier issue and not revoked since,
 * never the revoked grant's. A rotate call must carry a key this
 * session drew, and an append must carry an entry this session sealed,
 * so `enc_key` only ever becomes a secret this signer drew and the inbox
 * only gains what it sealed. No rotation can lead back to an earlier
 * secret, since no secret is ever drawn twice, so no high-water mark is
 * kept. An enrolment's keys are sealed only to the joining device its
 * descriptor names.
 *
 * The approved read keys are kept per account and network: a signed
 * revocation forgets its grant's key and a signed revoke-all every key of
 * the account, so a revoked grantee is never sealed a later secret, even
 * when the revocation never lands. A seal-view towards a key so forgotten
 * is refused with GrantRevocationPendingError, when the asking origin is
 * the one that asked for the revocation, and with FlowScopeError
 * otherwise, so the owner learns the grant awaits a revocation that has
 * not landed rather than seeing it unsealed with no cause.
 *
 * The session also has a deadline: once `sessionTimeoutMs` elapses with
 * it still held, it is released exactly as a flow-close would release it,
 * so the key source zeroes its outputs, and the flow is marked expired.
 * Every later request of that flow, its flow-close included, fails with
 * SessionExpiredError, and `onSessionExpired` is told so the page can
 * show it; the next flow-open starts afresh.
 */
export const createPassportSignerHandlers = ({
  keySource,
  createKeyValueStorage,
  sessionTimeoutMs = DEFAULT_SESSION_TIMEOUT_MS,
  onSessionExpired,
  timers = defaultTimers,
}: CreatePassportSignerHandlersProps): PassportSignerHandlers => {
  const authoriser = createPasskeyAuthoriser({ keySource });
  const encryptionKey = createPasskeyEncryptionKey(keySource);
  const findLiveEnvelope = createPasskeyLiveEnvelopeFinder(keySource);
  const records = toAccountRecords(
    createAccountRecordStore(createKeyValueStorage, authoriser.storageKey),
  );
  const readKeys = createApprovedReadKeys(createKeyValueStorage);
  const retiredKeys = createRetiredEncKeys(createKeyValueStorage);
  const creationEntries = createCreationKeyEntries(createKeyValueStorage);
  let heldSession: HeldKeySession | undefined;
  let expiredFlow: DecodedSignerFlow | undefined;

  const expireKeySession = (): void => {
    const held = heldSession;
    if (!held) return;
    heldSession = undefined;
    expiredFlow = held.flow;
    held.release();
    void held.settled.catch(() => undefined);
    onSessionExpired?.(held.flow);
  };

  const holdKeySession = async (
    flow: DecodedSignerFlow,
    unboundArgument: ArgumentCheck,
  ): Promise<void> => {
    if (heldSession) throw new Error('A key session is already open.');
    expiredFlow = undefined;
    let opened!: () => void;
    let release!: () => void;
    const isOpen = new Promise<void>(resolve => {
      opened = resolve;
    });
    const isReleased = new Promise<void>(resolve => {
      release = resolve;
    });
    const settled = authoriser.withKeySession(async () => {
      opened();
      await isReleased;
    });
    const held: HeldKeySession = {
      flow,
      scope: flowScope(flow),
      unboundArgument,
      release,
      settled,
      deadline: undefined,
      createdKeys: new Map(),
      producedEntries: new Set(),
      isRevocationSigned: false,
      isIssueSigned: false,
    };
    heldSession = held;
    try {
      await Promise.race([isOpen, settled]);
    } catch (error) {
      heldSession = undefined;
      throw error;
    }
    held.deadline = timers.setTimeout(expireKeySession, sessionTimeoutMs);
  };

  /**
   * Refuses a creation before any ceremony when a complete record is
   * stored, when no dApp origin was reported, or, with
   * AccountCreationPendingError, when it would resume an unfinished
   * creation another origin started. That error names the remedy but not
   * the creating site: it reaches the asking dApp, which is another site,
   * and the site a user started an account on is theirs to disclose.
   */
  const assertCreationOpens = async (
    flow: CreationFlow,
    dappOrigin: string | undefined,
  ): Promise<void> => {
    const presence = await records.presence();
    if (presence === 'complete') throw new AccountExistsError();
    if (dappOrigin === undefined) {
      throw new FlowScopeError(flow.kind, { argument: 'origin' });
    }
    if (
      presence === 'pending' &&
      !(await creationEntries.isFrom(originHost(dappOrigin)))
    ) {
      throw new AccountCreationPendingError(
        'An unfinished Passport account creation on this signer was started from another site; resume it from the site that started the creation.',
      );
    }
  };

  const openKeySession = async (
    flow: unknown,
    dappOrigin: string | undefined,
  ): Promise<void> => {
    const decoded = decodeSignerFlow(flow);
    if (heldSession) throw new Error('A key session is already open.');
    if (decoded.kind === 'create-account') {
      await assertCreationOpens(decoded, dappOrigin);
    }
    await holdKeySession(decoded, await bindFlow(decoded, dappOrigin));
  };

  /**
   * The hostname a creation session acts for, which must be the one that
   * started the unfinished creation it touches: the creation's key
   * entries and its authority key are its own.
   */
  const creatingHost = async (
    held: HeldKeySession,
    dappOrigin: string | undefined,
  ): Promise<string> => {
    const host =
      dappOrigin === undefined
        ? refuse(held, 'origin')
        : originHost(dappOrigin);
    if (!(await creationEntries.isFrom(host))) refuse(held, 'origin');
    return host;
  };

  /** Keeps the entries a request sealed as the ones the session may append. */
  const produce = (
    held: HeldKeySession,
    entries: readonly (Uint8Array | null)[],
  ): void => {
    for (const entry of entries) {
      if (entry) held.producedEntries.add(encodeBytes(entry));
    }
  };

  /**
   * Names the argument a rotation authorisation strays on: it must be for
   * the descriptor's account, when the descriptor names one; a rotate call
   * must carry a key this session drew, and an append an entry this
   * session sealed or, in a creation started from the same origin, one an
   * earlier creation session of this signer sealed and kept in
   * signer-only storage.
   */
  const unboundRotationArgument = async (
    held: HeldKeySession,
    { account, circuit, args }: AuthorisationBinding,
    dappOrigin: string | undefined,
  ): Promise<string | undefined> => {
    const expected = sessionAccount(held.flow);
    if (expected !== undefined && account !== expected) return 'account';
    const argument = bytesArgument(args);
    if (argument === undefined) return 'args[0]';
    if (circuit !== APPEND_INBOX_CIRCUIT) {
      return held.createdKeys.has(argument) ? undefined : 'args[0]';
    }
    if (held.producedEntries.has(argument)) return undefined;
    if (
      held.flow.kind !== 'create-account' ||
      !(await creationEntries.includes(argument))
    ) {
      return 'args[0]';
    }
    await creatingHost(held, dappOrigin);
    return undefined;
  };

  /**
   * Refuses a second revocation under one approval: a revoke-grant or
   * revoke-all approval signs its circuit once. It is counted before the
   * signature, so a ceremony that fails still spends the approval.
   */
  const assertSingleRevocation = (
    held: HeldKeySession,
    circuit: string,
  ): void => {
    if (!REVOCATION_CIRCUITS.includes(circuit)) return;
    if (held.isRevocationSigned) refuse(held, 'revocation');
    held.isRevocationSigned = true;
  };

  /**
   * Refuses a removal no fresh-roster rotation of this session preceded:
   * the device it removes would otherwise keep reading what arrives
   * next.
   */
  const assertRemovalRotated = (
    held: HeldKeySession,
    circuit: string,
  ): void => {
    if (circuit === REMOVE_DEVICE_CIRCUIT && !held.rotatedTo?.rotateRoster) {
      throw new FlowScopeError(held.flow.kind, { argument: 'rotation' });
    }
  };

  const requireScopedSession = (kind: ScopedKind): HeldKeySession => {
    if (expiredFlow) throw new SessionExpiredError(kind);
    if (!heldSession) throw new KeySessionRequiredError(kind);
    if (!heldSession.scope.kinds.has(kind)) {
      throw new FlowScopeError(heldSession.flow.kind, { kind });
    }
    return heldSession;
  };

  const requireScopedRequest = (
    kind: ScopedKind,
    authorisation?: AuthorisationBinding,
  ): HeldKeySession => {
    const held = requireScopedSession(kind);
    if (authorisation === undefined) return held;
    const { flow, scope: flowScope, unboundArgument } = held;
    if (!flowScope.circuits.has(authorisation.circuit)) {
      throw new FlowScopeError(flow.kind, { circuit: authorisation.circuit });
    }
    if (ROTATION_CIRCUITS.includes(authorisation.circuit)) return held;
    const argument = unboundArgument(authorisation);
    if (argument !== undefined) {
      throw new FlowScopeError(flow.kind, { argument });
    }
    return held;
  };

  /** Refuses a rotation authorisation whose argument strays from what the session approved. */
  const assertRotationBound = async (
    held: HeldKeySession,
    authorisation: AuthorisationBinding,
    dappOrigin: string | undefined,
  ): Promise<void> => {
    if (!ROTATION_CIRCUITS.includes(authorisation.circuit)) return;
    const argument = await unboundRotationArgument(
      held,
      authorisation,
      dappOrigin,
    );
    if (argument !== undefined) {
      throw new FlowScopeError(held.flow.kind, { argument });
    }
  };

  /**
   * The account a session's keys belong to: the one its descriptor names,
   * or for a sign-in or holdings read the one the record this signer
   * stores names.
   */
  const accountOf = async (held: HeldKeySession): Promise<string | undefined> =>
    sessionAccount(held.flow) ?? (await records.read())?.address;

  /**
   * Reads a keyring a request carries and holds it to the session: it must
   * belong to the session's account, and its `enc_key` must not be one
   * this signer already rotated that account away from, so a dApp can
   * neither replay a retired key nor roll the roster back past a removal
   * rotated here.
   */
  const admitKeyring = async (
    held: HeldKeySession,
    networkId: string,
    value: unknown,
  ): Promise<AccountKeyring> => {
    const keyring = decodeKeyring(value, 'keyring');
    const account = await accountOf(held);
    if (account !== undefined && keyring.account !== account) {
      return refuse(held, 'keyring.account');
    }
    const scope = { account: keyring.account, networkId };
    const encKey = encodeBytes(keyring.encKey);
    if (!held.createdKeys.has(encKey)) {
      await retiredKeys.confirm(scope, encKey);
    }
    if (await retiredKeys.isRetired(scope, encKey)) {
      return refuse(held, 'keyring.encKey');
    }
    return keyring;
  };

  /** Refuses a request field that strays from what the session approved. */
  const refuse = (held: HeldKeySession, argument: string): never => {
    throw new FlowScopeError(held.flow.kind, { argument });
  };

  /**
   * Records what an authorisation the session just signed settles: a
   * rotation names the key the session may now seal the secret of and
   * links the key it replaced to it, retired only once a later session
   * shows the rotation landed; an issue lets the session seal the secret
   * to its grant, and a read grant's issue names the read key the user
   * approved, which a later rotation may seal the new secret towards;
   * and a revocation forgets the key of the grant it revokes, a
   * revoke-all every key of the account, each marked as revoked for the
   * asking origin. The keys are forgotten once the revocation is signed,
   * not once it lands, since the signer cannot see the chain.
   */
  const noteAuthorised = async (
    held: HeldKeySession,
    { account, circuit, args }: AuthorisationBinding,
    dappOrigin: string | undefined,
  ): Promise<void> => {
    const { flow } = held;
    const origin =
      dappOrigin === undefined ? undefined : originHost(dappOrigin);
    switch (circuit) {
      case ROTATE_ENC_KEY_CIRCUIT: {
        const key = bytesArgument(args);
        const created =
          key === undefined ? undefined : held.createdKeys.get(key);
        if (key === undefined || created === undefined) return;
        held.rotatedTo = {
          key,
          networkId: created.networkId,
          rotateRoster: created.rotateRoster,
          authority: created.authority,
        };
        if (created.from !== undefined) {
          await retiredKeys.link(
            { account, networkId: created.networkId },
            created.from,
            key,
          );
        }
        return;
      }
      case ISSUE_GRANT_CIRCUIT:
        if (flow.kind === 'issue-grant') held.isIssueSigned = true;
        if (
          flow.kind === 'issue-grant' &&
          flow.scope.readPublicKey !== undefined &&
          held.rotatedTo !== undefined
        ) {
          await readKeys.remember(
            { account: flow.account, networkId: held.rotatedTo.networkId },
            flow.grantId,
            flow.scope.readPublicKey,
          );
        }
        return;
      case REVOKE_GRANT_CIRCUIT:
        if (flow.kind === 'revoke-grant') {
          await readKeys.forget(account, flow.grantId, origin);
        }
        return;
      case REVOKE_ALL_GRANTS_CIRCUIT:
        await readKeys.forgetAll(account, origin);
        return;
    }
  };

  /**
   * Names the field a seal request strays from its approval on: the
   * secret sealed must be the one the session rotated the key to, on the
   * same network, for the descriptor's account, and the read key must be
   * the one the user approved for that grant: this session's descriptor
   * for the grant an issue issues, once the session signed the issue
   * bound to that grant, so a dApp cannot take the secret and skip the
   * issue that lists the grant for revocation; and the keys approved on
   * this signer, and not revoked since, for any other grant, which a
   * revocation never names its own grant among.
   */
  const unboundSealTarget = async (
    held: HeldKeySession,
    { key, networkId }: RotatedKey,
    { grantId, account, readPublicKey }: GrantViewSealRequest,
  ): Promise<string | undefined> => {
    const { flow, rotatedTo } = held;
    if (rotatedTo?.key !== key) return 'keyring';
    if (rotatedTo.networkId !== networkId) return 'networkId';
    if (account !== sessionAccount(flow)) return 'account';
    if (flow.kind === 'issue-grant' && grantId === flow.grantId) {
      if (!held.isIssueSigned) return 'issue';
      return readPublicKey === flow.scope.readPublicKey
        ? undefined
        : 'readPublicKey';
    }
    if (flow.kind === 'revoke-grant' && grantId === flow.grantId) {
      return 'grantId';
    }
    return (await readKeys.isApproved(
      { account, networkId },
      grantId,
      readPublicKey,
    ))
      ? undefined
      : 'readPublicKey';
  };

  /**
   * Refuses a creation the stored unfinished creation it reads, unless
   * the creation was started from the asking origin and with the lock
   * choice this descriptor names, so the consent showed the choice that
   * applies. Another lock choice is refused with
   * CreationLockMismatchError naming the recorded one, as a local
   * creation refuses it, which the asking origin may learn since it
   * started the creation.
   */
  const assertResumable = async (
    held: HeldKeySession,
    {
      flow,
      deployment,
      dappOrigin,
    }: {
      flow: CreationFlow;
      deployment: PassportAccountRecord['deployment'];
      dappOrigin: string | undefined;
    },
  ): Promise<void> => {
    if (deployment === undefined) return;
    await creatingHost(held, dappOrigin);
    if (!isPendingDeployment(deployment)) {
      return refuse(held, 'lockAccount');
    }
    if (deployment.lockAccount !== flow.lockAccount) {
      throw lockChoiceMismatch(deployment.lockAccount);
    }
  };

  /**
   * The pending deployment a creation's write leaves stored. Over a
   * complete record nothing is written. Only the origin that drew the
   * creation's keys writes a pending record over empty storage, carrying
   * the whole deployment with the lock choice the descriptor names and
   * the handover authority of keys this session drew, so the authority
   * an unlocked account is handed to is one its roster key derives, and
   * only it writes over a pending one, under the lock choice that one
   * was started with, keeping that deployment as it is or dropping it to
   * complete the record.
   */
  const writtenCreation = async (
    held: HeldKeySession,
    flow: CreationFlow,
    {
      stored,
      written,
      dappOrigin,
    }: {
      stored: PassportAccountRecord | undefined;
      written: PassportAccountRecord['deployment'];
      dappOrigin: string | undefined;
    },
  ): Promise<PendingDeployment | undefined> => {
    if (stored && stored.deployment === undefined) refuse(held, 'record');
    if (stored === undefined && written === undefined) return undefined;
    await creatingHost(held, dappOrigin);
    if (
      stored?.deployment !== undefined &&
      (!isPendingDeployment(stored.deployment) ||
        stored.deployment.lockAccount !== flow.lockAccount)
    ) {
      refuse(held, 'lockAccount');
    }
    if (written === undefined) return undefined;
    if (!isPendingDeployment(written)) {
      return refuse(held, 'record.deployment');
    }
    if (stored?.deployment === undefined) {
      if (written.lockAccount !== flow.lockAccount) {
        return refuse(held, 'record.deployment.lockAccount');
      }
      return [...held.createdKeys.values()].some(({ authority }) =>
        isSameAuthority(authority, written.handoverAuthority),
      )
        ? written
        : refuse(held, 'record.deployment.handoverAuthority');
    }
    return isPendingDeployment(stored.deployment) &&
      isSameDeployment(stored.deployment, written)
      ? written
      : refuse(held, 'record.deployment');
  };

  /**
   * The deployment a write outside a creation leaves stored: the one
   * stored, whatever the write carries. A write that names a deployment
   * at all is refused, so no other flow adds, changes or drops it; an
   * unfinished creation stays pending until its creation completes it.
   */
  const keptDeployment = (
    held: HeldKeySession,
    stored: PassportAccountRecord | undefined,
    written: PassportAccountRecord['deployment'],
  ): PassportAccountRecord['deployment'] => {
    if (written !== undefined) refuse(held, 'record.deployment');
    return stored?.deployment;
  };

  /**
   * The grants a write leaves stored: those kept under other origins as
   * they are stored, and the asking origin's as the write carries them,
   * so a dApp changes only the bookkeeping of grants issued under its own
   * origin. A write is refused when it carries an entry kept under
   * another origin, an id another origin's entry is stored under, which
   * would replace that entry since grant ids are public on chain, or an
   * id that does not derive from the account, the entry's grantee key
   * under its scheme, its slot and the asking hostname.
   */
  const mergedGrants = async (
    held: HeldKeySession,
    {
      account,
      stored,
      written,
      dappOrigin,
    }: {
      account: string;
      stored: StoredGrants | undefined;
      written: StoredGrants | undefined;
      dappOrigin: string | undefined;
    },
  ): Promise<StoredGrants | undefined> => {
    const host = dappOrigin === undefined ? undefined : originHost(dappOrigin);
    const own = Object.entries(written ?? {});
    const others = Object.entries(stored ?? {}).filter(
      ([, grant]) => grant.origin !== host,
    );
    const otherIds = new Set(others.map(([id]) => id));
    if (
      own.some(([id, grant]) => grant.origin !== host || otherIds.has(id)) ||
      (host !== undefined &&
        own.length > 0 &&
        !(await derivesOwnGrantIds(account, host, own)))
    ) {
      refuse(held, 'record.grants');
    }
    const merged = Object.fromEntries([...others, ...own]);
    return Object.keys(merged).length > 0 ? merged : undefined;
  };

  const releaseKeySession = async (): Promise<void> => {
    if (expiredFlow) {
      expiredFlow = undefined;
      throw new SessionExpiredError('flow-close');
    }
    const held = heldSession;
    if (!held) return;
    heldSession = undefined;
    timers.clearTimeout(held.deadline);
    held.release();
    await held.settled;
  };

  return {
    'flow-open': async ({ flow }, dappOrigin) =>
      openKeySession(flow, dappOrigin),
    'flow-close': async outcome => {
      await releaseKeySession();
      return outcome;
    },
    'device-public-key': async () => {
      requireScopedRequest('device-public-key');
      return encodePoint(await authoriser.devicePublicKey());
    },
    'device-commitments': async ({ account, epoch, counters }) => {
      requireScopedRequest('device-commitments');
      return authoriser.deviceCommitments(
        AccAddress(account),
        DeviceEpoch(decodeBigInt(epoch, 'epoch')),
        decodeBigInts(counters, 'counters').map(UseCounter),
      );
    },
    authorise: async (
      { account, circuit, args, witnessValues, authNonce, useCounter },
      dappOrigin,
    ) => {
      const binding = { account, circuit, args };
      const held = requireScopedRequest('authorise', binding);
      await assertRotationBound(held, binding, dappOrigin);
      assertRemovalRotated(held, circuit);
      assertSingleRevocation(held, circuit);
      const authorisation = encodeAuthorisation(
        await authoriser.authorise({
          account: AccAddress(account),
          circuit,
          args,
          witnessValues,
          authNonce: decodeBigInt(authNonce, 'authNonce'),
          useCounter: UseCounter(decodeBigInt(useCounter, 'useCounter')),
        }),
      );
      await noteAuthorised(held, binding, dappOrigin);
      return authorisation;
    },
    'reader-public-key': async ({ networkId }) => {
      requireScopedRequest('reader-public-key');
      return encodeBytes(await encryptionKey.readerPublicKey(networkId));
    },
    'create-keys': async (
      {
        networkId,
        devicePublicKey,
        keyring,
        registrations,
        readers,
        rotateRoster,
        removed,
      },
      dappOrigin,
    ) => {
      const held = requireScopedRequest('create-keys');
      const isCreation = held.flow.kind === 'create-account';
      if ((keyring === undefined) !== isCreation) refuse(held, 'keyring');
      if (isCreation && dappOrigin === undefined) refuse(held, 'origin');
      if (isCreation && readers !== undefined && readers.length > 0) {
        refuse(held, 'readers');
      }
      const isFreshRoster =
        rotateRoster === undefined
          ? false
          : decodeBoolean(rotateRoster, 'rotateRoster');
      if (
        (held.flow.kind === 'remove-device' ||
          held.flow.kind === 'add-device') &&
        !isFreshRoster
      ) {
        refuse(held, 'rotateRoster');
      }
      assertEntryBound(registrations);
      assertEntryBound(readers);
      const own = encodeDevicePublicKey(await authoriser.devicePublicKey());
      if (devicePublicKey !== own) refuse(held, 'devicePublicKey');
      const admitted =
        keyring === undefined
          ? undefined
          : await admitKeyring(held, networkId, keyring);
      const named = (readers ?? []).map((reader, index) =>
        decodeLiveReader(reader, `readers[${index}]`),
      );
      if (removed !== undefined && held.flow.kind !== 'remove-device') {
        refuse(held, 'removed');
      }
      const removedDevice =
        removed === undefined
          ? undefined
          : decodeRemovedDevice(removed, 'removed');
      if (admitted) {
        const argument =
          (await unboundReaders(held.flow, admitted.account, named)) ??
          (await unboundRemoval(held.flow, admitted.account, {
            readers: named,
            removed: removedDevice,
          }));
        if (argument !== undefined) refuse(held, argument);
      }
      const keys = await encryptionKey.createKeys(networkId, {
        devicePublicKey: own,
        ...(admitted ? { keyring: admitted } : {}),
        ...(registrations === undefined
          ? {}
          : {
              registrations: decodeInboxEntries(registrations, 'registrations'),
            }),
        readers: named,
        rotateRoster: isFreshRoster,
        ...(removedDevice ? { removed: removedDevice } : {}),
      });
      if (isCreation && dappOrigin !== undefined) {
        await creationEntries.keep(
          originHost(dappOrigin),
          [...keys.envelopes, ...keys.registrations].map(entry =>
            encodeBytes(entry),
          ),
        );
      }
      held.createdKeys.set(encodeBytes(keys.encKey), {
        networkId,
        from: admitted ? encodeBytes(admitted.encKey) : undefined,
        rotateRoster: isFreshRoster,
        authority: keys.authority,
      });
      produce(held, [...keys.envelopes, ...keys.registrations]);
      return encodeAccountKeys(keys);
    },
    'seal-to-device': async ({ networkId, keyring, reader }) => {
      const held = requireScopedRequest('seal-to-device');
      const { flow } = held;
      const named = decodeLiveReader(reader, 'reader');
      if (
        flow.kind !== 'add-device' ||
        named.readerPublicKey !== flow.reader?.readerPublicKey ||
        named.devicePublicKey !== flow.reader?.devicePublicKey ||
        named.counter !== 0n ||
        (await loadDeviceEntryDerivation()).deviceEntryOf(
          { address: flow.account, epoch: named.epoch },
          named.devicePublicKey,
          0n,
        ) !== flow.commitmentHex
      ) {
        return refuse(held, 'reader');
      }
      const admitted = await admitKeyring(held, networkId, keyring);
      if (
        flow.devices !== undefined &&
        held.rotatedTo?.key !== encodeBytes(admitted.encKey)
      ) {
        return refuse(held, 'keyring');
      }
      const delivery = await encryptionKey.sealToDevice(
        networkId,
        admitted,
        named,
      );
      produce(held, [delivery.envelope, delivery.registration]);
      return {
        envelope: encodeBytes(delivery.envelope),
        registration: encodeBytes(delivery.registration),
      };
    },
    'find-live-envelope': async ({ networkId, keyring }) => {
      const held = requireScopedRequest('find-live-envelope');
      return findLiveEnvelope(
        networkId,
        await admitKeyring(held, networkId, keyring),
      );
    },
    'open-inbox': async ({ networkId, keyring, entries }, dappOrigin) => {
      const held = requireScopedRequest('open-inbox');
      assertEntryBound(entries);
      const admitted = await admitKeyring(held, networkId, keyring);
      const opened = await encryptionKey.openInbox(
        networkId,
        admitted,
        decodeInboxEntries(entries, 'entries'),
      );
      return (
        await shownToFlow(held.flow, opened, {
          account: admitted.account,
          dappOrigin,
        })
      ).map(entry => encodeOpenedEntry(entry));
    },
    'seal-grant': async ({ networkId, account, grant }) => {
      const held = requireScopedRequest('seal-grant');
      const bookkeeping = decodeGrantBookkeeping(grant, 'grant');
      if (
        held.flow.kind !== 'issue-grant' ||
        decodeAccount(account, 'account') !== held.flow.account ||
        !isApprovedBookkeeping(held.flow, bookkeeping)
      ) {
        return refuse(held, 'grant');
      }
      const entries = await encryptionKey.sealGrant(
        networkId,
        held.flow.account,
        bookkeeping,
      );
      produce(held, entries);
      return entries.map(entry => encodeBytes(entry));
    },
    'reencrypt-inbox': async ({ networkId, keyring, to, entries }) => {
      const held = requireScopedRequest('reencrypt-inbox');
      assertEntryBound(entries);
      const target = encodeBytes(decodeBytes(to, 'to', ENC_KEY_LENGTH));
      if (held.createdKeys.get(target)?.networkId !== networkId) {
        refuse(held, 'to');
      }
      const sealed = await encryptionKey.reencryptInbox(
        networkId,
        {
          keyring: await admitKeyring(held, networkId, keyring),
          to: ByteArray.fromHex(HexBytes(target)),
        },
        decodeInboxEntries(entries, 'entries'),
      );
      produce(held, sealed);
      return sealed.map(entry => (entry === null ? null : encodeBytes(entry)));
    },
    'seal-view': async (
      { networkId, keyring, grantId, account, readPublicKey },
      dappOrigin,
    ) => {
      const held = requireScopedRequest('seal-view');
      const decoded = await admitKeyring(held, networkId, keyring);
      const target: GrantViewSealRequest = {
        grantId: decodeGrantId(grantId, 'grantId'),
        account: decodeAccount(account, 'account'),
        readPublicKey: encodeBytes(
          decodeBytes(readPublicKey, 'readPublicKey', READ_KEY_LENGTH),
        ),
      };
      const argument = await unboundSealTarget(
        held,
        { key: encodeBytes(decoded.encKey), networkId },
        target,
      );
      if (argument !== undefined) {
        if (
          argument === 'readPublicKey' &&
          dappOrigin !== undefined &&
          (await readKeys.isRevocationSigned(
            { account: target.account, networkId },
            target.grantId,
            {
              readPublicKey: target.readPublicKey,
              origin: originHost(dappOrigin),
            },
          ))
        ) {
          throw new GrantRevocationPendingError();
        }
        return refuse(held, argument);
      }
      const delivery = await encryptionKey.sealView(networkId, decoded, target);
      produce(held, [delivery.entry]);
      return {
        seal: encodeBytes(delivery.seal),
        entry: encodeBytes(delivery.entry),
      };
    },
    'sign-maintenance-update': async ({
      networkId,
      keyring,
      authority,
      counter,
      changes,
    }) => {
      const held = requireScopedRequest('sign-maintenance-update');
      const request = {
        authority: decodeMaintenanceKey(authority, 'authority'),
        counter: decodeBigInt(counter, 'counter'),
        changes: decodeMaintenanceChanges(changes, 'changes'),
      };
      const admitted = await admitKeyring(held, networkId, keyring);
      const argument = unboundMaintenance(
        held,
        { key: encodeBytes(admitted.encKey), networkId },
        request.changes,
      );
      if (argument !== undefined) refuse(held, argument);
      try {
        return encodeSignedMaintenanceUpdate(
          await encryptionKey.signMaintenanceUpdate(networkId, {
            ...request,
            keyring: admitted,
          }),
        );
      } catch (error) {
        if (error instanceof MaintenanceAuthorityMismatchError) return null;
        throw error;
      }
    },
    'holds-maintenance-authority': async ({
      networkId,
      keyring,
      authority,
    }) => {
      const held = requireScopedRequest('holds-maintenance-authority');
      const decoded = decodeMaintenanceKey(authority, 'authority');
      return encryptionKey.holdsMaintenanceAuthority(
        networkId,
        await admitKeyring(held, networkId, keyring),
        decoded,
      );
    },
    'record-read': async (_payload, dappOrigin) => {
      const held = requireScopedRequest('record-read');
      const stored = await records.read();
      if (!stored) return undefined;
      if (held.flow.kind === 'create-account') {
        await assertResumable(held, {
          flow: held.flow,
          deployment: stored.deployment,
          dappOrigin,
        });
      }
      return shownRecord(
        held.flow,
        stored,
        dappOrigin === undefined ? undefined : originHost(dappOrigin),
      );
    },
    'record-write': async ({ record }, dappOrigin) => {
      const held = requireScopedRequest('record-write');
      const decoded = decodeRecord(record, 'record');
      if (!decoded) throw new MalformedPayloadError('record');
      const stored = await records.read();
      if (!stored && held.flow.kind !== 'create-account') {
        refuse(held, 'record');
      }
      if (stored && decoded.address !== stored.address) {
        refuse(held, 'record.address');
      }
      const deployment =
        held.flow.kind === 'create-account'
          ? await writtenCreation(held, held.flow, {
              stored,
              written: decoded.deployment,
              dappOrigin,
            })
          : keptDeployment(held, stored, decoded.deployment);
      const grants = await mergedGrants(held, {
        account: decoded.address,
        stored: stored?.grants,
        written: decoded.grants,
        dappOrigin,
      });
      await records.write({
        address: decoded.address,
        bindingVersion: decoded.bindingVersion,
        localUseCounter: decoded.localUseCounter,
        ...(deployment === undefined ? {} : { deployment }),
        ...(grants === undefined ? {} : { grants }),
      });
      if (deployment === undefined) await creationEntries.clear();
    },
    'record-exists': async () => records.presence(),
  };
};
