import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import {
  isWellFormedVkeyWitness,
  readVkeyOnlyWitnessSet,
} from './cardano-custody-witnesses';

import type {
  CardanoCustodySponsorCollateral,
  CardanoCustodySponsorLease,
} from './cardano-custody-sponsor';

/** A success body that breaks the documented shape; `field` names the first field at fault. */
export class MalformedSponsorAnswerError extends Error {
  public constructor(readonly field: string) {
    super(`Malformed sponsor answer field: ${field}`);
    this.name = 'MalformedSponsorAnswerError';
  }
}

/** The fields of a service error body. */
type SponsorServiceError = {
  code: string;
  rule?: string;
  detail?: string;
};

type JsonObject = Record<string, unknown>;

const TRANSACTION_ID_PATTERN = /^[\da-f]{64}$/i;
// The service formats expiries with `Date.prototype.toISOString`; an explicit
// offset is accepted too. Date.parse alone also takes locale formats.
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

// Sponsor UTxOs must be spendable, and collateral declarable, by the sponsor
// payment key alone, so only addresses with a key-hash payment part qualify.
const KEY_PAYMENT_ADDRESS_TYPES = new Set([
  Cardano.AddressType.BasePaymentKeyStakeKey,
  Cardano.AddressType.BasePaymentKeyStakeScript,
  Cardano.AddressType.PointerKey,
  Cardano.AddressType.EnterpriseKey,
]);

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readObject = (value: unknown, field: string): JsonObject => {
  if (!isJsonObject(value)) throw new MalformedSponsorAnswerError(field);
  return value;
};

const fieldPath = (prefix: string, key: string) =>
  prefix ? `${prefix}.${key}` : key;

const readNonEmptyString = (body: JsonObject, key: string, prefix = '') => {
  const value = body[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new MalformedSponsorAnswerError(fieldPath(prefix, key));
  }
  return value;
};

/** A JSON number that is a safe integer of at least `minimum`. */
const readSafeInteger = (
  body: JsonObject,
  key: string,
  { minimum, prefix = '' }: { minimum: number; prefix?: string },
) => {
  const value = body[key];
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new MalformedSponsorAnswerError(fieldPath(prefix, key));
  }
  return value;
};

const readSponsorAddress = (body: JsonObject, key: string, prefix = '') => {
  const value = body[key];
  const field = fieldPath(prefix, key);
  if (typeof value !== 'string') throw new MalformedSponsorAnswerError(field);
  let address: Cardano.Address;
  try {
    address = Cardano.Address.fromBech32(value);
  } catch {
    throw new MalformedSponsorAnswerError(field);
  }
  // The round trip refuses a prefix that disagrees with the network the
  // header encodes, and any non-canonical spelling.
  if (
    !KEY_PAYMENT_ADDRESS_TYPES.has(address.getType()) ||
    address.toBech32() !== value
  ) {
    throw new MalformedSponsorAnswerError(field);
  }
  return Cardano.PaymentAddress(value);
};

/**
 * A sponsor UTxO as the service presents it,
 * `{ txHash, index, address, lovelace }`, as a lovelace-only `Cardano.Utxo`. The service holds its UTxOs
 * at the sponsor address only, so a UTxO elsewhere is refused here instead of
 * failing the transaction after the device has signed it.
 */
const readSponsorUtxo = (
  body: JsonObject,
  sponsorAddress: Cardano.PaymentAddress,
  prefix = '',
): Cardano.Utxo => {
  const txHash = body.txHash;
  if (typeof txHash !== 'string' || !TRANSACTION_ID_PATTERN.test(txHash)) {
    throw new MalformedSponsorAnswerError(fieldPath(prefix, 'txHash'));
  }
  const index = readSafeInteger(body, 'index', { minimum: 0, prefix });
  const address = readSponsorAddress(body, 'address', prefix);
  // Both addresses are canonical bech32, so equal strings mean equal addresses.
  if (address !== sponsorAddress) {
    throw new MalformedSponsorAnswerError(fieldPath(prefix, 'address'));
  }
  const lovelace = readSafeInteger(body, 'lovelace', { minimum: 1, prefix });
  return [
    { txId: Cardano.TransactionId(txHash.toLowerCase()), index, address },
    { address, value: { coins: BigInt(lovelace) } },
  ];
};

const readPosixMilliseconds = (body: JsonObject, key: string) => {
  const value = body[key];
  const milliseconds =
    typeof value === 'string' && ISO_8601_PATTERN.test(value)
      ? Date.parse(value)
      : Number.NaN;
  if (!Number.isFinite(milliseconds)) {
    throw new MalformedSponsorAnswerError(key);
  }
  return milliseconds;
};

/**
 * The witness set of a witness answer. The service signs with the sponsor
 * payment key alone, so the set must hold exactly one well-sized vkey witness
 * and nothing else. It is read as the signer witness check reads it, so an
 * answer this accepts is never refused there as malformed. The signature is
 * not checked here.
 */
const readWitnessSet = (body: JsonObject): HexBlob => {
  const value = body.witnessSet;
  if (typeof value !== 'string') {
    throw new MalformedSponsorAnswerError('witnessSet');
  }
  const vkeys = readVkeyOnlyWitnessSet(value);
  if (vkeys?.length !== 1 || !isWellFormedVkeyWitness(vkeys[0])) {
    throw new MalformedSponsorAnswerError('witnessSet');
  }
  return HexBlob(value.toLowerCase());
};

/** Reads the answer to `POST /v1/leases`. */
export const parseLeaseAnswer = (
  answer: unknown,
): CardanoCustodySponsorLease => {
  const body = readObject(answer, 'body');
  const leaseId = readNonEmptyString(body, 'leaseId');
  const sponsorAddress = readSponsorAddress(body, 'sponsorAddress');
  return {
    leaseId,
    expiresAt: readPosixMilliseconds(body, 'expiresAt'),
    feeUtxo: readSponsorUtxo(
      readObject(body.fee, 'fee'),
      sponsorAddress,
      'fee',
    ),
    collateralUtxo: readSponsorUtxo(
      readObject(body.collateral, 'collateral'),
      sponsorAddress,
      'collateral',
    ),
    sponsorAddress,
    maxSponsoredLovelace: BigInt(
      readSafeInteger(body, 'maxSponsoredLovelace', { minimum: 0 }),
    ),
  };
};

/**
 * The lease id a `POST /v1/leases` answer names, even when the rest of the
 * answer is refused, or undefined when it names none.
 */
export const leaseIdOf = (answer: unknown): string | undefined =>
  isJsonObject(answer) &&
  typeof answer.leaseId === 'string' &&
  answer.leaseId.length > 0
    ? answer.leaseId
    : undefined;

/** Reads the answer to `DELETE /v1/leases/:id`, which must name the released lease. */
export const parseReleaseAnswer = (answer: unknown, leaseId: string): void => {
  const body = readObject(answer, 'body');
  if (body.leaseId !== leaseId) {
    throw new MalformedSponsorAnswerError('leaseId');
  }
  if (body.status !== 'released') {
    throw new MalformedSponsorAnswerError('status');
  }
};

/** Reads the answer to `POST /v1/leases/:id/witness`, which must name the lease asked on. */
export const parseLeaseWitnessAnswer = (
  answer: unknown,
  leaseId: string,
): HexBlob => {
  const body = readObject(answer, 'body');
  if (body.leaseId !== leaseId) {
    throw new MalformedSponsorAnswerError('leaseId');
  }
  return readWitnessSet(body);
};

/** Reads the answer to `GET /v1/collateral`. */
export const parseCollateralAnswer = (
  answer: unknown,
): CardanoCustodySponsorCollateral => {
  const body = readObject(answer, 'body');
  const sponsorAddress = readSponsorAddress(body, 'sponsorAddress');
  return {
    collateralUtxo: readSponsorUtxo(body, sponsorAddress),
    sponsorAddress,
    validitySeconds: readSafeInteger(body, 'validitySeconds', { minimum: 1 }),
  };
};

/**
 * The id of a transaction: the hash of its body bytes as they stand, as the
 * service computes it. Undefined when the transaction does not decode.
 */
const transactionIdOf = (transaction: HexBlob): string | undefined => {
  try {
    return Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(transaction),
    ).getId();
  } catch {
    return undefined;
  }
};

/**
 * Reads the answer to `POST /v1/collateral/witness`, which must name the
 * posted transaction. A transaction that does not decode cannot be matched,
 * so its answer is refused.
 */
export const parseCollateralWitnessAnswer = (
  answer: unknown,
  transaction: HexBlob,
): HexBlob => {
  const body = readObject(answer, 'body');
  const txHash = body.txHash;
  if (
    typeof txHash !== 'string' ||
    txHash.toLowerCase() !== transactionIdOf(transaction)
  ) {
    throw new MalformedSponsorAnswerError('txHash');
  }
  return readWitnessSet(body);
};

/**
 * The service error body `{ error, rule?, detail? }`, or undefined when the
 * body has another shape, as a proxy's answer does.
 */
export const parseServiceError = (
  answer: unknown,
): SponsorServiceError | undefined => {
  if (!isJsonObject(answer)) return undefined;
  const { error, rule, detail } = answer;
  if (
    typeof error !== 'string' ||
    error.length === 0 ||
    (rule !== undefined && typeof rule !== 'string') ||
    (detail !== undefined && typeof detail !== 'string')
  ) {
    return undefined;
  }
  return { code: error, rule, detail };
};
