import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import {
  ACCOUNT_VALIDATOR_HASH,
  custodyGrantAssetId,
} from '@lace-lib/cardano-custody';
import { describe, expect, it } from 'vitest';

import { isCardanoCustodyAccountTokenOf } from '../../src/custody/account-token';
import {
  cardanoCustodyAccount,
  custodyRewardAccount,
  custodyStakeScriptHash,
  custodyStateNftId,
} from '../custody-mocks';

const KEY_REWARD_ACCOUNT = Cardano.RewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);
const OTHER_STAKE_SCRIPT_HASH = Hash28ByteBase16('cd'.repeat(28));

const isAccountToken = isCardanoCustodyAccountTokenOf(custodyRewardAccount);

describe('isCardanoCustodyAccountTokenOf', () => {
  it('matches the state NFT of the custody account owning the reward account', () => {
    expect(isAccountToken(custodyStateNftId)).toBe(true);
  });

  it.each([0n, 256n, 4_294_967_295n])(
    'matches the grant token of slot %s of that account',
    slot => {
      expect(
        isAccountToken(
          custodyGrantAssetId(cardanoCustodyAccount.blockchainSpecific, slot),
        ),
      ).toBe(true);
    },
  );

  it('does not match the state NFT or a grant token of another custody account', () => {
    const otherAccount = {
      accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
      stakeScriptHash: OTHER_STAKE_SCRIPT_HASH,
    };

    expect(
      isAccountToken(
        Cardano.AssetId.fromParts(
          Cardano.PolicyId(ACCOUNT_VALIDATOR_HASH),
          Cardano.AssetName(OTHER_STAKE_SCRIPT_HASH),
        ),
      ),
    ).toBe(false);
    expect(isAccountToken(custodyGrantAssetId(otherAccount, 0n))).toBe(false);
  });

  it('does not match a token under the account policy of another name length', () => {
    expect(
      isAccountToken(
        Cardano.AssetId.fromParts(
          Cardano.PolicyId(ACCOUNT_VALIDATOR_HASH),
          Cardano.AssetName(`${custodyStakeScriptHash}00`),
        ),
      ),
    ).toBe(false);
  });

  it('does not match a token named like an account token under an unregistered policy', () => {
    const unregistered = Cardano.PolicyId(Hash28ByteBase16('99'.repeat(28)));

    expect(
      isAccountToken(
        Cardano.AssetId.fromParts(
          unregistered,
          Cardano.AssetName(custodyStakeScriptHash),
        ),
      ),
    ).toBe(false);
    expect(
      isAccountToken(
        Cardano.AssetId.fromParts(
          unregistered,
          Cardano.AssetName(`${custodyStakeScriptHash}00000000`),
        ),
      ),
    ).toBe(false);
  });

  it('matches nothing for a key reward account', () => {
    expect(
      isCardanoCustodyAccountTokenOf(KEY_REWARD_ACCOUNT)(custodyStateNftId),
    ).toBe(false);
  });
});
