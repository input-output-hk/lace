/**
 * The rules a grant scope is held to before anything is signed over it:
 * the encoding of a requested scope into the circuit's fields, the issue
 * rules the contract asserts, and the reading of the grantee key. The
 * local flow, the signer handlers and the signer page all apply them, so
 * they live apart from the derivations that need the contract module:
 * nothing here evaluates the contract or the Midnight runtime, and a
 * bundle held free of both can still refuse a scope the contract would.
 */
import {
  GrantScopeInvalidError,
  SECP256K1_COMPRESSED_HEX_PATTERN,
} from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

import type {
  GrantGrantee,
  GrantRecipient,
  GrantScopeInput,
} from '@lace-contract/passport';
import type {
  JubjubPoint,
  Secp256k1Point,
} from '@midnight-ntwrk/compact-runtime';

const BYTES32_LENGTH = 32;
const DECIMAL_PATTERN = /^\d+$/;
const BYTES32_HEX_PATTERN = /^[0-9a-f]{64}$/;
const UINT64_MAX = (1n << 64n) - 1n;
const UINT128_MAX = (1n << 128n) - 1n;

/** The `recipient_kind` value of each recipient the contract can pin. */
export const RECIPIENT_KINDS: Record<GrantRecipient['kind'], bigint> = {
  any: 0n,
  'user-address': 1n,
  'coin-public-key': 2n,
  'contract-address': 3n,
};

/** The all-zero 32 bytes an absent hash, recipient or caller carries. */
export const zero32 = (): Uint8Array => new Uint8Array(BYTES32_LENGTH);

const isZero = (bytes: Uint8Array): boolean => bytes.every(byte => byte === 0);

const bytes32 = (field: string, hex: string): Uint8Array => {
  if (!BYTES32_HEX_PATTERN.test(hex)) {
    throw new GrantScopeInvalidError(
      `${field} must be 32 bytes as lowercase hex`,
    );
  }
  return ByteArray.fromHex(HexBytes(hex));
};

/** A seconds field as the contract's `Uint<64>`. */
const seconds = (field: string, value: number): bigint => {
  if (!Number.isInteger(value) || value < 0) {
    throw new GrantScopeInvalidError(
      `${field} must be a whole number of seconds, got ${value}`,
    );
  }
  const total = BigInt(value);
  if (total > UINT64_MAX) {
    throw new GrantScopeInvalidError(`${field} exceeds the 64-bit maximum`);
  }
  return total;
};

/** An amount field as the contract's `Uint<128>`. */
const decimal = (field: string, value: string): bigint => {
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
 * The plaintext scope the issuing device signs over: the sixteen arguments
 * `issue_grant_with_jubjub` takes between the grant id and the scope salt,
 * named after the circuit's own fields. Amounts are the contract's
 * unsigned integers, `expiresAt` is POSIX seconds with 0 for never,
 * `rpIdHash` is zero because the jubjub arm evaluates no relying party,
 * and `readPkHash` is the SHA-256 of the grantee's read public key for a
 * read grant and zero otherwise.
 */
export type GrantCircuitScope = {
  opWithdrawUnshielded: boolean;
  opWithdrawShielded: boolean;
  opWithdrawShieldedToContract: boolean;
  read: boolean;
  color: Uint8Array;
  recipientKind: bigint;
  recipient: Uint8Array;
  maxCoinValue: bigint;
  perCallCap: bigint;
  cap: bigint;
  expiresAt: bigint;
  rpIdHash: Uint8Array;
  readPkHash: Uint8Array;
  windowLen: bigint;
  windowCap: bigint;
  caller?: Uint8Array;
};

/**
 * Encodes the scope a consumer requests into the circuit's plaintext
 * fields. Amounts are parsed from their decimal strings, the colour,
 * recipient and caller from hex, and a recipient of kind `any` or an
 * absent caller carry zero bytes. The scope's `rpId` is not evaluated on
 * the jubjub arm, so `rpIdHash` stays zero; the read key hash is derived
 * from the read public key the scope carries, so the digest the device
 * signs binds the key the viewing secret will be sealed to. A scope
 * carries no rolling window, so both window bounds are zero.
 *
 * @throws {@link GrantScopeInvalidError} when a hex, decimal or seconds
 * field is malformed or exceeds the contract's integer width.
 */
export const circuitScope = (scope: GrantScopeInput): GrantCircuitScope => ({
  opWithdrawUnshielded: scope.operations.includes('withdraw-unshielded'),
  opWithdrawShielded: scope.operations.includes('withdraw-shielded'),
  opWithdrawShieldedToContract: scope.operations.includes(
    'withdraw-shielded-to-contract',
  ),
  read: scope.read ?? false,
  color: bytes32('color', scope.color),
  recipientKind: RECIPIENT_KINDS[scope.recipient.kind],
  recipient:
    scope.recipient.kind === 'any'
      ? zero32()
      : bytes32('recipient value', scope.recipient.value),
  maxCoinValue: decimal('maxCoinValue', scope.maxCoinValue),
  perCallCap: decimal('perCallCap', scope.perCallCap),
  cap: decimal('cap', scope.cap),
  expiresAt: seconds('expiresAt', scope.expiresAt ?? 0),
  rpIdHash: zero32(),
  readPkHash:
    scope.readPublicKey === undefined
      ? zero32()
      : sha256(bytes32('read public key', scope.readPublicKey)),
  windowLen: 0n,
  windowCap: 0n,
  caller:
    scope.caller === undefined ? undefined : bytes32('caller', scope.caller),
});

/** True when the scope allows any withdrawal. */
const isSpendScope = (scope: GrantCircuitScope): boolean =>
  scope.opWithdrawUnshielded ||
  scope.opWithdrawShielded ||
  scope.opWithdrawShieldedToContract;

/**
 * Checks the issue rules the contract asserts, in the contract's order, so
 * a scope it would refuse is caught before a device signs over it. Each
 * message names the contract's own reason: a shielded operation needs
 * read, read needs the hash of a delegate read key, and the window bounds
 * are reserved by the contract and must be zero. One rule is stricter than
 * the contract: a recipient given under recipient kind `any` is refused
 * here, while the contract issues it and only commits the stray bytes.
 *
 * @throws {@link GrantScopeInvalidError} when a rule is broken.
 */
export const assertIssueRules = (scope: GrantCircuitScope): void => {
  const isSpend = isSpendScope(scope);
  const isShielded =
    scope.opWithdrawShielded || scope.opWithdrawShieldedToContract;
  const hasObjectFields =
    !isZero(scope.color) ||
    scope.recipientKind !== 0n ||
    !isZero(scope.recipient) ||
    scope.maxCoinValue !== 0n ||
    scope.perCallCap !== 0n ||
    scope.cap !== 0n;

  if (!isSpend && !scope.read) {
    throw new GrantScopeInvalidError('empty scope: no operation and no read');
  }
  if (!isSpend && scope.caller !== undefined) {
    throw new GrantScopeInvalidError('read-only grant cannot restrict caller');
  }
  if (isShielded && !scope.read) {
    throw new GrantScopeInvalidError('shielded spend requires read');
  }
  if (scope.perCallCap > scope.cap) {
    throw new GrantScopeInvalidError('per-call cap above cap');
  }
  if (isSpend && scope.cap === 0n) {
    throw new GrantScopeInvalidError('spend without cap');
  }
  if (isSpend && scope.maxCoinValue < scope.perCallCap) {
    throw new GrantScopeInvalidError('coin bound below per-call cap');
  }
  if (scope.read && isZero(scope.readPkHash)) {
    throw new GrantScopeInvalidError('read without delegate key');
  }
  if (scope.windowLen !== 0n || scope.windowCap !== 0n) {
    throw new GrantScopeInvalidError(
      'window bounds reserved: the contract accepts no rolling window',
    );
  }
  if (!isSpend && hasObjectFields) {
    throw new GrantScopeInvalidError('read-only grant carries object fields');
  }
  if (scope.recipientKind === 0n && !isZero(scope.recipient)) {
    throw new GrantScopeInvalidError(
      'recipient given without a recipient kind',
    );
  }
};

/**
 * A grantee key as the contract's circuits take it, tagged with its
 * scheme: a jubjub point for a jubjub Schnorr grantee, a secp256k1 point
 * for a secp256k1 ECDSA grantee.
 */
export type GranteePoint =
  | { scheme: 'jubjub-schnorr'; point: JubjubPoint }
  | { scheme: 'secp256k1-ecdsa'; point: Secp256k1Point };

/**
 * Reads a jubjub grantee key from its 32-byte hex form: the compressed
 * jubjub point of the Zcash specification, the y coordinate little-endian
 * with the parity of x in its top bit. A point of small order, the
 * identity included, is refused here with the same cofactor test the
 * contract applies when the grantee spends, because issuing never sees
 * the key: without this check a doomed grant would cost the passkey
 * ceremony, a proof and a grant slot before the contract refuses it.
 */
const jubjubGranteePoint = (publicKey: string): JubjubPoint => {
  const bytes = bytes32('grantee public key', publicKey);
  let point: ReturnType<typeof jubjub.Point.fromBytes>;
  try {
    point = jubjub.Point.fromBytes(bytes);
  } catch {
    throw new GrantScopeInvalidError(
      'grantee public key is not a point on the jubjub curve',
    );
  }
  if (point.isSmallOrder()) {
    throw new GrantScopeInvalidError('grantee public key has small order');
  }
  const { x, y } = point.toAffine();
  return { x, y };
};

/**
 * Reads a secp256k1 grantee key from its 33-byte SEC1 compressed hex
 * form, prefixed 02 or 03. The curve has cofactor one and the compressed
 * form cannot name the identity, so a key that decompresses to a point
 * on the curve is one the contract can verify a signature under.
 */
const secp256k1GranteePoint = (publicKey: string): Secp256k1Point => {
  if (!SECP256K1_COMPRESSED_HEX_PATTERN.test(publicKey)) {
    throw new GrantScopeInvalidError(
      'grantee public key must be a 33-byte compressed secp256k1 point as lowercase hex',
    );
  }
  let point: ReturnType<typeof secp256k1.Point.fromBytes>;
  try {
    point = secp256k1.Point.fromBytes(ByteArray.fromHex(HexBytes(publicKey)));
  } catch {
    throw new GrantScopeInvalidError(
      'grantee public key is not a point on the secp256k1 curve',
    );
  }
  const { x, y } = point.toAffine();
  return { x, y, identity: false };
};

/**
 * Reads the grantee's public key into the point its scheme's circuits
 * take, refusing a key the contract could never verify a signature
 * under. The signer reads the key the same way before it shows a grant
 * a dApp asks it to issue, and again when it re-derives the grant's id.
 *
 * @throws {@link GrantScopeInvalidError} when the hex is malformed for
 * the scheme, does not decode to a point on the scheme's curve, has
 * small order, or the scheme is not one a grant can name.
 */
export const granteePoint = (grantee: GrantGrantee): GranteePoint => {
  switch (grantee.scheme) {
    case 'jubjub-schnorr':
      return {
        scheme: grantee.scheme,
        point: jubjubGranteePoint(grantee.publicKey),
      };
    case 'secp256k1-ecdsa':
      return {
        scheme: grantee.scheme,
        point: secp256k1GranteePoint(grantee.publicKey),
      };
    default: {
      const unhandled: never = grantee;
      throw new GrantScopeInvalidError(
        `unsupported grantee scheme "${String(
          (unhandled as { scheme: unknown }).scheme,
        )}"`,
      );
    }
  }
};
