// Ported from Biglup/cardano-account-custody-contract offchain/src/state.ts and
// lib/cardano_account_custody_contract/state.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// violations are typed and located, and authoring rules the contract does not
// check (hash lengths, asset shape, distinct recipients, slot range) are added.

import { isRepresentableRecipient, recipientKey } from '../codecs/recipient';
import { isHash28Hex, isLowerCaseHex } from '../hex';
import { CUSTODY_SLOT_LIMIT } from '../tokens';

import type {
  CustodyAccountState,
  CustodyAsset,
  CustodyGrant,
} from '../codecs/account-state';
import type { HexBlob } from '@cardano-sdk/util';

export const CUSTODY_MAX_DEVICES = 8;
/** Most grants an account may hold outstanding: minted and not yet burned, live or dead. */
export const CUSTODY_MAX_GRANTS = 16;
/** Most slots the revoked list may hold; a full list forces a sweep or a generation bump. */
export const CUSTODY_MAX_REVOKED = 32;
export const CUSTODY_MAX_RECIPIENTS = 8;
/**
 * Most grants one transaction may issue or sweep: more exceed the
 * per-transaction execution memory with the largest grants.
 */
export const CUSTODY_MAX_GRANT_BATCH = 8;

const MAX_ASSET_NAME_BYTES = 32;
const POLICY_ID_BYTES = 28;

export const CUSTODY_LOVELACE_ASSET: CustodyAsset = {
  policyId: '' as HexBlob,
  assetName: '' as HexBlob,
};

export const isCustodyLovelaceAsset = (asset: CustodyAsset): boolean =>
  asset.policyId === '' && asset.assetName === '';

type CustodyCapField =
  | 'cap'
  | 'lovelaceCap'
  | 'lovelacePerCallCap'
  | 'perCallCap';

/**
 * A rule one grant breaks. The contract enforces only the cap signs, the
 * positive expiry, the recipient count and the zero lovelace caps of a
 * lovelace grant at issuance; the rest are rules Lace applies to every grant
 * it authors or approves, because a grant breaking them is valid on chain but
 * unusable or misleading.
 */
export type CustodyGrantViolation =
  | {
      readonly code: 'duplicate-recipient';
      readonly recipientIndex: number;
      readonly slot: bigint;
    }
  | {
      readonly code: 'negative-cap';
      readonly field: CustodyCapField;
      readonly slot: bigint;
    }
  | {
      readonly code: 'recipient-count';
      readonly count: number;
      readonly slot: bigint;
    }
  | {
      readonly code: 'unrepresentable-recipient';
      readonly recipientIndex: number;
      readonly slot: bigint;
    }
  /** Longer than 32 bytes, not hex, or non-empty under an empty policy id. */
  | { readonly code: 'invalid-asset-name'; readonly slot: bigint }
  | { readonly code: 'invalid-grantee-key-hash'; readonly slot: bigint }
  /** Neither empty (lovelace) nor 28 bytes of lower-case hex. */
  | { readonly code: 'invalid-policy-id'; readonly slot: bigint }
  | { readonly code: 'lovelace-grant-lovelace-caps'; readonly slot: bigint }
  | { readonly code: 'negative-generation'; readonly slot: bigint }
  | { readonly code: 'non-positive-expiry'; readonly slot: bigint }
  /** Outside 0 to 2^32 - 1, the slots a grant token name can carry. */
  | { readonly code: 'slot-out-of-range'; readonly slot: bigint };

/** A rule a control state breaks, located by device position where it applies. */
export type CustodyStateViolation =
  | {
      readonly code: 'duplicate-device';
      readonly device: HexBlob;
      readonly deviceIndex: number;
    }
  | {
      readonly code: 'invalid-device-key-hash';
      readonly device: HexBlob;
      readonly deviceIndex: number;
    }
  | { readonly code: 'device-count'; readonly count: number }
  /** Not 28 bytes of lower-case hex, so it names no script the proxy can run. */
  | { readonly code: 'invalid-logic-hash'; readonly logic: HexBlob }
  | { readonly code: 'negative-grant-generation' }
  | { readonly code: 'negative-next-slot' }
  | { readonly code: 'negative-outstanding' }
  /** More grants outstanding than `CUSTODY_MAX_GRANTS`. */
  | { readonly code: 'outstanding-count'; readonly count: bigint }
  /** More revoked slots than `CUSTODY_MAX_REVOKED`. */
  | { readonly code: 'revoked-count'; readonly count: number };

const isPolicyIdWellFormed = (policyId: string): boolean =>
  policyId === '' || isLowerCaseHex(policyId, POLICY_ID_BYTES);

const isAssetNameWellFormed = ({ policyId, assetName }: CustodyAsset) =>
  isLowerCaseHex(assetName) &&
  assetName.length <= MAX_ASSET_NAME_BYTES * 2 &&
  (policyId !== '' || assetName === '');

const CAP_FIELDS: readonly CustodyCapField[] = [
  'perCallCap',
  'cap',
  'lovelacePerCallCap',
  'lovelaceCap',
];

/** Every rule a grant breaks, in field order; empty for an authorable grant. */
export const findCustodyGrantViolations = (
  grant: CustodyGrant,
): CustodyGrantViolation[] => {
  const { slot, scope } = grant;
  const violations: CustodyGrantViolation[] = [];
  if (slot < 0n || slot >= CUSTODY_SLOT_LIMIT) {
    violations.push({ code: 'slot-out-of-range', slot });
  }
  if (!isHash28Hex(grant.grantee)) {
    violations.push({ code: 'invalid-grantee-key-hash', slot });
  }
  if (grant.generation < 0n) {
    violations.push({ code: 'negative-generation', slot });
  }
  if (!isPolicyIdWellFormed(scope.asset.policyId)) {
    violations.push({ code: 'invalid-policy-id', slot });
  }
  if (!isAssetNameWellFormed(scope.asset)) {
    violations.push({ code: 'invalid-asset-name', slot });
  }
  for (const field of CAP_FIELDS) {
    if (scope[field] < 0n) {
      violations.push({ code: 'negative-cap', field, slot });
    }
  }
  if (
    isCustodyLovelaceAsset(scope.asset) &&
    (scope.lovelacePerCallCap !== 0n || scope.lovelaceCap !== 0n)
  ) {
    violations.push({ code: 'lovelace-grant-lovelace-caps', slot });
  }
  if (scope.expiresAt <= 0n) {
    violations.push({ code: 'non-positive-expiry', slot });
  }
  if (scope.recipients.length > CUSTODY_MAX_RECIPIENTS) {
    violations.push({
      code: 'recipient-count',
      count: scope.recipients.length,
      slot,
    });
  }
  const seenRecipients = new Set<string>();
  for (const [recipientIndex, recipient] of scope.recipients.entries()) {
    if (!isRepresentableRecipient(recipient)) {
      violations.push({
        code: 'unrepresentable-recipient',
        recipientIndex,
        slot,
      });
    }
    const key = recipientKey(recipient);
    if (seenRecipients.has(key)) {
      violations.push({ code: 'duplicate-recipient', recipientIndex, slot });
    }
    seenRecipients.add(key);
  }
  return violations;
};

/**
 * Every rule a control state breaks: the contract's well-formedness bounds
 * plus a 28-byte logic hash and 28-byte device key hashes. Apply it to every
 * state Lace builds or approves. An on-chain state may hold an ill-sized
 * device, which can never sign; its violation names it so a device can
 * remove it.
 */
export const findCustodyStateViolations = (
  state: CustodyAccountState,
): CustodyStateViolation[] => {
  const violations: CustodyStateViolation[] = [];
  if (!isHash28Hex(state.logic)) {
    violations.push({ code: 'invalid-logic-hash', logic: state.logic });
  }
  const deviceCount = state.devices.length;
  if (deviceCount < 1 || deviceCount > CUSTODY_MAX_DEVICES) {
    violations.push({ code: 'device-count', count: deviceCount });
  }
  const seenDevices = new Set<string>();
  for (const [deviceIndex, device] of state.devices.entries()) {
    if (!isHash28Hex(device)) {
      violations.push({ code: 'invalid-device-key-hash', device, deviceIndex });
    }
    if (seenDevices.has(device)) {
      violations.push({ code: 'duplicate-device', device, deviceIndex });
    }
    seenDevices.add(device);
  }
  if (state.grantGeneration < 0n) {
    violations.push({ code: 'negative-grant-generation' });
  }
  if (state.nextSlot < 0n) {
    violations.push({ code: 'negative-next-slot' });
  }
  if (state.outstanding < 0n) {
    violations.push({ code: 'negative-outstanding' });
  }
  if (state.outstanding > BigInt(CUSTODY_MAX_GRANTS)) {
    violations.push({ code: 'outstanding-count', count: state.outstanding });
  }
  if (state.revoked.length > CUSTODY_MAX_REVOKED) {
    violations.push({ code: 'revoked-count', count: state.revoked.length });
  }
  return violations;
};

/**
 * Whether a grant can no longer be used at `now` (POSIX milliseconds): a
 * spend's upper validity bound must not pass `expiresAt`, so a grant is
 * expired from the instant it names. A non-finite `now` is a broken clock,
 * which can never show a grant as usable, so it counts as expired.
 */
export const isCustodyGrantExpired = (
  grant: CustodyGrant,
  now: number,
): boolean =>
  !Number.isFinite(now) || grant.scope.expiresAt <= BigInt(Math.floor(now));

/**
 * Whether a grant is current against a control state, as the contract
 * judges a spend: issued under the state's generation and not revoked by
 * slot. Expiry is the validity range's business.
 */
export const isCustodyGrantCurrent = (
  grant: CustodyGrant,
  state: CustodyAccountState,
): boolean =>
  grant.generation === state.grantGeneration &&
  !state.revoked.includes(grant.slot);

/**
 * Grants whose grantee is also a listed device. Lace never authors such an
 * account, but the contract allows it, so consent warns about it.
 */
export const findCustodyGrantsHeldByDevices = (
  state: CustodyAccountState,
  grants: readonly CustodyGrant[],
): CustodyGrant[] =>
  grants.filter(grant => state.devices.includes(grant.grantee));
