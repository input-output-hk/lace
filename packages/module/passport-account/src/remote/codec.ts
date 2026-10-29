import {
  AccAddress,
  DeviceCommitmentHex,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
  isGranteeKey,
  isGranteeScheme,
  TokenColor,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { DEPLOYED_OPERATIONS } from '../acc/deployed-operations';
import { ENC_KEY_PREFIX_LENGTH } from '../acc/envelopes';
import {
  INBOX_ENTRY_LENGTH,
  MAX_INBOX_ENTRIES_PER_REQUEST,
} from '../acc/inbox';
import { GRANT_VIEW_SEAL_LENGTH } from '../acc/view-seal';
import { storedGranteeScheme } from '../flows/types';

import type {
  PassportAccountRecord,
  PendingCreationMarker,
  PendingDeployment,
  RecordPresence,
  StoredGrant,
  StoredGrantObject,
  StoredGrants,
  StoredGrantView,
} from '../flows/types';
import type {
  AccountKeyring,
  AccountKeys,
  Authorisation,
  DeviceDelivery,
  DeviceReader,
  GranteeScheme,
  GrantBookkeeping,
  GrantOperation,
  GrantRecipient,
  GrantRecordPart,
  GrantScopeInput,
  GrantViewDelivery,
  LiveDeviceReader,
  MaintenanceChanges,
  MaintenanceSignature,
  MaintenanceSignatureKind,
  MaintenanceVerifyingKey,
  OpenedInboxEntry,
  RemovedDevice,
  ShieldedCoin,
  SignedMaintenanceUpdate,
} from '@lace-contract/passport';
import type {
  SignerKeyring,
  SignerLiveReader,
  SignerRemovedDevice,
  SignerRequestPayloads,
} from '@lace-lib/passkey';

/**
 * A signer message carried a field the receiving end cannot read. Raised
 * on either end of the channel; from the signer it reaches the dApp as
 * its code. `field` names the field in the message's own path, for a
 * signer page that answers the refusal under a code of its own.
 */
export class MalformedPayloadError extends Error {
  public readonly code = 'malformed-payload' as const;
  public readonly field: string;
  public constructor(field: string) {
    super(`The signer message field "${field}" is malformed.`);
    this.name = 'MalformedPayloadError';
    this.field = field;
  }
}

/** A curve point as the channel carries it: both coordinates decimal. */
type EncodedPoint = { x: string; y: string };

/** An {@link Authorisation} as the channel carries it: bigints decimal. */
type EncodedAuthorisation = {
  scheme: 'jubjub-schnorr';
  pk: EncodedPoint;
  useCounter: string;
  sigR: EncodedPoint;
  sigS: string;
  grindNonce: string;
};

const DECIMAL_PATTERN = /^\d+$/;
const HEX_BYTES_PATTERN = /^(?:[0-9a-f]{2})*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDecimal = (value: unknown): value is string =>
  typeof value === 'string' && DECIMAL_PATTERN.test(value);

/** Bigints cross the channel as decimal strings. */
export const encodeBigInt = (value: bigint): string => value.toString();

/** Reads a non-negative bigint from its decimal string. */
export const decodeBigInt = (value: unknown, field: string): bigint => {
  if (!isDecimal(value)) throw new MalformedPayloadError(field);
  return BigInt(value);
};

const UINT128_MAX = (1n << 128n) - 1n;

/**
 * Reads an amount as the contract's `Uint<128>`, kept as the decimal
 * string it arrived as.
 */
const decodeAmount = (value: unknown, field: string): string => {
  if (!isDecimal(value) || BigInt(value) > UINT128_MAX) {
    throw new MalformedPayloadError(field);
  }
  return value;
};

const decodeString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw new MalformedPayloadError(field);
  return value;
};

/** Reads a boolean, refusing anything coerced from another type. */
export const decodeBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw new MalformedPayloadError(field);
  return value;
};

const RECORD_PRESENCES: ReadonlySet<string> = new Set<RecordPresence>([
  'absent',
  'pending',
  'complete',
]);

/** Reads what the signer reports stored, refusing any other word. */
export const decodePresence = (
  value: unknown,
  field: string,
): RecordPresence => {
  if (typeof value !== 'string' || !RECORD_PRESENCES.has(value)) {
    throw new MalformedPayloadError(field);
  }
  return value as RecordPresence;
};

/** Bytes cross the channel as lowercase hex. */
export const encodeBytes = (bytes: Uint8Array): string =>
  HexBytes.fromByteArray(bytes);

/** Reads exactly `length` bytes from their lowercase hex. */
export const decodeBytes = (
  value: unknown,
  field: string,
  length: number,
): Uint8Array => {
  if (
    typeof value !== 'string' ||
    value.length !== length * 2 ||
    !HEX_BYTES_PATTERN.test(value)
  ) {
    throw new MalformedPayloadError(field);
  }
  return ByteArray.fromHex(HexBytes(value));
};

/** Reads a list of inbox entries, each as the hex of its 192 bytes. */
export const decodeInboxEntries = (
  value: unknown,
  field: string,
): Uint8Array[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((item, index) =>
    decodeBytes(item, `${field}[${index}]`, INBOX_ENTRY_LENGTH),
  );
};

/**
 * Reads the entries a re-encryption answered, one per entry sent in
 * order: the fresh 192-byte entry as hex, or null for one that did not
 * open.
 */
export const decodeSealedEntries = (
  value: unknown,
  field: string,
): (Uint8Array | null)[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((item, index) =>
    item === null
      ? null
      : decodeBytes(item, `${field}[${index}]`, INBOX_ENTRY_LENGTH),
  );
};

/** An opened coin as the channel carries it. */
type EncodedShieldedCoin = { nonce: string; color: string; value: string };

const COIN_FIELD_LENGTH = 32;

/** An opened coin crosses the channel with its bytes hex and its value decimal. */
const encodeShieldedCoin = (coin: ShieldedCoin): EncodedShieldedCoin => ({
  nonce: encodeBytes(coin.nonce),
  color: encodeBytes(coin.color),
  value: encodeBigInt(coin.value),
});

const decodeShieldedCoin = (value: unknown, field: string): ShieldedCoin => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    nonce: decodeBytes(value.nonce, `${field}.nonce`, COIN_FIELD_LENGTH),
    color: decodeBytes(value.color, `${field}.color`, COIN_FIELD_LENGTH),
    value: BigInt(decodeAmount(value.value, `${field}.value`)),
  };
};

/** A curve point crosses the channel coordinate by coordinate. */
export const encodePoint = (point: { x: bigint; y: bigint }): EncodedPoint => ({
  x: encodeBigInt(point.x),
  y: encodeBigInt(point.y),
});

/** Reads a curve point from its decimal coordinates. */
export const decodePoint = (
  value: unknown,
  field: string,
): { x: bigint; y: bigint } => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    x: decodeBigInt(value.x, `${field}.x`),
    y: decodeBigInt(value.y, `${field}.y`),
  };
};

/** Reads a list of bigints, naming the failing element. */
export const decodeBigInts = (value: unknown, field: string): bigint[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((item, index) => decodeBigInt(item, `${field}[${index}]`));
};

/**
 * Reads a value through a value object's constructor, so the channel
 * admits exactly what the domain does and names the field it refused.
 */
const decodeValueObject = <Raw, Typed>(
  parse: (value: Raw) => Typed,
  value: Raw,
  field: string,
): Typed => {
  try {
    return parse(value);
  } catch {
    throw new MalformedPayloadError(field);
  }
};

/** Reads a list of device commitments, each as 32-byte lowercase hex. */
export const decodeCommitments = (
  value: unknown,
  field: string,
): DeviceCommitmentHex[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((item, index) => {
    const itemField = `${field}[${index}]`;
    return decodeValueObject(
      DeviceCommitmentHex,
      decodeString(item, itemField),
      itemField,
    );
  });
};

/** An authorisation crosses the channel with every bigint decimal. */
export const encodeAuthorisation = (
  authorisation: Authorisation,
): EncodedAuthorisation => ({
  scheme: authorisation.scheme,
  pk: encodePoint(authorisation.pk),
  useCounter: encodeBigInt(authorisation.useCounter),
  sigR: encodePoint(authorisation.sigR),
  sigS: encodeBigInt(authorisation.sigS),
  grindNonce: encodeBigInt(authorisation.grindNonce),
});

/** Reads a jubjub-schnorr authorisation from its encoded form. */
export const decodeAuthorisation = (
  value: unknown,
  field: string,
): Authorisation => {
  if (!isRecord(value) || value.scheme !== 'jubjub-schnorr') {
    throw new MalformedPayloadError(`${field}.scheme`);
  }
  return {
    scheme: 'jubjub-schnorr',
    pk: decodePoint(value.pk, `${field}.pk`),
    useCounter: decodeBigInt(value.useCounter, `${field}.useCounter`),
    sigR: decodePoint(value.sigR, `${field}.sigR`),
    sigS: decodeBigInt(value.sigS, `${field}.sigS`),
    grindNonce: decodeBigInt(value.grindNonce, `${field}.grindNonce`),
  };
};

const SIGNATURE_KINDS = new Set(['schnorr', 'ecdsa']);

const decodeStrings = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((entry, index) => decodeString(entry, `${field}[${index}]`));
};

/**
 * A maintenance authority key as the ledger types it: a kind and hex,
 * either a signing key or a verifying key.
 */
const decodeAuthorityKey = (
  value: unknown,
  field: string,
): { tag: MaintenanceSignatureKind; value: string } => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const tag = decodeString(value.tag, `${field}.tag`);
  if (!SIGNATURE_KINDS.has(tag))
    throw new MalformedPayloadError(`${field}.tag`);
  return {
    tag: tag as MaintenanceSignatureKind,
    value: decodeString(value.value, `${field}.value`),
  };
};

/**
 * Reads a maintenance key as the ledger types it: a signature kind and
 * the key, or signature, as non-empty lowercase hex.
 */
export const decodeMaintenanceKey = (
  value: unknown,
  field: string,
): MaintenanceVerifyingKey => {
  const key = decodeAuthorityKey(value, field);
  if (key.value.length === 0 || !HEX_BYTES_PATTERN.test(key.value)) {
    throw new MalformedPayloadError(`${field}.value`);
  }
  return key;
};

/** The creating device's key entries, as the lowercase hex of each. */
const decodeKeyEntries = (value: unknown, field: string): string[] =>
  decodeInboxEntries(value, field).map(entry => encodeBytes(entry));

/**
 * The deployment a record carries while its waves are still landing. It
 * crosses the channel only between the dApp running the waves and the
 * signer storing the record, both of which hold the authority key for as
 * long as the deployment runs.
 */
const decodePendingDeployment = (
  value: unknown,
  field: string,
): PendingDeployment => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    operations: decodeStrings(value.operations, `${field}.operations`),
    lockAccount: decodeBoolean(value.lockAccount, `${field}.lockAccount`),
    verifierKeysDigest: decodeString(
      value.verifierKeysDigest,
      `${field}.verifierKeysDigest`,
    ),
    saltHex: decodeString(value.saltHex, `${field}.saltHex`),
    authorityKey: decodeAuthorityKey(
      value.authorityKey,
      `${field}.authorityKey`,
    ),
    handoverAuthority: decodeMaintenanceKey(
      value.handoverAuthority,
      `${field}.handoverAuthority`,
    ),
    keyEntries: decodeKeyEntries(value.keyEntries, `${field}.keyEntries`),
  };
};

/** The fields a pending creation marker leaves out, all of them the deployment's. */
const DEPLOYMENT_ONLY_FIELDS = [
  'operations',
  'lockAccount',
  'verifierKeysDigest',
  'saltHex',
  'authorityKey',
  'handoverAuthority',
] as const;

/**
 * The marker a flow other than the creation is shown of an unfinished
 * creation: its key entries and nothing else, so a marker that carries
 * any field of the deployment is refused rather than read as one.
 */
const decodePendingCreationMarker = (
  value: Record<string, unknown>,
  field: string,
): PendingCreationMarker => {
  for (const name of DEPLOYMENT_ONLY_FIELDS) {
    if (value[name] !== undefined) {
      throw new MalformedPayloadError(`${field}.${name}`);
    }
  }
  return {
    keyEntries: decodeKeyEntries(value.keyEntries, `${field}.keyEntries`),
  };
};

/**
 * A record's pending creation: the whole deployment when it carries the
 * authority key, as a create-account session reads and writes it, or
 * else the marker every other flow is shown.
 */
const decodeDeployment = (
  value: unknown,
  field: string,
): PendingCreationMarker | PendingDeployment => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return value.authorityKey === undefined
    ? decodePendingCreationMarker(value, field)
    : decodePendingDeployment(value, field);
};

const BYTES32_LENGTH = 32;

/** Reads 32 bytes from their lowercase hex, kept as that hex. */
const decodeHex32 = (value: unknown, field: string): string =>
  encodeBytes(decodeBytes(value, field, BYTES32_LENGTH));

/** Reads a grant slot as the contract bounds it: an integer from 0 to 255. */
export const decodeSlot = (value: unknown, field: string): GrantSlot => {
  if (typeof value !== 'number') throw new MalformedPayloadError(field);
  return decodeValueObject(GrantSlot, value, field);
};

/** Reads a grant id as 32-byte lowercase hex. */
export const decodeGrantId = (value: unknown, field: string): GrantId =>
  decodeValueObject(GrantId, decodeString(value, field), field);

/** Reads a grant scope salt as 32-byte lowercase hex. */
export const decodeScopeSalt = (
  value: unknown,
  field: string,
): GrantScopeSalt =>
  decodeValueObject(GrantScopeSalt, decodeString(value, field), field);

/** Reads an account address as the 32 contract address bytes in hex. */
export const decodeAccount = (value: unknown, field: string): AccAddress =>
  AccAddress(decodeHex32(value, field));

const GRANT_OPERATIONS: ReadonlySet<string> = new Set<GrantOperation>([
  'withdraw-shielded-to-contract',
  'withdraw-shielded',
  'withdraw-unshielded',
]);

const PINNED_RECIPIENT_KINDS: ReadonlySet<string> = new Set<
  GrantRecipient['kind']
>(['coin-public-key', 'contract-address', 'user-address']);

const decodeOperations = (value: unknown, field: string): GrantOperation[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((operation, index) => {
    if (typeof operation !== 'string' || !GRANT_OPERATIONS.has(operation)) {
      throw new MalformedPayloadError(`${field}[${index}]`);
    }
    return operation as GrantOperation;
  });
};

const decodeRecipient = (value: unknown, field: string): GrantRecipient => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const kind = value.kind;
  if (kind === 'any') return { kind };
  if (typeof kind !== 'string' || !PINNED_RECIPIENT_KINDS.has(kind)) {
    throw new MalformedPayloadError(`${field}.kind`);
  }
  return {
    kind: kind as Exclude<GrantRecipient['kind'], 'any'>,
    value: decodeHex32(value.value, `${field}.value`),
  };
};

/** Reads a whole number of seconds that fits a JavaScript integer. */
const decodeSeconds = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new MalformedPayloadError(field);
  }
  return value as number;
};

/** Reads the scheme of a grantee key, admitted only as one a grant can name. */
const decodeGranteeScheme = (value: unknown, field: string): GranteeScheme => {
  if (!isGranteeScheme(value)) throw new MalformedPayloadError(field);
  return value;
};

/** Reads a grantee key in the form its scheme takes, see {@link isGranteeKey}. */
const decodeGranteeKey = (
  scheme: GranteeScheme,
  value: unknown,
  field: string,
): string => {
  if (!isGranteeKey(scheme, value)) throw new MalformedPayloadError(field);
  return value;
};

/** Reads a grant scope's grantee: its scheme and its key in that form. */
const decodeGrantee = (
  value: unknown,
  field: string,
): GrantScopeInput['grantee'] => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const scheme = decodeGranteeScheme(value.scheme, `${field}.scheme`);
  return {
    scheme,
    publicKey: decodeGranteeKey(scheme, value.publicKey, `${field}.publicKey`),
  };
};

/**
 * The scope an issue-grant flow asks the user to grant, admitted only in
 * the shape the module types it: a grantee key in the form its scheme
 * takes, known operations, the token colour, recipient and caller as
 * 32-byte lowercase hex, amounts as decimal strings and times as whole
 * seconds, and the read public key of a read grant as 32-byte lowercase
 * hex. A scope that names a rolling window is refused, since the
 * contract reserves its bounds and the module never asks for one. The
 * optional fields are kept only when present, so the scope re-derives
 * the same digest on either end of the channel.
 */
export const decodeGrantScope = (
  value: unknown,
  field: string,
): GrantScopeInput => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  if ('window' in value) throw new MalformedPayloadError(`${field}.window`);
  const colorField = `${field}.color`;
  return {
    grantee: decodeGrantee(value.grantee, `${field}.grantee`),
    operations: decodeOperations(value.operations, `${field}.operations`),
    color: decodeValueObject(
      TokenColor,
      decodeString(value.color, colorField),
      colorField,
    ),
    recipient: decodeRecipient(value.recipient, `${field}.recipient`),
    maxCoinValue: decodeAmount(value.maxCoinValue, `${field}.maxCoinValue`),
    perCallCap: decodeAmount(value.perCallCap, `${field}.perCallCap`),
    cap: decodeAmount(value.cap, `${field}.cap`),
    expiresAt:
      value.expiresAt === null
        ? null
        : decodeSeconds(value.expiresAt, `${field}.expiresAt`),
    ...(value.read === undefined
      ? {}
      : { read: decodeBoolean(value.read, `${field}.read`) }),
    ...(value.readPublicKey === undefined
      ? {}
      : {
          readPublicKey: decodeHex32(
            value.readPublicKey,
            `${field}.readPublicKey`,
          ),
        }),
    ...(value.caller === undefined
      ? {}
      : { caller: decodeHex32(value.caller, `${field}.caller`) }),
    ...(value.rpId === undefined
      ? {}
      : { rpId: decodeString(value.rpId, `${field}.rpId`) }),
  };
};

/** The object fields a stored grant keeps so its grantee can open it. */
const decodeStoredGrantObject = (
  value: unknown,
  field: string,
): StoredGrantObject => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    color: decodeHex32(value.color, `${field}.color`),
    recipient: decodeRecipient(value.recipient, `${field}.recipient`),
    maxCoinValue: decodeAmount(value.maxCoinValue, `${field}.maxCoinValue`),
  };
};

/**
 * The viewing capability a stored read grant keeps: the read key as
 * 32-byte lowercase hex and, when sealed, the 94-byte seal as hex with
 * the `enc_key` whose secret it holds.
 */
const decodeStoredGrantView = (
  value: unknown,
  field: string,
): StoredGrantView => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    readPublicKey: decodeHex32(value.readPublicKey, `${field}.readPublicKey`),
    ...(value.seal === undefined
      ? {}
      : {
          seal: encodeBytes(
            decodeBytes(value.seal, `${field}.seal`, GRANT_VIEW_SEAL_LENGTH),
          ),
        }),
    ...(value.sealedEncKey === undefined
      ? {}
      : {
          sealedEncKey: decodeHex32(
            value.sealedEncKey,
            `${field}.sealedEncKey`,
          ),
        }),
  };
};

/**
 * Reads the grantee scheme and key a grant's fields carry, the key in
 * the form its scheme takes. Fields written before the scheme was kept
 * carry none, and read as a jubjub grantee, see
 * {@link storedGranteeScheme}, so their key is held to 32-byte hex.
 */
const decodeGranteeFields = (
  value: Record<string, unknown>,
  field: string,
): Pick<GrantBookkeeping, 'granteePublicKey' | 'granteeScheme'> => {
  const granteeScheme = storedGranteeScheme(
    value.granteeScheme === undefined
      ? {}
      : {
          granteeScheme: decodeGranteeScheme(
            value.granteeScheme,
            `${field}.granteeScheme`,
          ),
        },
  );
  return {
    granteeScheme,
    granteePublicKey: decodeGranteeKey(
      granteeScheme,
      value.granteePublicKey,
      `${field}.granteePublicKey`,
    ),
  };
};

/**
 * A stored grant's grantee scheme and key, admitted only in the forms
 * the flows write: a jubjub key as 32-byte lowercase hex, kept without a
 * scheme by an entry written before the scheme was kept, and a
 * secp256k1 key as the 33-byte compressed point prefixed 02 or 03. An
 * entry kept without a scheme is read back without one.
 */
const decodeStoredGrantee = (
  value: Record<string, unknown>,
  field: string,
): Pick<StoredGrant, 'granteePublicKey' | 'granteeScheme'> => {
  const grantee = decodeGranteeFields(value, field);
  return value.granteeScheme === undefined
    ? { granteePublicKey: grantee.granteePublicKey }
    : grantee;
};

/**
 * What the record keeps about one grant this client issued, each field
 * admitted only in the shape the flows wrote it: the slot within the
 * contract's bounds, the salt as 32-byte lowercase hex, the grantee key
 * in the form its scheme takes, the object fields when the entry kept
 * them, and the viewing capability of a read grant.
 */
const decodeStoredGrant = (value: unknown, field: string): StoredGrant => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    slot: decodeSlot(value.slot, `${field}.slot`),
    scopeSalt: decodeScopeSalt(value.scopeSalt, `${field}.scopeSalt`),
    ...decodeStoredGrantee(value, field),
    origin: decodeString(value.origin, `${field}.origin`),
    ...(value.object === undefined
      ? {}
      : { object: decodeStoredGrantObject(value.object, `${field}.object`) }),
    ...(value.view === undefined
      ? {}
      : { view: decodeStoredGrantView(value.view, `${field}.view`) }),
  };
};

/**
 * The grant bookkeeping a record carries, keyed by grant id, each key
 * admitted only as a 32-byte lowercase hex id. It crosses the channel
 * only inside a session, between the dApp that issued the grants and the
 * signer storing the record sealed.
 */
const decodeStoredGrants = (value: unknown, field: string): StoredGrants => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return Object.fromEntries(
    Object.entries(value).map(([id, grant]) => {
      const grantField = `${field}.${id}`;
      return [
        decodeValueObject(GrantId, id, grantField),
        decodeStoredGrant(grant, grantField),
      ];
    }),
  );
};

/**
 * One enrolled device as the roster names it: its reader key and its
 * device key, each as 32-byte lowercase hex.
 */
export const decodeDeviceReader = (
  value: unknown,
  field: string,
): DeviceReader => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    readerPublicKey: decodeHex32(
      value.readerPublicKey,
      `${field}.readerPublicKey`,
    ),
    devicePublicKey: decodeHex32(
      value.devicePublicKey,
      `${field}.devicePublicKey`,
    ),
  };
};

/**
 * The account record as either end receives it: the same three strings
 * the flows persist, the pending deployment while a creation is
 * unfinished, or only its marker outside a creation, the grant
 * bookkeeping once a grant was issued, or undefined when nothing is
 * stored.
 */
export const decodeRecord = (
  value: unknown,
  field: string,
): PassportAccountRecord | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    address: decodeString(value.address, `${field}.address`),
    bindingVersion: decodeString(
      value.bindingVersion,
      `${field}.bindingVersion`,
    ),
    localUseCounter: decodeString(
      value.localUseCounter,
      `${field}.localUseCounter`,
    ),
    ...(value.deployment === undefined
      ? {}
      : {
          deployment: decodeDeployment(value.deployment, `${field}.deployment`),
        }),
    ...(value.grants === undefined
      ? {}
      : { grants: decodeStoredGrants(value.grants, `${field}.grants`) }),
  };
};

/** A keyring crosses the channel with every byte string as lowercase hex. */
export const encodeKeyring = ({
  account,
  encKey,
  envelopes,
}: AccountKeyring): SignerKeyring => ({
  account,
  encKey: encodeBytes(encKey),
  envelopes: envelopes.map(envelope => encodeBytes(envelope)),
});

/**
 * Reads a keyring: the account, a 32-byte `enc_key` and at most
 * {@link MAX_INBOX_ENTRIES_PER_REQUEST} envelopes of 192 bytes each.
 */
export const decodeKeyring = (
  value: unknown,
  field: string,
): AccountKeyring => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const envelopes = decodeInboxEntries(value.envelopes, `${field}.envelopes`);
  if (envelopes.length > MAX_INBOX_ENTRIES_PER_REQUEST) {
    throw new MalformedPayloadError(`${field}.envelopes`);
  }
  return {
    account: decodeAccount(value.account, `${field}.account`),
    encKey: decodeBytes(value.encKey, `${field}.encKey`, BYTES32_LENGTH),
    envelopes,
  };
};

/**
 * Reads where the signer found the live envelope in a page of
 * `pageLength` envelopes: a position within it, or null for none.
 */
export const decodeLiveEnvelope = (
  value: unknown,
  field: string,
  pageLength: number,
): number | null => {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value >= pageLength
  ) {
    throw new MalformedPayloadError(field);
  }
  return value;
};

/** A live reader crosses the channel with its epoch and counter decimal. */
export const encodeLiveReader = ({
  readerPublicKey,
  devicePublicKey,
  epoch,
  counter,
}: LiveDeviceReader): SignerLiveReader => ({
  readerPublicKey,
  devicePublicKey,
  epoch: encodeBigInt(epoch),
  counter: encodeBigInt(counter),
});

/** A removed device crosses the channel with its epoch and counter decimal. */
export const encodeRemovedDevice = ({
  devicePublicKey,
  epoch,
  counter,
}: RemovedDevice): SignerRemovedDevice => ({
  devicePublicKey,
  epoch: encodeBigInt(epoch),
  counter: encodeBigInt(counter),
});

/** Reads a removed device: its key as 32-byte hex, its epoch and counter decimal. */
export const decodeRemovedDevice = (
  value: unknown,
  field: string,
): RemovedDevice => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    devicePublicKey: decodeHex32(
      value.devicePublicKey,
      `${field}.devicePublicKey`,
    ),
    epoch: decodeBigInt(value.epoch, `${field}.epoch`),
    counter: decodeBigInt(value.counter, `${field}.counter`),
  };
};

/** Reads a live reader: its two keys as 32-byte hex, its epoch and counter decimal. */
export const decodeLiveReader = (
  value: unknown,
  field: string,
): LiveDeviceReader => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    ...decodeDeviceReader(value, field),
    epoch: decodeBigInt(value.epoch, `${field}.epoch`),
    counter: decodeBigInt(value.counter, `${field}.counter`),
  };
};

/**
 * The account keys a creation answered, each byte string as hex, with
 * the verifying key of the authority their roster key derives.
 */
export const encodeAccountKeys = ({
  encKey,
  envelopes,
  registrations,
  authority,
}: AccountKeys): Record<string, unknown> => ({
  encKey: encodeBytes(encKey),
  envelopes: envelopes.map(entry => encodeBytes(entry)),
  registrations: registrations.map(entry => encodeBytes(entry)),
  authority: { tag: authority.tag, value: authority.value },
});

/** Reads the account keys a creation answered. */
export const decodeAccountKeys = (
  value: unknown,
  field: string,
): AccountKeys => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    encKey: decodeBytes(value.encKey, `${field}.encKey`, BYTES32_LENGTH),
    envelopes: decodeInboxEntries(value.envelopes, `${field}.envelopes`),
    registrations: decodeInboxEntries(
      value.registrations,
      `${field}.registrations`,
    ),
    authority: decodeMaintenanceKey(value.authority, `${field}.authority`),
  };
};

/** A maintenance update request as the channel carries it. */
type EncodedMaintenanceUpdate =
  SignerRequestPayloads['sign-maintenance-update'];

/** The changes of a maintenance update, each verifier key as hex. */
export const encodeMaintenanceChanges = (
  changes: MaintenanceChanges,
): EncodedMaintenanceUpdate['changes'] =>
  changes.kind === 'replace-authority'
    ? {
        kind: 'replace-authority',
        authority: {
          tag: changes.authority.tag,
          value: changes.authority.value,
        },
      }
    : {
        kind: 'insert-verifier-keys',
        inserts: changes.inserts.map(({ operation, verifierKey }) => ({
          operation,
          verifierKey: encodeBytes(verifierKey),
        })),
      };

/** Reads a verifier key of any length from its non-empty lowercase hex. */
const decodeVerifierKey = (value: unknown, field: string): Uint8Array => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !HEX_BYTES_PATTERN.test(value)
  ) {
    throw new MalformedPayloadError(field);
  }
  return ByteArray.fromHex(HexBytes(value));
};

/**
 * Reads the changes of a maintenance update: a replace naming the
 * authority it installs, or the verifier key inserts it makes, each an
 * operation name and its key, at most one per operation of the deployed
 * roster. Any other kind is refused.
 */
export const decodeMaintenanceChanges = (
  value: unknown,
  field: string,
): MaintenanceChanges => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  if (value.kind === 'replace-authority') {
    return {
      kind: 'replace-authority',
      authority: decodeMaintenanceKey(value.authority, `${field}.authority`),
    };
  }
  if (value.kind !== 'insert-verifier-keys' || !Array.isArray(value.inserts)) {
    throw new MalformedPayloadError(field);
  }
  if (value.inserts.length > DEPLOYED_OPERATIONS.length) {
    throw new MalformedPayloadError(`${field}.inserts`);
  }
  return {
    kind: 'insert-verifier-keys',
    inserts: value.inserts.map((insert: unknown, index) => {
      const at = `${field}.inserts[${index}]`;
      if (!isRecord(insert)) throw new MalformedPayloadError(at);
      return {
        operation: decodeString(insert.operation, `${at}.operation`),
        verifierKey: decodeVerifierKey(insert.verifierKey, `${at}.verifierKey`),
      };
    }),
  };
};

/**
 * A signed maintenance update as the channel carries it: the signature
 * and, for a replace, the authority it installs.
 */
export const encodeSignedMaintenanceUpdate = ({
  signature,
  authority,
}: SignedMaintenanceUpdate): Record<string, unknown> => ({
  signature: { tag: signature.tag, value: signature.value },
  ...(authority
    ? { authority: { tag: authority.tag, value: authority.value } }
    : {}),
});

/**
 * Reads what a maintenance signing answered: the signed update, or null
 * when no roster key of the envelopes sent derives the authority.
 */
export const decodeSignedMaintenanceUpdate = (
  value: unknown,
  field: string,
): SignedMaintenanceUpdate | null => {
  if (value === null) return null;
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const signature: MaintenanceSignature = decodeMaintenanceKey(
    value.signature,
    `${field}.signature`,
  );
  return value.authority === undefined
    ? { signature }
    : {
        signature,
        authority: decodeMaintenanceKey(value.authority, `${field}.authority`),
      };
};

/** Reads the delivery a joining device was sealed. */
export const decodeDeviceDelivery = (
  value: unknown,
  field: string,
): DeviceDelivery => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    envelope: decodeBytes(
      value.envelope,
      `${field}.envelope`,
      INBOX_ENTRY_LENGTH,
    ),
    registration: decodeBytes(
      value.registration,
      `${field}.registration`,
      INBOX_ENTRY_LENGTH,
    ),
  };
};

/** Reads a grant view a seal request answered: the seal and its record. */
export const decodeViewDelivery = (
  value: unknown,
  field: string,
): GrantViewDelivery => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    seal: decodeBytes(value.seal, `${field}.seal`, GRANT_VIEW_SEAL_LENGTH),
    entry: decodeBytes(value.entry, `${field}.entry`, INBOX_ENTRY_LENGTH),
  };
};

/**
 * The fields of a grant's bookkeeping other than its object fields. An
 * SDK or signer from before the grantee scheme was carried sends none,
 * and its grant reads as the jubjub grant it is, with the scheme filled
 * in.
 */
const decodeGrantFields = (
  value: Record<string, unknown>,
  field: string,
): Omit<GrantBookkeeping, 'object'> => ({
  grantId: decodeGrantId(value.grantId, `${field}.grantId`),
  slot: decodeSlot(value.slot, `${field}.slot`),
  scopeSalt: decodeScopeSalt(value.scopeSalt, `${field}.scopeSalt`),
  ...decodeGranteeFields(value, field),
  ...(value.readPublicKey === undefined
    ? {}
    : {
        readPublicKey: decodeHex32(
          value.readPublicKey,
          `${field}.readPublicKey`,
        ),
      }),
});

/**
 * Reads a grant's bookkeeping, each field in the shape the flows write
 * it: the id, salt and read key as 32-byte lowercase hex, the grantee
 * key in the form its scheme takes, a jubjub key when no scheme is
 * carried, the slot within the contract's bounds and the object fields.
 */
export const decodeGrantBookkeeping = (
  value: unknown,
  field: string,
): GrantBookkeeping => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  return {
    ...decodeGrantFields(value, field),
    object: decodeStoredGrantObject(value.object, `${field}.object`),
  };
};

/** Reads one part of a grant's bookkeeping as an opened entry carries it. */
const decodeGrantRecordPart = (
  value: unknown,
  field: string,
): GrantRecordPart => {
  if (!isRecord(value)) throw new MalformedPayloadError(field);
  const grantId = decodeGrantId(value.grantId, `${field}.grantId`);
  switch (value.part) {
    case 'grant':
      return { part: 'grant', ...decodeGrantFields(value, field) };
    case 'object':
      return {
        part: 'object',
        grantId,
        object: decodeStoredGrantObject(value.object, `${field}.object`),
      };
    case 'view':
      return {
        part: 'view',
        grantId,
        encKeyPrefix: encodeBytes(
          decodeBytes(
            value.encKeyPrefix,
            `${field}.encKeyPrefix`,
            ENC_KEY_PREFIX_LENGTH,
          ),
        ),
        seal: encodeBytes(
          decodeBytes(value.seal, `${field}.seal`, GRANT_VIEW_SEAL_LENGTH),
        ),
      };
    default:
      throw new MalformedPayloadError(`${field}.part`);
  }
};

/**
 * An opened inbox entry crosses the channel as its kind and what it
 * opened to: a coin with its bytes hex and value decimal, a device, or a
 * grant record part, whose fields are strings already; null stays null.
 */
export const encodeOpenedEntry = (
  entry: OpenedInboxEntry | null,
): Record<string, unknown> | null => {
  if (!entry) return null;
  switch (entry.kind) {
    case 'coin':
      return { kind: 'coin', coin: encodeShieldedCoin(entry.coin) };
    case 'device':
      return { kind: 'device', device: entry.device };
    case 'grant':
      return { kind: 'grant', record: entry.record };
  }
};

/** Reads the opened entries the signer answered, one item or null per entry. */
export const decodeOpenedEntries = (
  value: unknown,
  field: string,
): (OpenedInboxEntry | null)[] => {
  if (!Array.isArray(value)) throw new MalformedPayloadError(field);
  return value.map((item, index): OpenedInboxEntry | null => {
    const itemField = `${field}[${index}]`;
    if (item === null) return null;
    if (!isRecord(item)) throw new MalformedPayloadError(itemField);
    switch (item.kind) {
      case 'coin':
        return {
          kind: 'coin',
          coin: decodeShieldedCoin(item.coin, `${itemField}.coin`),
        };
      case 'device':
        return {
          kind: 'device',
          device: decodeDeviceReader(item.device, `${itemField}.device`),
        };
      case 'grant':
        return {
          kind: 'grant',
          record: decodeGrantRecordPart(item.record, `${itemField}.record`),
        };
      default:
        throw new MalformedPayloadError(`${itemField}.kind`);
    }
  });
};
