// The request kinds the Passport account and custody account features add to
// the signer protocol. The stable SDK build resolves protocol-extensions.stable.ts
// instead, which adds none.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

export type SignerFlowKind =
  | 'add-device'
  | 'create-account'
  | 'install-operations'
  | 'issue-grant'
  | 'read-holdings'
  | 'remove-device'
  | 'revoke-all-grants'
  | 'revoke-grant'
  | 'sign-in';

/**
 * What the popup shows the user before it opens a key session for a flow.
 * A device flow carries the 32-byte entry commitment it targets as hex
 * and the `account` it acts on; an add-device flow also carries `reader`
 * when the joining device is handed the account keys: its X25519 reader
 * public key and compressed Jubjub device public key, each as hex, which
 * the user approves sealing the viewing secret to. A device removal
 * always rotates the account encryption key, so the removed device is
 * sealed nothing newer. A create-account flow carries `lockAccount`,
 * whether the creation retires the contract's maintenance authority. A
 * grant flow carries the grant it names and the `account` it acts on:
 * revoke-grant its id, revoke-all-grants nothing more, and issue-grant
 * the account the grant is issued from, the scope the user is asked to
 * grant as the Passport module types it, the slot and scope salt the
 * grant id and scope digest derive from, and that id and digest as the
 * dApp computed them. The signer
 * re-derives both from the scope, the slot, the salt and the dApp origin
 * it observes, and refuses the flow when either differs. A revoke flow
 * carries `read` when the revocation rotates the account encryption key,
 * which the session then serves the rotation circuits for. A flow that rotates the key, a
 * removal, a read grant's issue, a rotating revocation or an enrolment
 * that hands over the keys while a read grant is live, also carries
 * `devices`, the live device entries as hex whose devices the new secret
 * may be sealed to, the removed one left out; consent lists them. An
 * install-operations flow carries the `account` it upgrades and the
 * `operations` whose verifier keys the account's maintenance authority
 * signs in. Every hex field other than the commitment is lowercase.
 */
export type SignerFlow = {
  kind: SignerFlowKind;
  commitmentHex?: string;
  account?: string;
  grantId?: string;
  scope?: unknown;
  slot?: number;
  scopeSalt?: string;
  scopeDigest?: string;
  read?: boolean;
  reader?: { readerPublicKey: string; devicePublicKey: string };
  devices?: string[];
  lockAccount?: boolean;
  operations?: string[];
};

/**
 * The account keys a request opens: the `account` they belong to, its
 * `enc_key` and this device's own envelopes from the inbox, newest
 * first, at most as many as one inbox request carries, each as the hex
 * of its bytes. The signer trusts a secret only once it derives
 * `enc_key`.
 */
export type SignerKeyring = {
  account: string;
  encKey: string;
  envelopes: string[];
};

/**
 * The device a removal takes out, as its registration names it: its
 * compressed device key as hex and the device epoch and use counter, as
 * decimal strings, at which it derives the entry being removed.
 */
export type SignerRemovedDevice = {
  devicePublicKey: string;
  epoch: string;
  counter: string;
};

/**
 * A device the account keys are sealed to: its reader and device public
 * keys as hex, and the device epoch and use counter, as decimal strings,
 * at which its device key derives a live entry the flow named.
 */
export type SignerLiveReader = {
  readerPublicKey: string;
  devicePublicKey: string;
  epoch: string;
  counter: string;
};

type EmptyPayload = Record<string, never>;

/**
 * How the flow a flow-open started ended, reported by the dApp when it
 * closes the flow; `code` is the error code the dApp saw, or `unexpected`.
 */
type SignerFlowOutcome =
  | { outcome: 'completed' }
  | { outcome: 'failed'; code: string };

/**
 * The request payloads the Passport account and custody account features add,
 * by kind; the string fields epoch, counters, authNonce and useCounter carry
 * decimal bigints.
 */
export type ExtensionSignerRequestPayloads = {
  'flow-open': { flow: SignerFlow };
  'flow-close': SignerFlowOutcome;
  'device-public-key': EmptyPayload;
  'device-commitments': { account: string; epoch: string; counters: string[] };
  authorise: {
    account: string;
    circuit: string;
    args: unknown[];
    witnessValues: unknown[];
    authNonce: string;
    useCounter: string;
  };
  /**
   * This device's X25519 reader public key on the network `networkId`
   * names, as hex: what the account's envelopes to it are sealed to.
   */
  'reader-public-key': { networkId: string };
  /**
   * A fresh random account secret sealed to this device and the other
   * readers the account keys name. `devicePublicKey` is this device's
   * compressed Jubjub key as hex, which the signer holds to its own.
   * Without `keyring` the account has no keys yet; with it, the other
   * readers are `readers`, each of which must be registered as named by
   * one of `registrations` (inbox entries as hex) under the live roster
   * key and derive one of the device entries the flow named, at most one
   * reader each, and the roster key is kept unless `rotateRoster` asks
   * for a fresh one; a removal names the device it takes out in
   * `removed` when the roster registers it. The
   * answer carries `encKey`, the new public key, `envelopes`, one per
   * reader, and `registrations`, one per reader when the roster key is
   * fresh, each as hex; the secret never crosses.
   */
  'create-keys': {
    networkId: string;
    devicePublicKey: string;
    keyring?: SignerKeyring;
    registrations?: string[];
    readers?: SignerLiveReader[];
    rotateRoster?: boolean;
    removed?: SignerRemovedDevice;
  };
  /**
   * The live account secret and roster key sealed to the joining device
   * `reader` names, whose device key must derive the enrolled entry at
   * its epoch and use counter 0. The answer carries its `envelope` and its
   * `registration` under the roster key, each as hex.
   */
  'seal-to-device': {
    networkId: string;
    keyring: SignerKeyring;
    reader: SignerLiveReader;
  };
  /**
   * Inbox entries of the Passport account on the network `networkId`
   * names, each as the hex of its 192 bytes, to open with the secrets the
   * keyring delivers. The answer carries one item per entry in order: a
   * coin, with its nonce and colour as hex and its value as a decimal
   * string; a device the live roster key registers; a part of the
   * bookkeeping of a grant this device issued; or null for an entry that
   * does not open.
   */
  'open-inbox': {
    networkId: string;
    keyring: SignerKeyring;
    entries: string[];
  };
  /**
   * Where the live envelope sits in one page of this device's envelopes,
   * the keyring's, newest first: the answer is the position of the
   * oldest whose secret derives `enc_key`, or null when none does, and
   * no secret crosses. A device with more envelopes than one keyring
   * carries is paged through it, oldest page first, and the keyring of
   * its other requests starts at the envelope found.
   */
  'find-live-envelope': { networkId: string; keyring: SignerKeyring };
  /**
   * The bookkeeping of the grant the session issues, sealed to this
   * device alone: the grant id, slot, scope salt, grantee key and object
   * fields as the issue descriptor names them, and the read key of a
   * read grant. The answer is the grant records as hex.
   */
  'seal-grant': { networkId: string; account: string; grant: unknown };
  /**
   * Inbox entries to move from the secrets the keyring delivers to the
   * account key `to` (hex), each as the hex of its 192 bytes. The answer
   * carries one item per entry in order: the fresh entry as hex, or null
   * for an entry that does not open; no coin description crosses.
   */
  'reencrypt-inbox': {
    networkId: string;
    keyring: SignerKeyring;
    to: string;
    entries: string[];
  };
  /**
   * The live account secret of the keyring sealed towards the grantee's
   * X25519 read public key `readPublicKey` (hex), bound to the grant
   * `grantId` and the account `account` (both hex). The answer carries
   * `seal`, the hex of the 94-byte GrantViewSeal container, and `entry`,
   * the grant record that keeps it on chain for this device. The signer
   * serves it only for a key it rotated the account to in the same
   * session and only towards a read key the user approved a read grant
   * for. A read key it forgot because it signed that grant's revocation
   * for the asking origin is refused with the `grant-revocation-pending`
   * code, so the dApp can tell a revocation that never landed from a
   * key that was never approved.
   */
  'seal-view': {
    networkId: string;
    keyring: SignerKeyring;
    grantId: string;
    account: string;
    readPublicKey: string;
  };
  /**
   * One maintenance update of the keyring's account, signed by the
   * maintenance authority one of the roster keys its envelopes deliver
   * derives: `authority`, the verifying key of the account's one-key
   * committee, and `counter`, as decimal, as the chain holds them, and
   * `changes`, either the replace of that authority by the one the
   * keyring's live roster key derives, or the inserts of pinned verifier
   * keys, each key as hex. The signer builds the update from these and
   * never signs bytes it is sent. The keyring carries the live envelope
   * and, beside it, at most as many others as one request carries; the
   * answer is the signature, with the authority a replace installs, or
   * null when no roster key of those envelopes derives `authority`, so a
   * device with more envelopes pages the older ones beside the live one.
   */
  'sign-maintenance-update': {
    networkId: string;
    keyring: SignerKeyring;
    authority: { tag: string; value: string };
    counter: string;
    changes:
      | {
          kind: 'insert-verifier-keys';
          inserts: { operation: string; verifierKey: string }[];
        }
      | {
          kind: 'replace-authority';
          authority: { tag: string; value: string };
        };
  };
  /**
   * Whether any roster key the keyring's envelopes deliver derives
   * `authority`, the verifying key of the account's one-key committee as
   * the chain holds it, which a removal and a rotating enrolment ask
   * before they rotate. The keyring is paged as for
   * `sign-maintenance-update`; the answer is a boolean and no key
   * crosses.
   */
  'holds-maintenance-authority': {
    networkId: string;
    keyring: SignerKeyring;
    authority: { tag: string; value: string };
  };
  'record-read': EmptyPayload;
  'record-write': { record: unknown };
  'record-exists': EmptyPayload;
  /**
   * The CIP-1854 account extended public key whose role 0 keys are this
   * passkey's Cardano custody device keys on the network `chainId` names.
   */
  'cardano-custody-public-key': { chainId: unknown };
  /**
   * One device witness for a Cardano custody account transaction. The signer
   * reads every custody effect from `serializedTx` and refuses before consent
   * when the context does not match the bytes. `resolvedInputs` resolves
   * every body input, reference input and collateral input, each as the
   * CIP-30 `TransactionUnspentOutput` CBOR hex; `accountRecord` is the
   * public account record; `requestedScopes` lists the grants the
   * transaction issues, a replacement's new grant among them, in the
   * requested scope shape with integers as decimal strings. `grantUtxos`
   * lists grant UTxOs of the account in the same CBOR hex, so consent can
   * name the grantee and scope of a grant the transaction revokes and the
   * devices that are also grantees; the signer checks the shape of each and
   * shows what they say as reported by the app. `metadataMeanings` says, by
   * decimal metadata label, what the app reports the transaction's metadata
   * under that label to be; consent shows each beside the metadata read
   * from the bytes, labelled as reported by the app, and the signer refuses
   * a label the transaction does not carry.
   */
  'sign-cardano-custody-tx': {
    serializedTx: string;
    chainId: unknown;
    device: { extendedAccountPublicKey: string; index: number };
    resolvedInputs: unknown[];
    accountRecord: unknown;
    requestedScopes?: unknown[];
    grantUtxos?: unknown[];
    metadataMeanings?: Record<string, string>;
  };
  /**
   * A CIP-8 signature over `payload` (hex) by one custody device key, whose
   * protected header binds the account address, the requesting dApp's origin
   * and `purpose`: proof that the device controls the account, for that
   * site and that purpose only. `controlUtxo` is the account's control UTxO
   * as CIP-30 `TransactionUnspentOutput` CBOR hex, from which the signer
   * reads that the device is listed; consent names `purpose` and the origin.
   * It returns the COSE_Sign1 and the COSE_Key in CBOR hex, and the origin
   * the signature binds.
   */
  'sign-cardano-custody-data': {
    chainId: unknown;
    device: { extendedAccountPublicKey: string; index: number };
    accountRecord: unknown;
    controlUtxo: string;
    payload: string;
    purpose: 'link-account' | 'sign-in';
  };
};
