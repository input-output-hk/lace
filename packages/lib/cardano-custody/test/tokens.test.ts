import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_VALIDATOR_HASH,
  custodyGrantAssetId,
  custodyGrantTokenName,
  parseCustodyAccountTokenName,
} from '../src';

import { OWNER_STAKE_SCRIPT_HASH } from './fixtures';

const stakeScriptHash = Hash28ByteBase16(OWNER_STAKE_SCRIPT_HASH);

describe('custodyGrantTokenName', () => {
  // Names follow lib/cardano_account_custody_contract/account.ak
  // `grant_token_name`: the stake script hash, then four big-endian bytes.
  it('appends the slot to the stake script hash as four big-endian bytes', () => {
    expect(custodyGrantTokenName(stakeScriptHash, 0n)).toBe(
      `${OWNER_STAKE_SCRIPT_HASH}00000000`,
    );
    expect(custodyGrantTokenName(stakeScriptHash, 256n)).toBe(
      `${OWNER_STAKE_SCRIPT_HASH}00000100`,
    );
    expect(custodyGrantTokenName(stakeScriptHash, 2n ** 32n - 1n)).toBe(
      `${OWNER_STAKE_SCRIPT_HASH}ffffffff`,
    );
  });

  it('throws for a slot four bytes cannot carry', () => {
    for (const slot of [-1n, 2n ** 32n]) {
      expect(() => custodyGrantTokenName(stakeScriptHash, slot)).toThrow(
        RangeError,
      );
    }
  });
});

describe('custodyGrantAssetId', () => {
  it('puts the grant token under the account proxy policy', () => {
    const assetId = custodyGrantAssetId(
      { accountValidatorHash: ACCOUNT_VALIDATOR_HASH, stakeScriptHash },
      0n,
    );
    expect(assetId).toBe(
      `ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253${OWNER_STAKE_SCRIPT_HASH}00000000`,
    );
    expect(Cardano.AssetId.getPolicyId(assetId)).toBe(ACCOUNT_VALIDATOR_HASH);
  });
});

describe('parseCustodyAccountTokenName', () => {
  it('reads a 28-byte name as the state NFT of that stake script hash', () => {
    expect(parseCustodyAccountTokenName(OWNER_STAKE_SCRIPT_HASH)).toEqual({
      kind: 'state-nft',
      stakeScriptHash: OWNER_STAKE_SCRIPT_HASH,
    });
  });

  it('reads a 32-byte name as a grant token of its prefix and slot', () => {
    for (const slot of [0n, 1n, 256n, 2n ** 32n - 1n]) {
      expect(
        parseCustodyAccountTokenName(
          custodyGrantTokenName(stakeScriptHash, slot),
        ),
      ).toEqual({
        kind: 'grant',
        stakeScriptHash: OWNER_STAKE_SCRIPT_HASH,
        slot,
      });
    }
  });

  it.each([
    ['an empty name', ''],
    ['a 27-byte name', 'aa'.repeat(27)],
    ['a 29-byte name', 'aa'.repeat(29)],
    ['a 31-byte name', 'aa'.repeat(31)],
    ['a 33-byte name', 'aa'.repeat(33)],
    ['upper-case hex', OWNER_STAKE_SCRIPT_HASH.toUpperCase()],
    ['text that is not hex', 'zz'.repeat(28)],
  ])('reads %s as no account token', (_, name) => {
    expect(parseCustodyAccountTokenName(name)).toBeUndefined();
  });
});
