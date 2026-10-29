import type { GrantRecipient, GrantScopeInput } from './grants';
import type {
  AccAddress,
  DeviceCommitmentHex,
  DeviceEpoch,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  UseCounter,
} from './value-objects';

/**
 * Signature scheme used by a Passport authoriser: the Jubjub Schnorr
 * scheme.
 */
export type AuthScheme = 'jubjub-schnorr';

/**
 * Signature scheme of the key a grant is issued to: the Jubjub Schnorr
 * scheme, or plain secp256k1 ECDSA over the SHA-256 digest of the
 * challenge. A grantee scheme never authorises a device.
 */
export type GranteeScheme = 'jubjub-schnorr' | 'secp256k1-ecdsa';

/**
 * A circuit call awaiting authorisation by a device key.
 */
export interface AuthorisationRequest {
  account: AccAddress;
  circuit: string;
  args: readonly unknown[];
  witnessValues: readonly unknown[];
  authNonce: bigint;
  useCounter: UseCounter;
}

/**
 * Proof of authorisation produced by a device key for one
 * AuthorisationRequest, under the scheme `scheme` names.
 */
export type Authorisation = {
  scheme: 'jubjub-schnorr';
  pk: { x: bigint; y: bigint };
  useCounter: bigint;
  sigR: { x: bigint; y: bigint };
  sigS: bigint;
  grindNonce: bigint;
};

/**
 * Names the flow a key session is opened for, so an authoriser whose
 * ceremony runs behind a consent step can show the user what they
 * approve. `commitmentHex` is the device entry a device flow targets,
 * with the `account` it acts on, and `grantId` the grant an issue or
 * revoke flow names. An add-device flow carries `reader` when the joining
 * device is handed the account keys: its reader key and device key, which
 * the user approves sealing the viewing secret to. An issue flow also
 * carries `scope`, the limits it asks the user to grant, with `account`,
 * `slot`, `scopeSalt` and `scopeDigest`, the salted digest of that scope
 * as 32-byte lowercase hex: an authoriser that does not share the flow's
 * memory re-derives the grant id and the digest from them before it
 * signs over them. A revoke flow carries the `account` whose grants it
 * revokes, and `read` when the revocation rotates the account encryption
 * key, because the grant it revokes holds the viewing secret or, for a
 * revoke-all, some grant does; the new secret is then sealed again to the
 * read grants that stay live. A create-account flow carries
 * `lockAccount`, whether the creation retires the contract's maintenance
 * authority. A device removal always rotates the
 * key, so the removed device is sealed nothing newer, and an add-device
 * flow that hands over the keys while a read grant is live rotates them
 * first. A flow that rotates the key carries `devices`, the live device entries, as 32-byte
 * lowercase hex, whose devices the new secret may be sealed to, the
 * removed one left out, so the user sees who keeps reading. An
 * install-operations flow carries the `account` it upgrades and the
 * `operations` whose verifier keys the account's maintenance authority
 * signs in, in installation order.
 */
export type KeySessionFlow = {
  kind:
    | 'add-device'
    | 'create-account'
    | 'install-operations'
    | 'issue-grant'
    | 'read-holdings'
    | 'remove-device'
    | 'revoke-all-grants'
    | 'revoke-grant'
    | 'sign-in';
  commitmentHex?: string;
  grantId?: GrantId;
  scope?: GrantScopeInput;
  account?: AccAddress;
  slot?: GrantSlot;
  scopeSalt?: GrantScopeSalt;
  scopeDigest?: string;
  read?: boolean;
  reader?: DeviceReader;
  devices?: string[];
  lockAccount?: boolean;
  operations?: string[];
};

/**
 * Curve-agnostic device authoriser. Wraps one device's passkey-derived
 * signing key and produces authorisations for Account Custody Contract
 * circuit calls.
 */
export interface PassportAuthoriser {
  readonly scheme: AuthScheme;
  deviceCommitment: (
    account: AccAddress,
    epoch: DeviceEpoch,
    counter: UseCounter,
  ) => Promise<DeviceCommitmentHex>;
  /**
   * Computes the device entry commitment for many candidate counters
   * within a single key ceremony, so implementations backed by an
   * interactive ceremony (one user prompt per key access) can amortise
   * the prompt across the batch. Returns one commitment per counter, in
   * order. Optional: callers fall back to per-counter deviceCommitment
   * when absent.
   */
  deviceCommitments?: (
    account: AccAddress,
    epoch: DeviceEpoch,
    counters: readonly UseCounter[],
  ) => Promise<DeviceCommitmentHex[]>;
  devicePublicKey: () => Promise<{ x: bigint; y: bigint }>;
  authorise: (request: AuthorisationRequest) => Promise<Authorisation>;
  /**
   * AES-GCM key derived from the same key source as the signing key, used
   * to seal the persisted account record at rest. Optional: authorisers
   * without a second derivable secret (the dev authoriser) leave the
   * record unsealed. Implementations must not rely on `this`; callers
   * pass the function around detached.
   */
  storageKey?: () => Promise<CryptoKey>;
  /**
   * Runs `operation` under a single key ceremony, so an implementation
   * backed by an interactive ceremony (one user prompt per key access)
   * prompts once for a whole flow instead of once per call. A nested call
   * joins the open session rather than starting another. The derived key
   * material lives only until the operation settles and is destroyed
   * afterwards. `flow` names the flow the session serves, for an
   * implementation that presents it before the ceremony; a local
   * ceremony ignores it. Optional: an implementation without an
   * interactive ceremony omits it, and callers then run the operation
   * directly. Implementations must not rely on `this`; callers pass the
   * function around detached.
   */
  withKeySession?: <T>(
    operation: () => Promise<T>,
    flow?: KeySessionFlow,
  ) => Promise<T>;
}

/**
 * One shielded coin as an inbox entry describes it: the Zswap nonce and
 * token colour as 32 raw bytes each, and the value as an unsigned 128-bit
 * integer. With the account address it determines the coin's commitment.
 */
export type ShieldedCoin = {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
};

/**
 * One enrolled device as the account's roster names it: the X25519
 * reader public key the account keys are sealed to and the compressed
 * Jubjub device public key whose rolling entries the contract holds,
 * each as 32-byte lowercase hex. The reader key is derived from the
 * device's own passkey, never from its device key, so the two link only
 * through this pairing.
 */
export type DeviceReader = { readerPublicKey: string; devicePublicKey: string };

/**
 * What a call opens the account keys from: the account they belong to,
 * the `enc_key` its ledger holds, raw 32 bytes, and this device's own
 * envelopes from the inbox, newest first. The live secret is whichever
 * envelope's secret derives `enc_key`; the older ones still open what an
 * interrupted rotation left under an earlier key.
 */
export type AccountKeyring = {
  account: AccAddress;
  encKey: Uint8Array;
  envelopes: readonly Uint8Array[];
};

/**
 * An enrolled device the account keys are sealed to, with where its live
 * entry is: the device epoch and use counter at which its device key
 * derives an entry the ledger's device set holds. A signer that cannot
 * read the chain checks the entry against the ones the user approved.
 */
export type LiveDeviceReader = DeviceReader & {
  epoch: bigint;
  counter: bigint;
};

/**
 * What a fresh account secret is created for. `devicePublicKey` is this
 * device's compressed Jubjub key as 32-byte lowercase hex, so this
 * device is always among the readers. Without a `keyring` the account
 * has no keys yet, as at creation, and a fresh roster key is drawn.
 * With one, the other readers are `readers`, the devices the caller
 * resolved live against the ledger, each of which must be one the
 * `registrations` name under the live roster key; the roster key is kept
 * unless `rotateRoster` asks for a fresh one, as a device removal does,
 * and `removed` names the device a removal takes out, see
 * {@link RemovedDevice}.
 */
export type CreateAccountKeys = {
  devicePublicKey: string;
  keyring?: AccountKeyring;
  registrations?: readonly Uint8Array[];
  readers?: readonly LiveDeviceReader[];
  rotateRoster?: boolean;
  removed?: RemovedDevice;
};

/**
 * The device a removal takes out, as its registration names it: its
 * compressed device key and the epoch and use counter at which that key
 * derives the entry being removed. No reader paired with that device key
 * in the roster, and no reader carrying it, is sealed the new secret.
 */
export type RemovedDevice = {
  devicePublicKey: string;
  epoch: bigint;
  counter: bigint;
};

/** The signature schemes the ledger accepts a maintenance authority in. */
export type MaintenanceSignatureKind = 'ecdsa' | 'schnorr';

/**
 * A verifying key of a contract maintenance authority as the ledger
 * represents it: its signature kind and the hex-encoded key. Mirrors the
 * ledger's own shape so it can be carried without the ledger's types.
 */
export type MaintenanceVerifyingKey = {
  tag: MaintenanceSignatureKind;
  value: string;
};

/**
 * A signature over a maintenance update as the ledger represents it: its
 * signature kind and the hex-encoded signature.
 */
export type MaintenanceSignature = {
  tag: MaintenanceSignatureKind;
  value: string;
};

/**
 * A fresh account secret as it leaves the key: its X25519 public key,
 * the `enc_key` a constructor or a rotation installs, one device
 * envelope per reader, and one device registration per reader when the
 * roster key is fresh too, none otherwise. Every item is a 192-byte
 * inbox entry. `authority` is the verifying key of the maintenance
 * authority the delivered roster key derives, which every device holding
 * that roster key can sign as: a rotation that keeps the roster key
 * reports the same one, a fresh roster key a new one.
 */
export type AccountKeys = {
  encKey: Uint8Array;
  envelopes: Uint8Array[];
  registrations: Uint8Array[];
  authority: MaintenanceVerifyingKey;
};

/**
 * One verifier key a maintenance update installs: the operation it
 * verifies and the raw key bytes, which must match the key the module
 * pins for that operation.
 */
export type MaintenanceVerifierKey = {
  operation: string;
  verifierKey: Uint8Array;
};

/**
 * What a maintenance update changes: either it replaces the authority
 * with `authority`, which must be the one the keyring's live roster key
 * derives, or it installs the pinned verifier keys `inserts` lists, at
 * least one.
 */
export type MaintenanceChanges =
  | {
      kind: 'insert-verifier-keys';
      inserts: readonly MaintenanceVerifierKey[];
    }
  | { kind: 'replace-authority'; authority: MaintenanceVerifyingKey };

/**
 * A maintenance update to sign over the account keys: the `keyring` whose
 * roster keys may derive the authority, the `authority` and `counter` the
 * contract holds on chain, and the `changes` to make. The update is
 * built by the key from these, never handed to it as bytes.
 */
export type MaintenanceUpdateRequest = {
  keyring: AccountKeyring;
  authority: MaintenanceVerifyingKey;
  counter: bigint;
  changes: MaintenanceChanges;
};

/**
 * A maintenance update as signed by the authority the chain holds:
 * the signature over the update's data, and `authority`, the verifying
 * key a replace installs, absent for an update that keeps the authority.
 */
export type SignedMaintenanceUpdate = {
  signature: MaintenanceSignature;
  authority?: MaintenanceVerifyingKey;
};

/**
 * The account keys as delivered to a joining device: its envelope of the
 * live secret and roster key, and its registration under that roster
 * key, each a 192-byte inbox entry.
 */
export type DeviceDelivery = { envelope: Uint8Array; registration: Uint8Array };

/**
 * The fields of a grant's object the contract keeps only as a
 * commitment: the token colour as 32-byte lowercase hex, the recipient,
 * and the largest single coin as a decimal string.
 */
export type GrantObjectFields = {
  color: string;
  recipient: GrantRecipient;
  maxCoinValue: string;
};

/**
 * What the owner keeps on chain about a grant it issued, beside what the
 * contract stores: the slot and salt the grant was issued under, the
 * grantee key and its scheme, the object fields its commitment hides and,
 * for a read grant, the read key.
 */
export type GrantBookkeeping = {
  grantId: GrantId;
  slot: GrantSlot;
  scopeSalt: GrantScopeSalt;
  granteeScheme: GranteeScheme;
  granteePublicKey: string;
  readPublicKey?: string;
  object: GrantObjectFields;
};

/**
 * One part of a grant's on-chain bookkeeping as an inbox entry opens it:
 * the grant itself, its object fields, or a view, the hex of a
 * GrantViewSeal with the first bytes of the `enc_key` whose secret it
 * holds, as lowercase hex.
 */
export type GrantRecordPart =
  | { part: 'object'; grantId: GrantId; object: GrantObjectFields }
  | { part: 'view'; grantId: GrantId; encKeyPrefix: string; seal: string }
  | (Omit<GrantBookkeeping, 'object'> & { part: 'grant' });

/**
 * What one inbox entry opened to: a coin sealed to an account secret the
 * keyring holds, a device registered under the live roster key, or a part
 * of the bookkeeping of a grant this device issued.
 */
export type OpenedInboxEntry =
  | { kind: 'coin'; coin: ShieldedCoin }
  | { kind: 'device'; device: DeviceReader }
  | { kind: 'grant'; record: GrantRecordPart };

/**
 * What a viewing secret is sealed for: the grant the seal is delivered
 * under, the account it belongs to and the grantee's X25519 read public
 * key as 32-byte lowercase hex. The grant id and the account are bound
 * into the seal, so a seal for one grant cannot be presented under
 * another.
 */
export type GrantViewSealRequest = {
  grantId: GrantId;
  account: AccAddress;
  readPublicKey: string;
};

/**
 * What a re-encryption moves inbox entries between: they open under the
 * secrets `keyring` delivers and are sealed again towards `to`, the raw
 * 32-byte `enc_key` a rotation steps to.
 */
export type KeyRotation = { keyring: AccountKeyring; to: Uint8Array };

/**
 * A viewing secret as a read grant receives it: the 94-byte GrantViewSeal
 * the grantee opens, and the bookkeeping entry that keeps the seal on
 * chain for this device, a 192-byte inbox entry.
 */
export type GrantViewDelivery = { seal: Uint8Array; entry: Uint8Array };

/**
 * The account encryption key as the Passport module sees it. The account
 * secret is random: drawn fresh at creation and at every rotation, it
 * reaches a device only sealed in a device envelope to that device's
 * reader key, which the key derives per network from its own key source,
 * and it never crosses this seam. Each member opens what it needs from
 * the envelopes it is handed, uses it for the one call and discards it.
 *
 * `readerPublicKey` answers this device's X25519 reader public key on
 * the network `networkId` names, which tags the envelopes addressed to
 * it. `createKeys` draws a fresh secret and seals it, see
 * {@link CreateAccountKeys}. `sealToDevice` seals the live secret and
 * roster key to a joining device, whose entry at use counter 0 is the
 * one it is enrolled under. `openInbox` opens inbox entries, one
 * result per entry in order, null for one nothing opens (wrong length,
 * unknown kind, sealed to another key, or tampered with).
 * `sealGrant` seals a grant's bookkeeping to this device alone on that
 * account, as two entries: the grant and its object fields. Each member that takes a keyring rejects with
 * EncryptionKeyMismatchError when none of its envelopes opens a secret
 * deriving its `enc_key`.
 *
 * The two optional members are what sharing the viewing capability needs,
 * and a key that cannot provide them, such as one that only ever opens
 * entries, leaves them out, which refuses every read grant and device
 * removal. `reencryptInbox` moves entries as a {@link KeyRotation} says
 * and answers ciphertexts alone, null for an entry
 * that did not open, so a rotation never routes a coin description
 * through the host. `sealView` seals the live secret towards a grantee's
 * read key as the container the scoped grants standard defines; the
 * secret leaves the seam only inside that container.
 *
 * The contract's maintenance authority of an unlocked account is the
 * key every enrolled device derives from the roster key, see
 * {@link AccountKeys}. `signMaintenanceUpdate` signs one update as a
 * {@link MaintenanceUpdateRequest} names it, with the roster key, among
 * every one the keyring's envelopes deliver, whose authority the chain
 * holds, so envelopes anyone appends cannot hide it, and answers the
 * signature and, for a replace, the authority it installs. It rejects
 * with MaintenanceAuthorityMismatchError when no roster key derives that
 * authority, and with MaintenanceUpdateRefusedError for changes it does
 * not sign. A key that cannot sign maintenance updates leaves it out.
 * `holdsMaintenanceAuthority` answers whether any roster key the
 * keyring's envelopes deliver derives `authority`, the one key of the
 * committee the chain holds, which a roster rotation checks before it
 * changes anything, so a device that could not move the authority
 * refuses before the rotation lands. Only the answer leaves the seam. A
 * key that leaves it out has the rotation refuse only when it moves the
 * authority.
 */
export interface PassportEncryptionKey {
  readerPublicKey: (networkId: string) => Promise<Uint8Array>;
  createKeys: (
    networkId: string,
    request: CreateAccountKeys,
  ) => Promise<AccountKeys>;
  sealToDevice: (
    networkId: string,
    keyring: AccountKeyring,
    reader: LiveDeviceReader,
  ) => Promise<DeviceDelivery>;
  openInbox: (
    networkId: string,
    keyring: AccountKeyring,
    entries: readonly Uint8Array[],
  ) => Promise<(OpenedInboxEntry | null)[]>;
  sealGrant: (
    networkId: string,
    account: AccAddress,
    grant: GrantBookkeeping,
  ) => Promise<Uint8Array[]>;
  reencryptInbox?: (
    networkId: string,
    rotation: KeyRotation,
    entries: readonly Uint8Array[],
  ) => Promise<(Uint8Array | null)[]>;
  sealView?: (
    networkId: string,
    keyring: AccountKeyring,
    request: GrantViewSealRequest,
  ) => Promise<GrantViewDelivery>;
  signMaintenanceUpdate?: (
    networkId: string,
    request: MaintenanceUpdateRequest,
  ) => Promise<SignedMaintenanceUpdate>;
  holdsMaintenanceAuthority?: (
    networkId: string,
    keyring: AccountKeyring,
    authority: MaintenanceVerifyingKey,
  ) => Promise<boolean>;
}

/**
 * Sponsors the transaction fee for a Passport account operation so the
 * user can transact without holding tokens.
 *
 * `ready`, when given, resolves once the sponsor can balance without
 * further setup, such as syncing the wallet that pays the fees. A flow
 * awaits it before it builds a transaction whose expiry starts when it is
 * built, so setup time never counts against that expiry. Calling it ahead
 * of the first flow starts that setup early.
 */
export interface FeeSponsor {
  balanceAndSign: (unbalancedTx: Uint8Array) => Promise<Uint8Array>;
  ready?: () => Promise<void>;
}

/**
 * Produces or checks a zero-knowledge proof for a circuit call.
 * `keyLocation` names the circuit whose key material the implementation
 * resolves on the client side; the serialized proof preimage travels
 * opaque and the response bytes come back unparsed. The ledger may pass
 * `overwriteBindingInput` when proving; a proof built without it fails
 * on-chain verification, so implementations must forward it verbatim.
 */
export interface PassportProver {
  prove: (
    preimage: Uint8Array,
    keyLocation: string,
    overwriteBindingInput?: bigint,
  ) => Promise<Uint8Array>;
  check: (preimage: Uint8Array, keyLocation: string) => Promise<Uint8Array>;
}

/**
 * Endpoints needed to reach the Midnight network a Passport account is
 * deployed on. `networkId` names the network for the Midnight libraries
 * themselves: it is the segment every address on the network carries in
 * its bech32m prefix and the value transactions are bound to, `undeployed`
 * for a local network and `devnet` for Midnight devnet. `artefactUrl` is
 * the base URL of the hosted contract artefact bundle, which the network
 * itself never serves; the host that runs the module must reach it, so a
 * browser host needs a bundle served with CORS headers for its origin.
 */
export interface PassportNetworkConfig {
  networkId: string;
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  artefactUrl: string;
}

/**
 * Platform-specific capabilities a Passport module implementation must
 * supply: the device authoriser, the encryption key, fee sponsor, prover,
 * and network endpoints.
 */
export interface PassportDependencies {
  passportAuthoriser: PassportAuthoriser;
  passportEncryptionKey: PassportEncryptionKey;
  passportSponsor: FeeSponsor;
  passportProver: PassportProver;
  passportNetwork: PassportNetworkConfig;
}
