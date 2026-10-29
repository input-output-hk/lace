import {
  GrantId,
  GrantLimitReachedError,
  GrantScopeInvalidError,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { pureCircuits } from './acc-module';
import {
  ISSUE_GRANT_CIRCUIT,
  REVOKE_ALL_GRANTS_CIRCUIT,
  REVOKE_GRANT_CIRCUIT,
} from './grant-circuits';
import {
  assertIssueRules,
  circuitScope,
  granteePoint,
  zero32,
} from './grant-rules';

import type { IssueGrantBinding } from './challenges';
import type { GrantCircuitScope, GranteePoint } from './grant-rules';
import type { AccProvingCircuitName } from './manifest';
import type {
  GrantGrantee,
  GrantRecord,
  GrantScopeInput,
} from '@lace-contract/passport';

export { assertIssueRules, circuitScope, granteePoint } from './grant-rules';
export type { GrantCircuitScope } from './grant-rules';

/** Domain tag of the origin hash; it fills its 32-byte pad exactly. */
const GRANT_ORIGIN_TAG = 'midnight:account:grant:origin:v1';
const ORIGIN_TAG_LENGTH = 32;
const SCOPE_SALT_LENGTH = 32;
const GRANT_SLOT_COUNT = 256;
const SCOPE_ARG_COUNT = 16;

/**
 * The signature envelope a secp256k1 grant is bound to: plain ECDSA over
 * the SHA-256 digest of the challenge, the only envelope the contract
 * admits for a spend grant.
 */
export const K256_GRANT_ENVELOPE = 0n;

/**
 * The optional immediate caller pin as the contract's `Maybe<ContractAddress>`
 * encodes it: an absent caller carries the all-zero address.
 */
type MaybeContractAddress = {
  is_some: boolean;
  value: { bytes: Uint8Array };
};

/**
 * The scope arguments in the circuit's declaration order, as
 * `issue_grant_with_jubjub` and `derive_grant_scope_digest` take them.
 */
export type GrantScopeArgs = [
  boolean,
  boolean,
  boolean,
  boolean,
  Uint8Array,
  bigint,
  Uint8Array,
  bigint,
  bigint,
  bigint,
  bigint,
  Uint8Array,
  Uint8Array,
  bigint,
  bigint,
  MaybeContractAddress,
];

/** Lays the scope out in the circuit's declaration order. */
export const scopeArgs = (scope: GrantCircuitScope): GrantScopeArgs => [
  scope.opWithdrawUnshielded,
  scope.opWithdrawShielded,
  scope.opWithdrawShieldedToContract,
  scope.read,
  scope.color,
  scope.recipientKind,
  scope.recipient,
  scope.maxCoinValue,
  scope.perCallCap,
  scope.cap,
  scope.expiresAt,
  scope.rpIdHash,
  scope.readPkHash,
  scope.windowLen,
  scope.windowCap,
  {
    is_some: scope.caller !== undefined,
    value: { bytes: scope.caller ?? zero32() },
  },
];

/**
 * The salted digest of the plaintext scope, the single element through
 * which the issue challenge binds the whole scope, produced by the
 * contract's own pure circuit.
 */
export const scopeDigest = (
  scopeSalt: Uint8Array,
  args: GrantScopeArgs,
): Uint8Array => pureCircuits.derive_grant_scope_digest(scopeSalt, ...args);

/**
 * The commitment the contract stores for a grant's object: the colour,
 * recipient kind and value, and coin bound of its circuit scope, hidden
 * under the scope salt, as lowercase hex, produced by the contract's own
 * pure circuit.
 */
export const grantObjectCommit = (
  scopeSalt: Uint8Array,
  scope: Pick<
    GrantCircuitScope,
    'color' | 'maxCoinValue' | 'recipient' | 'recipientKind'
  >,
): string =>
  HexBytes.fromByteArray(
    pureCircuits.derive_grant_object_commit(
      scopeSalt,
      scope.color,
      scope.recipientKind,
      scope.recipient,
      scope.maxCoinValue,
    ),
  );

/**
 * The origin hash that enters a grant id: SHA-256 of the origin tag padded
 * to 32 bytes followed by the raw UTF-8 bytes of the client id. Computed
 * off chain only, so no circuit exports it. For this module the client id
 * is the relying party id of the consumer issuing the grant.
 */
export const originHash = async (clientId: string): Promise<Uint8Array> => {
  const encoder = new TextEncoder();
  const tag = new Uint8Array(ORIGIN_TAG_LENGTH);
  tag.set(encoder.encode(GRANT_ORIGIN_TAG));
  const client = encoder.encode(clientId);
  const preimage = new Uint8Array(tag.length + client.length);
  preimage.set(tag);
  preimage.set(client, tag.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', preimage));
};

/** A grant id from the bytes a derivation circuit returns. */
const grantIdOf = (id: Uint8Array): GrantId =>
  GrantId(HexBytes.fromByteArray(id));

export type DeriveGrantIdProps = {
  contractAddress: Uint8Array;
  granteePublicKey: GranteePoint;
  originHash: Uint8Array;
  slot: GrantSlot;
};

/**
 * The identity of a grant: the contract's own commitment to the account,
 * the grantee key, the origin hash and the slot, which keys the record in
 * the grants map. Each grantee scheme has its own derivation, and a
 * secp256k1 grant also binds its signature envelope, so the same key
 * bytes never name the same grant under two schemes or two envelopes.
 */
export const deriveGrantId = ({
  contractAddress,
  granteePublicKey,
  originHash: origin,
  slot,
}: DeriveGrantIdProps): GrantId => {
  const self = { bytes: contractAddress };
  switch (granteePublicKey.scheme) {
    case 'jubjub-schnorr':
      return grantIdOf(
        pureCircuits.derive_grant_id_with_jubjub(
          self,
          granteePublicKey.point,
          origin,
          BigInt(slot),
        ),
      );
    case 'secp256k1-ecdsa':
      return grantIdOf(
        pureCircuits.derive_grant_id_with_k256(
          self,
          granteePublicKey.point,
          K256_GRANT_ENVELOPE,
          origin,
          BigInt(slot),
        ),
      );
    default: {
      const unhandled: never = granteePublicKey;
      throw new GrantScopeInvalidError(
        `unsupported grantee scheme "${String(
          (unhandled as { scheme: unknown }).scheme,
        )}"`,
      );
    }
  }
};

type FreeSlotProps = {
  contractAddress: Uint8Array;
  grantee: GrantGrantee;
  originHash: Uint8Array;
  /** The grants the account holds; active ones keep their slot taken. */
  roster: readonly GrantRecord[];
};

type GrantSlotAllocation = { slot: GrantSlot; grantId: GrantId };

/**
 * The first slot under which this grantee and origin have no active grant,
 * with the id derived for it. The contract stores neither grantee nor
 * slot, so the slot is found by deriving the id of each candidate and
 * checking it against the roster. A revoked grant leaves a tombstone the
 * contract lets a new grant overwrite, so its slot counts as free.
 *
 * @throws {@link GrantLimitReachedError} when every slot is taken.
 */
const findFreeSlot = ({
  contractAddress,
  grantee,
  originHash: origin,
  roster,
}: FreeSlotProps): GrantSlotAllocation => {
  const taken = new Set(
    roster.filter(record => record.active).map(record => record.id),
  );
  const granteePublicKey = granteePoint(grantee);
  for (let candidate = 0; candidate < GRANT_SLOT_COUNT; candidate++) {
    const slot = GrantSlot(candidate);
    const grantId = deriveGrantId({
      contractAddress,
      granteePublicKey,
      originHash: origin,
      slot,
    });
    if (!taken.has(grantId)) return { slot, grantId };
  }
  throw new GrantLimitReachedError(
    'Every grant slot of this grantee under this origin is taken.',
  );
};

/** One gated circuit call: the circuit and its own arguments. */
export type GrantCircuitCall = {
  circuit: AccProvingCircuitName;
  args: readonly unknown[];
};

export type PrepareIssueGrantProps = {
  contractAddress: Uint8Array;
  scope: GrantScopeInput;
  originHash: Uint8Array;
  /** The grants the account holds, for slot allocation. */
  roster: readonly GrantRecord[];
  /** Randomness for the scope salt; defaults to Web Crypto. */
  randomBytes?: (length: number) => Uint8Array;
};

export type IssueGrantPreparation = {
  grantId: GrantId;
  slot: GrantSlot;
  /** The fresh salt the grant's commitments hide under; the owner keeps it. */
  scopeSalt: GrantScopeSalt;
  /**
   * The salted digest of the scope the device signs over, as 32-byte
   * lowercase hex, for an authoriser that shows it before the ceremony.
   */
  scopeDigest: string;
  call: GrantCircuitCall;
};

/**
 * Prepares `issue_grant_with_jubjub`: encodes and checks the scope,
 * allocates the grantee's slot, derives the grant id and draws the scope
 * salt. The call's arguments are the grant id, the scope in declaration
 * order and the salt; the authoriser derives the scope digest it signs
 * from those same arguments, and the preparation carries that digest for
 * an authoriser that presents it ahead of the ceremony.
 *
 * @throws {@link GrantScopeInvalidError} when the scope is malformed or
 * breaks an issue rule.
 * @throws {@link GrantLimitReachedError} when the grantee has no free slot.
 */
export const prepareIssueGrant = ({
  contractAddress,
  scope,
  originHash: origin,
  roster,
  randomBytes = length => crypto.getRandomValues(new Uint8Array(length)),
}: PrepareIssueGrantProps): IssueGrantPreparation => {
  const encoded = circuitScope(scope);
  assertIssueRules(encoded);
  const { slot, grantId } = findFreeSlot({
    contractAddress,
    grantee: scope.grantee,
    originHash: origin,
    roster,
  });
  const salt = randomBytes(SCOPE_SALT_LENGTH);
  const args = scopeArgs(encoded);
  return {
    grantId,
    slot,
    scopeSalt: GrantScopeSalt(HexBytes.fromByteArray(salt)),
    scopeDigest: HexBytes.fromByteArray(scopeDigest(salt, args)),
    call: {
      circuit: ISSUE_GRANT_CIRCUIT,
      args: [ByteArray.fromHex(HexBytes(grantId)), ...args, salt],
    },
  };
};

/** Prepares `revoke_grant_with_jubjub` over one grant id. */
export const prepareRevokeGrant = (grantId: GrantId): GrantCircuitCall => ({
  circuit: REVOKE_GRANT_CIRCUIT,
  args: [ByteArray.fromHex(HexBytes(grantId))],
});

/** Prepares `revoke_all_grants_with_jubjub`, which takes no argument. */
export const prepareRevokeAllGrants = (): GrantCircuitCall => ({
  circuit: REVOKE_ALL_GRANTS_CIRCUIT,
  args: [],
});

type ScopeArgumentKind = 'bigint' | 'boolean' | 'bytes' | 'caller';

const SCOPE_ARG_KINDS: readonly ScopeArgumentKind[] = [
  'boolean',
  'boolean',
  'boolean',
  'boolean',
  'bytes',
  'bigint',
  'bytes',
  'bigint',
  'bigint',
  'bigint',
  'bigint',
  'bytes',
  'bytes',
  'bigint',
  'bigint',
  'caller',
];

const isCaller = (value: unknown): value is MaybeContractAddress =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MaybeContractAddress).is_some === 'boolean' &&
  (value as MaybeContractAddress).value?.bytes instanceof Uint8Array;

const isScopeArgument = (value: unknown, kind: ScopeArgumentKind): boolean => {
  switch (kind) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'bigint':
      return typeof value === 'bigint';
    case 'bytes':
      return value instanceof Uint8Array;
    case 'caller':
      return isCaller(value);
  }
};

const isScopeArgs = (values: readonly unknown[]): values is GrantScopeArgs =>
  values.length === SCOPE_ARG_COUNT &&
  values.every((value, index) =>
    isScopeArgument(value, SCOPE_ARG_KINDS[index]),
  );

/**
 * Reads what the issue challenge binds out of the circuit's argument list
 * as it reaches an authoriser: the grant id and the digest of the scope,
 * derived here from the plaintext arguments and the salt so the signer
 * binds the scope it was shown and nothing else.
 *
 * @throws an Error when the arguments are not a grant id, sixteen scope
 * arguments and a scope salt.
 */
export const issueGrantBinding = (
  args: readonly unknown[],
): IssueGrantBinding => {
  const [grantId, ...rest] = args;
  const scopeSalt = rest.at(-1);
  const scope = rest.slice(0, -1);
  if (
    !(grantId instanceof Uint8Array) ||
    !(scopeSalt instanceof Uint8Array) ||
    !isScopeArgs(scope)
  ) {
    throw new Error(
      `Circuit ${ISSUE_GRANT_CIRCUIT} expects a grant id, ${SCOPE_ARG_COUNT} scope arguments and a scope salt`,
    );
  }
  return { grantId, scopeDigest: scopeDigest(scopeSalt, scope) };
};
