import { GrantLimitReachedError, GrantScopeInvalidError } from './errors';

import type { GranteeScheme } from './types';
import type {
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  TokenColor,
} from './value-objects';

/**
 * Most active grants Lace lets an account hold at once; the contract sets
 * no limit.
 */
export const MAX_GRANTS = 16;

const DECIMAL_PATTERN = /^\d+$/;
const BYTES32_HEX_PATTERN = /^[0-9a-f]{64}$/;
const UINT128_MAX = (1n << 128n) - 1n;
const BYTE_BITS = 8n;

/**
 * A 33-byte SEC1 compressed secp256k1 key as lowercase hex, prefixed
 * 02 or 03: the form a secp256k1 grantee key takes.
 */
export const SECP256K1_COMPRESSED_HEX_PATTERN = /^0[23][0-9a-f]{64}$/;

/** The form a grantee key takes under each scheme a grant can name. */
const GRANTEE_KEY_FORMS: Record<
  GranteeScheme,
  { pattern: RegExp; description: string }
> = {
  'jubjub-schnorr': {
    pattern: BYTES32_HEX_PATTERN,
    description: '32 bytes as lowercase hex',
  },
  'secp256k1-ecdsa': {
    pattern: SECP256K1_COMPRESSED_HEX_PATTERN,
    description: 'a 33-byte compressed secp256k1 point as lowercase hex',
  },
};

/** The grantee schemes a grant can name. */
export const GRANTEE_SCHEMES = Object.keys(
  GRANTEE_KEY_FORMS,
) as readonly GranteeScheme[];

/** Whether `value` is one of the {@link GRANTEE_SCHEMES}. */
export const isGranteeScheme = (value: unknown): value is GranteeScheme =>
  GRANTEE_SCHEMES.some(scheme => scheme === value);

/**
 * Whether `value` is a grantee key in the form `scheme` takes: a jubjub
 * key as 32-byte lowercase hex, a secp256k1 key as the 33-byte compressed
 * point prefixed 02 or 03. Whether a secp256k1 key is a point on the
 * curve is checked where the key is decoded.
 */
export const isGranteeKey = (
  scheme: GranteeScheme,
  value: unknown,
): value is string =>
  typeof value === 'string' && GRANTEE_KEY_FORMS[scheme].pattern.test(value);

/** The prime of Curve25519, the bound a canonical X25519 encoding stays under. */
const CURVE25519_PRIME = (1n << 255n) - 19n;

/**
 * The twelve X25519 public keys of small order, as lowercase hex: the
 * points a shared secret with them is all zero or predictable, which the
 * scoped grants standard refuses as a read key. The last seven are also
 * non-canonical encodings of the first five.
 */
const LOW_ORDER_READ_KEYS: ReadonlySet<string> = new Set([
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0100000000000000000000000000000000000000000000000000000000000000',
  'e0eb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b800',
  '5f9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f1157',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'cdeb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b880',
  '4c9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f11d7',
  'd9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'daffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'dbffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
]);

/**
 * A withdrawal a grant can authorise: spending unshielded tokens, spending
 * shielded tokens, or sending shielded tokens to a contract.
 */
export type GrantOperation =
  | 'withdraw-shielded-to-contract'
  | 'withdraw-shielded'
  | 'withdraw-unshielded';

/**
 * Where a grant lets tokens go. `any` places no limit; the other kinds pin
 * the destination to one 32-byte value, given as lowercase hex.
 */
export type GrantRecipient =
  | { kind: 'any' }
  | { kind: 'coin-public-key'; value: string }
  | { kind: 'contract-address'; value: string }
  | { kind: 'user-address'; value: string };

/**
 * The key a grant is issued to: its signature scheme, and the grantee
 * public key as lowercase hex. A Jubjub Schnorr key is 32 bytes; a
 * secp256k1 ECDSA key is the 33-byte SEC1 compressed point, prefixed 02
 * or 03.
 */
export type GrantGrantee =
  | { scheme: 'jubjub-schnorr'; publicKey: string }
  | { scheme: 'secp256k1-ecdsa'; publicKey: string };

/**
 * Rolling spend limit: no more than `cap` within any `lengthSeconds`
 * window. `cap` is a decimal string.
 */
export type GrantWindow = { lengthSeconds: number; cap: string };

/**
 * What the owner asks a grant to allow. Amounts are decimal strings so no
 * value loses precision. `expiresAt` is POSIX seconds, or null for a grant
 * that never expires. `caller` is the address of the contract allowed to
 * invoke the grant, as 32-byte lowercase hex. A grant that `read`s needs an
 * `rpId`, the domain of the relying party, to bind its viewing capability
 * to that party, and a `readPublicKey`, the grantee's X25519 public key as
 * 32-byte lowercase hex, which the account's viewing secret is sealed
 * towards; the contract stores its hash. Read is total: a grantee holding
 * the secret sees every shielded holding of the account, current and
 * future, until the key is rotated again. A scope carries no rolling
 * window, since the contract reserves the window bounds.
 */
export type GrantScopeInput = {
  grantee: GrantGrantee;
  operations: readonly GrantOperation[];
  color: TokenColor;
  recipient: GrantRecipient;
  maxCoinValue: string;
  perCallCap: string;
  cap: string;
  expiresAt: number | null;
  read?: boolean;
  readPublicKey?: string;
  caller?: string;
  rpId?: string;
};

/**
 * The viewing capability a read grant delivers: the grantee's read public
 * key and the current seal of the account encryption secret towards it,
 * as the hex of the 94-byte container the scoped grants standard
 * defines, with the account `enc_key` whose secret it holds as 32-byte
 * lowercase hex. The seal is replaced on every rotation that keeps the
 * grant live; one whose `enc_key` is not the account's is stale.
 */
export type GrantViewOpening = {
  readPublicKey: string;
  seal: string;
  sealedEncKey: string;
};

/**
 * The limits of a grant as the contract stores them. Object, relying
 * party, viewing key and caller are held as 32-byte commitments in
 * lowercase hex; the contract does not keep their preimages. `expiresAt`
 * is POSIX seconds, or null when the grant never expires, and `window` is
 * null when no rolling limit applies.
 */
export type GrantRecordScope = {
  operations: GrantOperation[];
  read: boolean;
  objectCommit: string;
  perCallCap: string;
  cap: string;
  expiresAt: number | null;
  rpCommit: string;
  readPkHash: string;
  window: GrantWindow | null;
  callerCommit: string;
};

/**
 * Spend counted in the grant's current rolling window: when the window
 * started in POSIX seconds, and the decimal amount spent since.
 */
export type GrantSpentWindow = { start: number; spent: string };

/**
 * What the owner keeps about a grant it issued, because the contract holds
 * only commitments to it: the salt those commitments hide under, the
 * grantee key with its scheme, the relying party id the grant id was
 * derived from, the object fields the commitment hides and, for a read
 * grant, the sealed viewing secret. With the grant's slot and the limits
 * the contract stores in the clear, it is everything the grantee needs to
 * act under the grant.
 */
export type GrantOpening = {
  scopeSalt: GrantScopeSalt;
  granteeScheme: GranteeScheme;
  granteePublicKey: string;
  origin: string;
  color: TokenColor;
  recipient: GrantRecipient;
  maxCoinValue: string;
  /** Present for a read grant whose viewing secret this client sealed. */
  view?: GrantViewOpening;
};

/**
 * A grant as read from the Account Custody Contract. A revoked grant stays
 * in the grants map as an inactive tombstone. `opening` is present for a
 * grant this client issued and still holds the bookkeeping of.
 */
export type GrantRecord = {
  id: GrantId;
  slot: GrantSlot;
  active: boolean;
  epoch: number;
  generation: number;
  issuedAt: number;
  scope: GrantRecordScope;
  spentWindow: GrantSpentWindow;
  opening?: GrantOpening;
};

/**
 * Facts about the account a grant scope is checked against: the current
 * time in POSIX seconds, and how many grants the contract already holds.
 */
export type GrantScopeContext = { nowSeconds: number; grantCount: number };

const requireBytes32Hex = (field: string, value: string): void => {
  if (!BYTES32_HEX_PATTERN.test(value)) {
    throw new GrantScopeInvalidError(
      `${field} must be 32 bytes as lowercase hex`,
    );
  }
};

/**
 * Holds a grantee key to the encoding its scheme takes, see
 * {@link isGranteeKey}.
 *
 * @throws {@link GrantScopeInvalidError} when the key is malformed for its
 * scheme, or the scheme is not one a grant can name.
 */
const requireGranteeKey = ({ scheme, publicKey }: GrantGrantee): void => {
  if (!isGranteeScheme(scheme)) {
    throw new GrantScopeInvalidError(
      `unsupported grantee scheme "${String(scheme)}"`,
    );
  }
  if (!isGranteeKey(scheme, publicKey)) {
    throw new GrantScopeInvalidError(
      `grantee public key must be ${GRANTEE_KEY_FORMS[scheme].description}`,
    );
  }
};

/**
 * The 32-byte little-endian integer a hex X25519 public key encodes.
 */
const decodeLittleEndian = (hex: string): bigint => {
  let value = 0n;
  for (let index = hex.length - 2; index >= 0; index -= 2) {
    value =
      (value << BYTE_BITS) |
      BigInt(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return value;
};

/**
 * Whether a hex X25519 public key is one the account seals secrets to: 32
 * bytes of lowercase hex in the canonical encoding of a coordinate below
 * the curve prime, and none of the small-order points, whose shared
 * secret is all zero or predictable and would seal to nobody. A grant's
 * read key and a device's reader key are both held to it.
 */
export const isSealableX25519Key = (value: string): boolean =>
  BYTES32_HEX_PATTERN.test(value) &&
  !LOW_ORDER_READ_KEYS.has(value) &&
  decodeLittleEndian(value) < CURVE25519_PRIME;

/**
 * Holds a read public key to what the scoped grants standard admits, see
 * {@link isSealableX25519Key}.
 *
 * @throws {@link GrantScopeInvalidError} when the key is malformed,
 * non-canonical or of small order.
 */
const requireReadPublicKey = (value: string): void => {
  requireBytes32Hex('read public key', value);
  if (LOW_ORDER_READ_KEYS.has(value)) {
    throw new GrantScopeInvalidError('read public key has small order');
  }
  if (!isSealableX25519Key(value)) {
    throw new GrantScopeInvalidError(
      'read public key is not a canonical X25519 encoding',
    );
  }
};

const parseUint128 = (field: string, value: string): bigint => {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new GrantScopeInvalidError(
      `${field} must be a non-negative decimal integer, got "${value}"`,
    );
  }
  const amount = BigInt(value);
  if (amount > UINT128_MAX) {
    throw new GrantScopeInvalidError(`${field} exceeds the 128-bit maximum`);
  }
  return amount;
};

/**
 * Checks a requested grant against the rules the contract and the account
 * impose, so a doomed request fails before any key ceremony or proof.
 *
 * @throws {@link GrantLimitReachedError} when the account already holds
 * MAX_GRANTS active grants.
 * @throws {@link GrantScopeInvalidError} when the scope breaks a rule: no
 * operation, an unknown grantee scheme, a grantee key malformed for its
 * scheme, a malformed recipient or caller, a malformed amount, a cap
 * below the per-call cap, an expiry that is not a whole second in the future,
 * a rolling window, which a JavaScript caller can still pass, a read grant
 * without an rp id, or a read grant without a canonical, large-order read
 * public key.
 */
export const validateGrantScope = (
  scope: GrantScopeInput,
  { nowSeconds, grantCount }: GrantScopeContext,
): void => {
  if (grantCount >= MAX_GRANTS) throw new GrantLimitReachedError();

  if (scope.operations.length === 0) {
    throw new GrantScopeInvalidError(
      'A grant must allow at least one operation',
    );
  }

  requireGranteeKey(scope.grantee);
  if (scope.recipient.kind !== 'any') {
    requireBytes32Hex('recipient value', scope.recipient.value);
  }
  if (scope.caller !== undefined) requireBytes32Hex('caller', scope.caller);

  parseUint128('maxCoinValue', scope.maxCoinValue);
  const perCallCap = parseUint128('perCallCap', scope.perCallCap);
  const cap = parseUint128('cap', scope.cap);
  if (cap < perCallCap) {
    throw new GrantScopeInvalidError('cap must not be below the per-call cap');
  }

  if (scope.expiresAt !== null) {
    if (!Number.isInteger(scope.expiresAt)) {
      throw new GrantScopeInvalidError(
        'expiresAt must be a whole number of seconds',
      );
    }
    if (scope.expiresAt <= nowSeconds) {
      throw new GrantScopeInvalidError('expiresAt must be in the future');
    }
  }

  if ('window' in scope) {
    throw new GrantScopeInvalidError(
      'A grant carries no rolling window: the contract reserves the window bounds',
    );
  }

  if (scope.read && !scope.rpId) {
    throw new GrantScopeInvalidError('A read grant requires an rp id');
  }
  if (scope.read) {
    if (scope.readPublicKey === undefined) {
      throw new GrantScopeInvalidError(
        'A read grant requires the read public key the viewing secret is sealed to',
      );
    }
    requireReadPublicKey(scope.readPublicKey);
  } else if (scope.readPublicKey !== undefined) {
    throw new GrantScopeInvalidError(
      'A read public key is only given with a read grant',
    );
  }
};
