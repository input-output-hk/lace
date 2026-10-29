// Ported from Biglup/cardano-account-custody-contract offchain/src/address.ts
// and lib/cardano_account_custody_contract/account.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// names are parsed into a typed result instead of sliced, and only lower-case
// hex of the two contract name lengths is recognised.

import { Cardano } from '@cardano-sdk/core';

import { HASH_28_BYTE_LENGTH, isLowerCaseHex } from './hex';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

/** Bytes of the big-endian slot a grant token name appends to the stake script hash. */
const SLOT_BYTES = 4;
const SLOT_HEX_LENGTH = SLOT_BYTES * 2;
const STAKE_SCRIPT_HASH_HEX_LENGTH = HASH_28_BYTE_LENGTH * 2;

/** The first slot a grant token name cannot carry. */
export const CUSTODY_SLOT_LIMIT = 1n << BigInt(SLOT_BYTES * 8);

/**
 * A token name under the account policy, read by its shape: a state NFT is
 * named by the account's stake script hash, a grant token by that hash
 * followed by its slot. The proxy keeps both at the address of the
 * account the hash names.
 */
type CustodyAccountTokenName =
  | {
      readonly kind: 'grant';
      readonly stakeScriptHash: Hash28ByteBase16;
      readonly slot: bigint;
    }
  | {
      readonly kind: 'state-nft';
      readonly stakeScriptHash: Hash28ByteBase16;
    };

/**
 * The name of an account's grant token for `slot`: the stake script hash
 * followed by the slot as four big-endian bytes. Throws `RangeError` for a
 * slot outside 0 to 2^32 - 1, which no grant token can carry.
 *
 * @param stakeScriptHash - lower-case hex of exactly 28 bytes, checked by the caller
 */
export const custodyGrantTokenName = (
  stakeScriptHash: Hash28ByteBase16,
  slot: bigint,
): Cardano.AssetName => {
  if (slot < 0n || slot >= CUSTODY_SLOT_LIMIT) {
    throw new RangeError(`Slot ${slot} does not fit a grant token name`);
  }
  return Cardano.AssetName(
    `${stakeScriptHash}${slot.toString(16).padStart(SLOT_HEX_LENGTH, '0')}`,
  );
};

/**
 * The asset id of an account's grant token for `slot`, under the account
 * validator's policy. Throws like `custodyGrantTokenName`.
 */
export const custodyGrantAssetId = (
  {
    accountValidatorHash,
    stakeScriptHash,
  }: {
    readonly accountValidatorHash: Hash28ByteBase16;
    readonly stakeScriptHash: Hash28ByteBase16;
  },
  slot: bigint,
): Cardano.AssetId =>
  Cardano.AssetId.fromParts(
    Cardano.PolicyId(accountValidatorHash),
    custodyGrantTokenName(stakeScriptHash, slot),
  );

/**
 * What a token name under the account policy names, or undefined when it
 * has neither contract shape. The policy is the caller's to check.
 */
export const parseCustodyAccountTokenName = (
  name: string,
): CustodyAccountTokenName | undefined => {
  if (!isLowerCaseHex(name)) return undefined;
  const stakeScriptHash = name.slice(
    0,
    STAKE_SCRIPT_HASH_HEX_LENGTH,
  ) as Hash28ByteBase16;
  if (name.length === STAKE_SCRIPT_HASH_HEX_LENGTH) {
    return { kind: 'state-nft', stakeScriptHash };
  }
  if (name.length === STAKE_SCRIPT_HASH_HEX_LENGTH + SLOT_HEX_LENGTH) {
    return {
      kind: 'grant',
      stakeScriptHash,
      slot: BigInt(`0x${name.slice(STAKE_SCRIPT_HASH_HEX_LENGTH)}`),
    };
  }
  return undefined;
};
