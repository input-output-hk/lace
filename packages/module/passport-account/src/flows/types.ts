import type {
  PendingCreationMarker,
  PendingDeployment,
} from '../acc/pending-deployment';
import type {
  GranteeScheme,
  GrantObjectFields,
  GrantRecord,
  PassportAccountInfo,
  PassportDependencies,
  PassportDevice,
} from '@lace-contract/passport';

export type {
  PendingCreationMarker,
  PendingDeployment,
} from '../acc/pending-deployment';

/**
 * What the owner keeps about one grant it issued, because the contract
 * stores neither: the slot the grant id was derived under and the salt
 * its commitments hide under, with the grantee key, its scheme and the
 * origin the id was derived from. The salt is what opens the grant for
 * its grantee, so it lives only inside the sealed record.
 */
export type StoredGrant = {
  slot: number;
  /** 32 bytes as lowercase hex. */
  scopeSalt: string;
  /**
   * The signature scheme of the grantee key. Absent from an entry written
   * before the scheme was kept, which names a jubjub key.
   */
  granteeScheme?: GranteeScheme;
  /** The grantee public key as the scope named it. */
  granteePublicKey: string;
  /** The relying party id the grant's origin hash was computed from. */
  origin: string;
  /**
   * The grant's hidden object fields. Absent from an entry written before
   * they were kept, whose policy cannot be exported.
   */
  object?: StoredGrantObject;
  /** The viewing capability of a read grant. Absent from a spend-only grant. */
  view?: StoredGrantView;
};

/**
 * The scheme of a stored grant's grantee key: the one it kept, or jubjub
 * for an entry written before the scheme was kept.
 */
export const storedGranteeScheme = (
  grant: Pick<StoredGrant, 'granteeScheme'>,
): GranteeScheme => grant.granteeScheme ?? 'jubjub-schnorr';

/**
 * What the owner keeps about the viewing capability a read grant holds:
 * the grantee's X25519 read public key the contract stores only as a
 * hash, which every later rotation seals the new secret to again, and
 * the current seal of the account encryption secret towards it, as the
 * hex of the 94-byte container the scoped grants standard defines, with
 * the `enc_key` whose secret it holds. The seal is absent until the issue
 * sealed it and after a rotation this client could not re-seal.
 */
export type StoredGrantView = {
  /** 32 bytes as lowercase hex. */
  readPublicKey: string;
  /** 94 bytes as lowercase hex. */
  seal?: string;
  /** 32 bytes as lowercase hex. */
  sealedEncKey?: string;
};

/**
 * The fields of a grant's object the contract keeps only as a commitment:
 * the token colour, the recipient and the largest single coin the grant
 * may spend. The grantee needs them to open the commitment.
 */
export type StoredGrantObject = GrantObjectFields;

/** The grants this client issued, keyed by grant id in lowercase hex. */
export type StoredGrants = Record<string, StoredGrant>;

/**
 * The locally persisted identity of a Passport account: enough to
 * recognise the account on a return visit without a passkey ceremony.
 * `localUseCounter` is the decimal string of this device's anti-replay
 * counter; it is stored as a string because the counter is a bigint on
 * chain. `deployment` is present only while the account's creation is
 * unfinished: it holds what a retry needs to complete the deployment,
 * the contract's maintenance authority key included, and is dropped by
 * the write that completes the record. Read through the hosted signer by
 * any flow but the creation, it is only the {@link PendingCreationMarker}.
 * `grants` is present once this client has issued a grant that is still
 * on chain. While a creation is unfinished, `deployment` holds the
 * contract's maintenance authority key, which is full custody of the
 * contract until activation: store the record sealed. Once the creation
 * completes, the record holds no secret.
 */
export type PassportAccountRecord = {
  address: string;
  bindingVersion: string;
  localUseCounter: string;
  deployment?: PendingCreationMarker | PendingDeployment;
  grants?: StoredGrants;
};

/**
 * What is known about the stored record without opening it: nothing is
 * stored, a creation is still in progress, or the account is complete.
 * The distinction is kept beside the sealed record in plaintext, so the
 * create flow can refuse a complete record before it asks for any
 * approval and open only a record it may resume.
 */
export type RecordPresence = 'absent' | 'complete' | 'pending';

/**
 * The flow states a running flow reports as it enters them. 'ceremony' is
 * entered by the host before a flow starts, and 'ready' and 'error' are
 * derived by the host from how the flow's promise settles, so a flow
 * reports only the stages listed here. 'confirming' is the wait for the
 * indexer to reflect a call the chain accepted; 'rotating' is the
 * encryption key rotation a read grant's issue or revocation and a
 * device removal perform, the delivery of the new keys to every device
 * included, and 'reencrypting' the re-encryption of the live holdings
 * that follows it; 'recording' is the delivery of the account keys to a
 * new device, or of a grant's bookkeeping, to the inbox. Each append is
 * a gated call of its own.
 */
export type FlowStage =
  | 'activating'
  | 'confirming'
  | 'deploying'
  | 'proving'
  | 'recording'
  | 'reencrypting'
  | 'rotating'
  | 'sponsoring';

/** Receives each stage as the flow enters it, in order. */
export type FlowProgress = (stage: FlowStage) => void;

/**
 * The promise seam a flow persists the account record through. `read`
 * resolves undefined when nothing is stored, `presence` reports what is
 * stored without opening the record, and `write` resolves once the
 * record is durable.
 */
export type AccountRecords = {
  read: () => Promise<PassportAccountRecord | undefined>;
  write: (record: PassportAccountRecord) => Promise<void>;
  presence: () => Promise<RecordPresence>;
};

/**
 * Everything a flow consumes: the platform seams, the record store, the
 * progress sink, and the relying party id of the host, which is the
 * origin a grant it issues is bound to. Nothing here knows about the
 * store or its streams, so a flow can run under any host that supplies
 * these.
 */
export type FlowContext = {
  seams: PassportDependencies;
  accountRecords: AccountRecords;
  onProgress: FlowProgress;
  rpId: string | undefined;
};

/**
 * The account state a gated call runs against, as the caller last saw it:
 * the ready account, its device roster, and this device's use counter.
 */
export type AccountCallInput = {
  account: PassportAccountInfo;
  devices: PassportDevice[];
  /** Counter this device last knew about; undefined rescans from zero. */
  localUseCounter: string | undefined;
};

/**
 * What a flow leaves behind once an account is ready on this device: the
 * ready account, its device roster, this device's use counter, the
 * account's grant roster, and the `enc_key` the account is at as 32-byte
 * lowercase hex. Shared by createAccount and signIn, whose results carry
 * the same shape.
 */
export type FlowAccountState = {
  account: PassportAccountInfo;
  devices: PassportDevice[];
  localUseCounter: string;
  grants: GrantRecord[];
  encKey: string;
};
