import { Cardano } from '@cardano-sdk/core';

import { custodyRecipientFromAddress, recipientKey } from '../codecs/recipient';
import { isHash28Hex, isLowerCaseHex } from '../hex';
import { fail, ok } from '../result';
import { CUSTODY_MAX_RECIPIENTS } from '../state/rules';

import type { CustodyAsset, CustodyGrant } from '../codecs/account-state';
import type { CustodyRecipient } from '../codecs/recipient';
import type { CustodyResult } from '../result';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * The grant an app asks a device to issue, declared beside the transaction.
 * It is the caller's claim: comparing it with the grant datum the
 * transaction writes in a grant output checks consistency, not
 * authenticity. The generation is not requested: the transaction derives it
 * from the account state it writes.
 */
export interface CustodyRequestedGrantScope {
  readonly slot: bigint;
  readonly grantee: HexBlob;
  readonly asset: CustodyAsset;
  readonly perCallCap: bigint;
  readonly cap: bigint;
  readonly lovelacePerCallCap: bigint;
  readonly lovelaceCap: bigint;
  /** POSIX milliseconds. */
  readonly expiresAt: bigint;
  /** Shelley payment addresses on the account network in canonical bech32, in grant order. */
  readonly recipients: readonly Cardano.PaymentAddress[];
}

/**
 * A requested scope as protocol JSON: integers as decimal strings, hashes
 * and asset names as lower-case hex, recipients as bech32.
 */
export interface SerializedCustodyRequestedGrantScope {
  readonly slot: string;
  readonly grantee: string;
  readonly asset: { readonly policyId: string; readonly assetName: string };
  readonly perCallCap: string;
  readonly cap: string;
  readonly lovelacePerCallCap: string;
  readonly lovelaceCap: string;
  readonly expiresAt: string;
  readonly recipients: readonly string[];
}

export type CustodyRequestedGrantScopeField = keyof CustodyRequestedGrantScope;

interface CustodyRequestedGrantScopeParseError {
  readonly code: 'malformed-requested-scope';
  readonly field?: string;
  readonly reason: string;
}

/**
 * The recipient a bech32 Shelley payment address names, when the text is
 * spelled exactly as `toBech32` writes it: lower case, with the prefix of the
 * network its header names. Bech32 also decodes an upper-case spelling and
 * ignores the prefix, so a mainnet-looking address could otherwise stand for
 * a testnet recipient.
 */
const canonicalRecipientOf = (
  value: unknown,
):
  | { readonly address: Cardano.Address; readonly recipient: CustodyRecipient }
  | undefined => {
  if (typeof value !== 'string' || !Cardano.Address.isValidBech32(value)) {
    return undefined;
  }
  const address = Cardano.Address.fromBech32(value);
  const recipient = custodyRecipientFromAddress(address);
  return recipient.ok && address.toBech32() === value
    ? { address, recipient: recipient.value }
    : undefined;
};

const recipientKeysOn = (
  recipients: readonly string[],
  networkId: Cardano.NetworkId,
): string[] | undefined => {
  const keys: string[] = [];
  for (const text of recipients) {
    const canonical = canonicalRecipientOf(text);
    if (canonical?.address.getNetworkId() !== networkId) return undefined;
    keys.push(recipientKey(canonical.recipient));
  }
  return keys;
};

const hasSameRecipients = (
  requested: readonly string[],
  actual: CustodyGrant,
  networkId: Cardano.NetworkId,
): boolean => {
  const requestedKeys = recipientKeysOn(requested, networkId);
  const { recipients } = actual.scope;
  return (
    requestedKeys !== undefined &&
    requestedKeys.length === recipients.length &&
    requestedKeys.every((key, index) => key === recipientKey(recipients[index]))
  );
};

/**
 * The fields where a requested scope differs from a grant a transaction
 * issues, in declaration order; empty when they match. Every field must be
 * equal exactly. Recipients must be the same Plutus addresses in the same
 * order, and every requested recipient must be on the account network,
 * because the datum carries no network and the grant would otherwise send
 * to another network's address with the same credentials.
 */
export const compareRequestedGrantScope = (
  requested: CustodyRequestedGrantScope,
  actual: CustodyGrant,
  chainId: Cardano.ChainId,
): CustodyRequestedGrantScopeField[] => {
  const { scope } = actual;
  const isEqual: Record<CustodyRequestedGrantScopeField, boolean> = {
    slot: requested.slot === actual.slot,
    grantee: requested.grantee === actual.grantee,
    asset:
      requested.asset.policyId === scope.asset.policyId &&
      requested.asset.assetName === scope.asset.assetName,
    perCallCap: requested.perCallCap === scope.perCallCap,
    cap: requested.cap === scope.cap,
    lovelacePerCallCap:
      requested.lovelacePerCallCap === scope.lovelacePerCallCap,
    lovelaceCap: requested.lovelaceCap === scope.lovelaceCap,
    expiresAt: requested.expiresAt === scope.expiresAt,
    recipients: hasSameRecipients(
      requested.recipients,
      actual,
      chainId.networkId,
    ),
  };
  return (Object.keys(isEqual) as CustodyRequestedGrantScopeField[]).filter(
    field => !isEqual[field],
  );
};

export const serializeCustodyRequestedGrantScope = (
  scope: CustodyRequestedGrantScope,
): SerializedCustodyRequestedGrantScope => ({
  slot: scope.slot.toString(),
  grantee: scope.grantee,
  asset: { policyId: scope.asset.policyId, assetName: scope.asset.assetName },
  perCallCap: scope.perCallCap.toString(),
  cap: scope.cap.toString(),
  lovelacePerCallCap: scope.lovelacePerCallCap.toString(),
  lovelaceCap: scope.lovelaceCap.toString(),
  expiresAt: scope.expiresAt.toString(),
  recipients: [...scope.recipients],
});

const SCOPE_FIELDS = [
  'slot',
  'grantee',
  'asset',
  'perCallCap',
  'cap',
  'lovelacePerCallCap',
  'lovelaceCap',
  'expiresAt',
  'recipients',
] as const;
const ASSET_FIELDS = ['policyId', 'assetName'] as const;
const INTEGER_FIELDS = [
  'slot',
  'perCallCap',
  'cap',
  'lovelacePerCallCap',
  'lovelaceCap',
  'expiresAt',
] as const;
const MAX_ASSET_NAME_BYTES = 32;

/** Canonical decimal: no sign, no leading zero, no exponent. */
const NON_NEGATIVE_DECIMAL = /^(?:0|[1-9]\d*)$/;

const isNonNegativeDecimal = (value: unknown): value is string =>
  typeof value === 'string' && NON_NEGATIVE_DECIMAL.test(value);

const malformed = (
  reason: string,
  field?: string,
): CustodyResult<never, CustodyRequestedGrantScopeParseError> =>
  fail({
    code: 'malformed-requested-scope',
    reason,
    ...(field === undefined ? {} : { field }),
  });

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

const isShelleyPaymentAddress = (value: unknown): value is string =>
  canonicalRecipientOf(value) !== undefined;

const isWellFormedAsset = (
  asset: Record<string, unknown>,
): asset is CustodyAsset & Record<string, unknown> => {
  const { policyId, assetName } = asset;
  if (policyId === '') return assetName === '';
  return (
    isHash28Hex(policyId) &&
    isLowerCaseHex(assetName) &&
    assetName.length <= MAX_ASSET_NAME_BYTES * 2
  );
};

/**
 * Reads a requested scope from protocol JSON, refusing anything but the
 * exact shape `serializeCustodyRequestedGrantScope` writes: no missing or
 * extra field, canonical non-negative decimal integers, a positive expiry,
 * a 28-byte grantee, a lovelace or 28-byte policy asset with a name of at
 * most 32 bytes, and at most 8 Shelley payment addresses in canonical
 * bech32. Network membership of the recipients is checked when comparing.
 *
 * @param input - the scope as JSON text or as an already parsed value
 */
export const parseCustodyRequestedGrantScope = (
  input: unknown,
): CustodyResult<
  CustodyRequestedGrantScope,
  CustodyRequestedGrantScopeParseError
> => {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return malformed('expected JSON');
    }
  }
  if (!isPlainObject(value) || !hasExactFields(value, SCOPE_FIELDS)) {
    return malformed(`expected exactly ${SCOPE_FIELDS.join(', ')}`);
  }
  const integerField = INTEGER_FIELDS.find(
    field => !isNonNegativeDecimal(value[field]),
  );
  if (integerField) {
    return malformed('expected a non-negative decimal string', integerField);
  }
  if (value.expiresAt === '0') {
    return malformed('expected a positive expiry', 'expiresAt');
  }
  if (!isHash28Hex(value.grantee)) {
    return malformed('expected 28 bytes of lower-case hex', 'grantee');
  }
  const { asset, recipients } = value;
  if (
    !isPlainObject(asset) ||
    !hasExactFields(asset, ASSET_FIELDS) ||
    !isWellFormedAsset(asset)
  ) {
    return malformed(
      'expected lovelace or a policy id and asset name',
      'asset',
    );
  }
  if (
    !Array.isArray(recipients) ||
    recipients.length > CUSTODY_MAX_RECIPIENTS ||
    !recipients.every(isShelleyPaymentAddress)
  ) {
    return malformed(
      `expected at most ${CUSTODY_MAX_RECIPIENTS} bech32 payment addresses`,
      'recipients',
    );
  }
  const integers = value as Record<(typeof INTEGER_FIELDS)[number], string>;
  return ok({
    slot: BigInt(integers.slot),
    grantee: value.grantee,
    asset: { policyId: asset.policyId, assetName: asset.assetName },
    perCallCap: BigInt(integers.perCallCap),
    cap: BigInt(integers.cap),
    lovelacePerCallCap: BigInt(integers.lovelacePerCallCap),
    lovelaceCap: BigInt(integers.lovelaceCap),
    expiresAt: BigInt(integers.expiresAt),
    recipients: recipients as Cardano.PaymentAddress[],
  });
};
