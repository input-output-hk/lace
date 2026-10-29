import {
  AccAddress,
  GrantId,
  GrantScopeSalt,
  GRANTEE_SCHEMES,
  GrantSlot,
  isGranteeKey,
  isGranteeScheme,
  TokenColor,
} from '@lace-contract/passport';
import { CustomError } from 'ts-custom-error';

import { PASSPORT_AGENT_POLICY_VERSION } from './export-passport-agent-policy';

import type { PassportAgentPolicy } from './export-passport-agent-policy';
import type {
  GrantOperation,
  GrantRecipient,
  GranteeScheme,
} from '@lace-contract/passport';

/**
 * A Passport agent policy is malformed or is for another network. `field`
 * names the part that failed, such as `recipient.value`.
 */
export class PassportAgentPolicyInvalidError extends CustomError {
  public readonly code = 'passport-agent-policy-invalid' as const;

  public constructor(readonly reason: string, readonly field?: string) {
    super(
      `The Passport agent policy is invalid: ${reason}${
        field === undefined ? '' : ` (${field})`
      }`,
    );
  }
}

/**
 * An agent policy as {@link parsePassportAgentPolicy} returns it: the same
 * fields as {@link PassportAgentPolicy}, with the account, grant id, slot,
 * salt and colour typed as the Passport value objects.
 */
export type PassportParsedAgentPolicy = Omit<
  PassportAgentPolicy,
  'account' | 'color' | 'grantId' | 'scopeSalt' | 'slot'
> & {
  account: AccAddress;
  grantId: GrantId;
  slot: GrantSlot;
  scopeSalt: GrantScopeSalt;
  color: TokenColor;
};

const FIELDS: readonly (keyof PassportAgentPolicy)[] = [
  'type',
  'version',
  'network',
  'account',
  'grantId',
  'slot',
  'granteeScheme',
  'granteePublicKey',
  'scopeSalt',
  'color',
  'recipient',
  'maxCoinValue',
  'perCallCap',
  'cap',
  'expiresAt',
  'window',
  'operations',
  'origin',
];

/** The fields a policy may leave out: the seal of a grant that does not read. */
const OPTIONAL_FIELDS: readonly (keyof PassportAgentPolicy)[] = ['view'];

/** The length of a GrantViewSeal v1 and its version and suite bytes. */
const VIEW_SEAL_LENGTH = 94;
const VIEW_SEAL_VERSION = 0x01;
const VIEW_SEAL_SUITE = 0x01;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const OPERATIONS: readonly GrantOperation[] = [
  'withdraw-shielded-to-contract',
  'withdraw-shielded',
  'withdraw-unshielded',
];

/** Why a grantee key was refused, by the scheme it was read under. */
const GRANTEE_KEY_REFUSALS: Record<GranteeScheme, string> = {
  'jubjub-schnorr': 'must be 32 bytes as lower-case hex',
  'secp256k1-ecdsa': 'must be a 33-byte compressed point as lower-case hex',
};

const BYTES32_HEX_PATTERN = /^[0-9a-f]{64}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)$/;
const UINT128_MAX = 2n ** 128n - 1n;

const invalid = (reason: string, field: string): never => {
  throw new PassportAgentPolicyInvalidError(reason, field);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (input: unknown): unknown => {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return invalid('not valid JSON', 'policy');
  }
};

const readHex32 = (value: unknown, field: string): string =>
  typeof value === 'string' && BYTES32_HEX_PATTERN.test(value)
    ? value
    : invalid('must be 32 bytes as lower-case hex', field);

const readGranteeScheme = (value: unknown): GranteeScheme =>
  isGranteeScheme(value)
    ? value
    : invalid(`must be ${GRANTEE_SCHEMES.join(' or ')}`, 'granteeScheme');

/**
 * The grantee key as its scheme writes it: 32 bytes for a jubjub key, the
 * 33-byte compressed point with a 02 or 03 prefix for a secp256k1 key.
 */
const readGranteePublicKey = (value: unknown, scheme: GranteeScheme): string =>
  isGranteeKey(scheme, value)
    ? value
    : invalid(GRANTEE_KEY_REFUSALS[scheme], 'granteePublicKey');

const readAmount = (value: unknown, field: string): string => {
  if (
    typeof value !== 'string' ||
    !DECIMAL_PATTERN.test(value) ||
    BigInt(value) > UINT128_MAX
  ) {
    return invalid(
      'must be a canonical non-negative decimal string within 128 bits',
      field,
    );
  }
  return value;
};

const readGrantId = (value: unknown): GrantId =>
  GrantId(readHex32(value, 'grantId'));

const readText = (value: unknown, field: string): string =>
  typeof value === 'string' && value.length > 0
    ? value
    : invalid('must be a non-empty string', field);

const readRecipient = (value: unknown): GrantRecipient => {
  if (!isRecord(value)) return invalid('must be an object', 'recipient');
  if (value.kind === 'any') {
    return Object.keys(value).length === 1
      ? { kind: 'any' }
      : invalid('must carry no value', 'recipient');
  }
  if (
    (value.kind === 'coin-public-key' ||
      value.kind === 'contract-address' ||
      value.kind === 'user-address') &&
    Object.keys(value).length === 2
  ) {
    return {
      kind: value.kind,
      value: readHex32(value.value, 'recipient.value'),
    };
  }
  return invalid('names an unknown kind or extra fields', 'recipient');
};

const readWindow = (value: unknown): null =>
  value === null
    ? null
    : invalid(
        'must be null, since the contract accepts no rolling window',
        'window',
      );

const readOperations = (value: unknown): GrantOperation[] => {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    new Set(value).size !== value.length
  ) {
    return invalid('must list each operation once, at least one', 'operations');
  }
  return value.map(operation =>
    OPERATIONS.find(known => known === operation) === undefined
      ? invalid('names an unknown operation', 'operations')
      : (operation as GrantOperation),
  );
};

const readExpiry = (value: unknown): number | null => {
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : invalid(
        'must be null or a positive whole number of seconds',
        'expiresAt',
      );
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

/**
 * The bytes of an unpadded base64url string, only when it is the one
 * encoding of them: a string whose last character carries stray bits,
 * which a decoder drops, would let one seal travel under many spellings.
 */
const fromBase64Url = (value: string): Uint8Array | undefined => {
  if (!BASE64URL_PATTERN.test(value)) return undefined;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(value.replaceAll('-', '+').replaceAll('_', '/')),
      character => character.charCodeAt(0),
    );
  } catch {
    return undefined;
  }
  return toBase64Url(bytes) === value ? bytes : undefined;
};

/**
 * The sealed viewing secret as the export writes it: the canonical
 * base64url of a GrantViewSeal v1, checked by length before its version and suite so an
 * inbox entry is never read as a seal.
 */
const readView = (value: unknown): string => {
  const seal = typeof value === 'string' ? fromBase64Url(value) : undefined;
  if (
    seal === undefined ||
    seal.length !== VIEW_SEAL_LENGTH ||
    seal[0] !== VIEW_SEAL_VERSION ||
    seal[1] !== VIEW_SEAL_SUITE
  ) {
    return invalid('must be the base64url of a GrantViewSeal v1', 'view');
  }
  return value as string;
};

const readSlot = (value: unknown): GrantSlot => {
  try {
    return GrantSlot(value as number);
  } catch {
    return invalid('must be an integer from 0 to 255', 'slot');
  }
};

/**
 * Validates an agent policy, as JSON text or a parsed value, for the
 * network `network` names, and returns it with its identifiers typed. An
 * agent reads its policy with it before it acts under the grant.
 *
 * It refuses any shape but the one `exportPassportAgentPolicy` writes:
 * another type or any version but 2, a missing or extra field, a policy for
 * another network, a `granteeScheme` other than jubjub-schnorr or
 * secp256k1-ecdsa, a grantee key that is not 32 bytes of lower-case hex for
 * the first or a 33-byte compressed point with a 02 or 03 prefix for the
 * second, a salt, colour or recipient that is not 32 bytes of lower-case
 * hex, an amount that is not a canonical decimal string within 128 bits, a
 * per-call cap above the cap, a slot outside 0 to 255, an expiry that is
 * not a positive whole number of seconds or null, a `window` that is not
 * null, a list of operations that is empty, repeats one or names an
 * unknown one, and a `view` that is not the canonical base64url of a
 * GrantViewSeal v1; `view` is the one field a policy may leave out.
 *
 * It does not prove that the grant exists or still works, and does not
 * check the grantee: the agent compares the policy's key with its own.
 *
 * @throws {@link PassportAgentPolicyInvalidError} When the policy is
 *   malformed or is for another network.
 */
export const parsePassportAgentPolicy = (
  input: unknown,
  { network }: { network: string },
): PassportParsedAgentPolicy => {
  const policy = parseJson(input);
  if (!isRecord(policy)) return invalid('must be an object', 'policy');
  if (policy.type !== 'passport-agent-policy') {
    return invalid('is not a Passport agent policy', 'type');
  }
  if (policy.version !== PASSPORT_AGENT_POLICY_VERSION) {
    return invalid('unsupported version', 'version');
  }
  const unexpected = Object.keys(policy).find(
    key =>
      !FIELDS.some(field => field === key) &&
      !OPTIONAL_FIELDS.some(field => field === key),
  );
  if (unexpected !== undefined) {
    return invalid('is not a field of the policy', unexpected);
  }
  const missing = FIELDS.find(field => !(field in policy));
  if (missing !== undefined) return invalid('is missing', missing);
  if (policy.network !== network) {
    return invalid(`is not the network ${network}`, 'network');
  }
  const granteeScheme = readGranteeScheme(policy.granteeScheme);
  const perCallCap = readAmount(policy.perCallCap, 'perCallCap');
  const cap = readAmount(policy.cap, 'cap');
  if (BigInt(perCallCap) > BigInt(cap)) {
    return invalid('must not be below the per-call cap', 'cap');
  }
  return {
    type: 'passport-agent-policy',
    version: PASSPORT_AGENT_POLICY_VERSION,
    network,
    account: AccAddress(readText(policy.account, 'account')),
    grantId: readGrantId(policy.grantId),
    slot: readSlot(policy.slot),
    granteeScheme,
    granteePublicKey: readGranteePublicKey(
      policy.granteePublicKey,
      granteeScheme,
    ),
    scopeSalt: GrantScopeSalt(readHex32(policy.scopeSalt, 'scopeSalt')),
    color: TokenColor(readHex32(policy.color, 'color')),
    recipient: readRecipient(policy.recipient),
    maxCoinValue: readAmount(policy.maxCoinValue, 'maxCoinValue'),
    perCallCap,
    cap,
    expiresAt: readExpiry(policy.expiresAt),
    window: readWindow(policy.window),
    operations: readOperations(policy.operations),
    origin: readText(policy.origin, 'origin'),
    ...('view' in policy ? { view: readView(policy.view) } : {}),
  };
};
