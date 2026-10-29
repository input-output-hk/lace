import { Cardano } from '@cardano-sdk/core';

import { findCustodyContractVersion } from './contract-version';
import { isHash28Hex } from './hex';
import {
  chainIdFromNetworkMagic,
  identityOfValidatedCreator,
  isNetworkMagic,
} from './identity';
import { fail, ok } from './result';

import type { CustodyAccountIdentity } from './identity';
import type { CustodyResult } from './result';
import type { Ed25519KeyHashHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';

export const CUSTODY_ACCOUNT_RECORD_TYPE = 'cardano-custody-account';

/**
 * The transferable, public description of one custody account. It never
 * changes after creation and holds no device list: the control datum is the
 * source of truth for devices, and the grant UTxOs for grants. All hex is
 * lower case.
 */
export interface CustodyAccountRecord {
  readonly type: typeof CUSTODY_ACCOUNT_RECORD_TYPE;
  readonly version: 1;
  readonly networkMagic: Cardano.NetworkMagic;
  readonly accountValidatorHash: Hash28ByteBase16;
  readonly creatorKeyHash: Ed25519KeyHashHex;
  readonly stakeScriptHash: Hash28ByteBase16;
  readonly address: Cardano.PaymentAddress;
}

/** The record together with the identity its validation re-derived. */
interface ParsedCustodyAccountRecord {
  readonly record: CustodyAccountRecord;
  readonly identity: CustodyAccountIdentity;
}

/** Why a record was refused, named by the first validation step it failed. */
export type CustodyAccountRecordError =
  | {
      /** Step 1: unknown type or version, a missing or extra field, bad hex. */
      readonly code: 'malformed-record';
      readonly field?: string;
      readonly reason: string;
      readonly step: 1;
    }
  | {
      /** Step 2: the account validator is not a pinned contract version. */
      readonly accountValidatorHash: string;
      readonly code: 'unsupported-contract-version';
      readonly step: 2;
    }
  | {
      /** Step 3: the creator key hash does not yield the stake script hash. */
      readonly actual: string;
      readonly code: 'stake-script-hash-mismatch';
      readonly expected: Hash28ByteBase16;
      readonly step: 3;
    }
  | {
      /** Step 4: the address is not the derived base address, byte for byte. */
      readonly actual: string;
      readonly code: 'address-mismatch';
      readonly expected: Cardano.PaymentAddress;
      readonly step: 4;
    }
  | {
      /** Step 5: the record belongs to another network. */
      readonly actual: Cardano.NetworkMagic;
      readonly code: 'network-mismatch';
      readonly expected: Cardano.NetworkMagic;
      readonly step: 5;
    };

export const createCustodyAccountRecord = (
  identity: CustodyAccountIdentity,
): CustodyAccountRecord =>
  canonicalCustodyAccountRecord({
    type: CUSTODY_ACCOUNT_RECORD_TYPE,
    version: 1,
    networkMagic: identity.chainId.networkMagic,
    accountValidatorHash: identity.contractVersion.accountValidatorHash,
    creatorKeyHash: identity.creatorKeyHash,
    stakeScriptHash: identity.stakeScriptHash,
    address: identity.address,
  });

/** A copy holding exactly the record fields, in their canonical order. */
export const canonicalCustodyAccountRecord = (
  record: CustodyAccountRecord,
): CustodyAccountRecord => ({
  type: record.type,
  version: record.version,
  networkMagic: record.networkMagic,
  accountValidatorHash: record.accountValidatorHash,
  creatorKeyHash: record.creatorKeyHash,
  stakeScriptHash: record.stakeScriptHash,
  address: record.address,
});

const RECORD_FIELDS = Object.keys(
  canonicalCustodyAccountRecord({} as CustodyAccountRecord),
);
const UPSTREAM_RECORD_FIELDS = ['owner', 'stakeScriptHash', 'address'];

/** A record's claims before anything is re-derived. */
interface RecordClaims {
  readonly networkMagic: Cardano.NetworkMagic;
  readonly accountValidatorHash: string;
  readonly creatorKeyHash: string;
  readonly stakeScriptHash: string;
  readonly address: Cardano.Address;
  readonly addressText: string;
}

type MalformedRecord = Extract<
  CustodyAccountRecordError,
  { code: 'malformed-record' }
>;

const malformed = (reason: string, field?: string): MalformedRecord => ({
  step: 1,
  code: 'malformed-record',
  reason,
  ...(field === undefined ? {} : { field }),
});

const parseJson = (input: unknown): unknown => {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return undefined;
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean => {
  const keys = Object.keys(value);
  return (
    keys.length === fields.length && fields.every(field => keys.includes(field))
  );
};

const parseAddress = (value: unknown): Cardano.Address | null =>
  typeof value === 'string' && Cardano.Address.isValidBech32(value)
    ? Cardano.Address.fromBech32(value)
    : null;

const HASH_FIELDS = [
  'accountValidatorHash',
  'creatorKeyHash',
  'stakeScriptHash',
] as const;

const readRecordClaims = (
  value: Record<string, unknown>,
): CustodyResult<RecordClaims, MalformedRecord> => {
  if (!hasExactFields(value, RECORD_FIELDS)) {
    return fail(malformed(`expected exactly ${RECORD_FIELDS.join(', ')}`));
  }
  if (value.type !== CUSTODY_ACCOUNT_RECORD_TYPE) {
    return fail(malformed('unknown record type', 'type'));
  }
  if (value.version !== 1) {
    return fail(malformed('unsupported record version', 'version'));
  }
  if (!isNetworkMagic(value.networkMagic)) {
    return fail(malformed('expected a network magic', 'networkMagic'));
  }
  const invalidHash = HASH_FIELDS.find(field => !isHash28Hex(value[field]));
  if (invalidHash) {
    return fail(malformed('expected 28 bytes of lower-case hex', invalidHash));
  }
  const address = parseAddress(value.address);
  if (!address) return fail(malformed('expected an address', 'address'));
  return ok({
    networkMagic: value.networkMagic,
    accountValidatorHash: value.accountValidatorHash as string,
    creatorKeyHash: value.creatorKeyHash as string,
    stakeScriptHash: value.stakeScriptHash as string,
    address,
    addressText: value.address as string,
  });
};

/**
 * Claims of the upstream `{ owner, stakeScriptHash, address }` record. It
 * names no network or contract version: the network is the selected one, and
 * the account validator is the address's payment script.
 */
const readUpstreamRecordClaims = (
  value: Record<string, unknown>,
  selectedNetworkMagic: Cardano.NetworkMagic,
): CustodyResult<RecordClaims, MalformedRecord> => {
  if (!hasExactFields(value, UPSTREAM_RECORD_FIELDS)) {
    return fail(
      malformed(`expected exactly ${UPSTREAM_RECORD_FIELDS.join(', ')}`),
    );
  }
  const invalidHash = ['owner', 'stakeScriptHash'].find(
    field => !isHash28Hex(value[field]),
  );
  if (invalidHash) {
    return fail(malformed('expected 28 bytes of lower-case hex', invalidHash));
  }
  const address = parseAddress(value.address);
  const payment = address?.asBase()?.getPaymentCredential();
  if (!address || payment?.type !== Cardano.CredentialType.ScriptHash) {
    return fail(malformed('expected a script base address', 'address'));
  }
  return ok({
    networkMagic: selectedNetworkMagic,
    accountValidatorHash: payment.hash,
    creatorKeyHash: value.owner as string,
    stakeScriptHash: value.stakeScriptHash as string,
    address,
    addressText: value.address as string,
  });
};

const readClaims = (
  input: unknown,
  selectedNetworkMagic: Cardano.NetworkMagic,
): CustodyResult<RecordClaims, MalformedRecord> => {
  const value = parseJson(input);
  if (!isPlainObject(value)) {
    return fail(malformed('expected a JSON object'));
  }
  return 'owner' in value
    ? readUpstreamRecordClaims(value, selectedNetworkMagic)
    : readRecordClaims(value);
};

/**
 * Validates an imported record, in order: (1) known type, version and field
 * shapes; (2) a supported contract version; (3) the stake script hash
 * re-derived from the creator key hash; (4) the address re-derived for the
 * record's network, byte for byte; (5) the record's network is the selected
 * one. Step 3 is what proves the record names a genuine custody account: the
 * mint accepts any stake script.
 *
 * Also accepts the upstream `{ owner, stakeScriptHash, address }` record,
 * taking the network from `selectedNetworkMagic`.
 *
 * @param input - the record as JSON text or as an already parsed value
 */
export const parseCustodyAccountRecord = (
  input: unknown,
  selectedNetworkMagic: Cardano.NetworkMagic,
): CustodyResult<ParsedCustodyAccountRecord, CustodyAccountRecordError> => {
  const claims = readClaims(input, selectedNetworkMagic);
  if (!claims.ok) return claims;
  const {
    networkMagic,
    accountValidatorHash,
    creatorKeyHash,
    stakeScriptHash,
    address,
    addressText,
  } = claims.value;

  const contractVersion = findCustodyContractVersion(accountValidatorHash);
  if (!contractVersion.ok) {
    return fail({ step: 2, ...contractVersion.error });
  }

  const identity = identityOfValidatedCreator({
    contractVersion: contractVersion.value,
    creatorKeyHash,
    chainId: chainIdFromNetworkMagic(networkMagic),
  });
  if (identity.stakeScriptHash !== stakeScriptHash) {
    return fail({
      step: 3,
      code: 'stake-script-hash-mismatch',
      expected: identity.stakeScriptHash,
      actual: stakeScriptHash,
    });
  }

  const derivedAddress = identity.address;
  if (
    Cardano.Address.fromBech32(derivedAddress).toBytes() !== address.toBytes()
  ) {
    return fail({
      step: 4,
      code: 'address-mismatch',
      expected: derivedAddress,
      actual: addressText,
    });
  }

  if (networkMagic !== selectedNetworkMagic) {
    return fail({
      step: 5,
      code: 'network-mismatch',
      expected: selectedNetworkMagic,
      actual: networkMagic,
    });
  }

  return ok({
    record: createCustodyAccountRecord(identity),
    identity,
  });
};
