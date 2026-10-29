import { Cardano } from '@cardano-sdk/core';
import {
  findCustodyContractVersion,
  parseCustodyAccountTokenName,
} from '@lace-lib/cardano-custody';

const NEVER = (): boolean => false;

/**
 * A test for the account tokens of the custody account that owns
 * `rewardAccount`: assets under a supported account validator's policy
 * named after the account's stake script hash. That is the state NFT, named
 * by the hash alone, and every grant token, named by the hash and a slot.
 * Matches nothing for a key-hash reward account, so it never touches a key
 * account's assets.
 *
 * Account tokens only mark the control UTxO and the grant UTxOs, and the
 * validator keeps them at the account address. They are no holding, so
 * balances, activities and token metadata leave them out.
 */
export const isCardanoCustodyAccountTokenOf = (
  rewardAccount: Cardano.RewardAccount,
): ((assetId: Cardano.AssetId) => boolean) => {
  const stakeCredential = Cardano.Address.fromBech32(rewardAccount)
    .asReward()
    ?.getPaymentCredential();
  if (stakeCredential?.type !== Cardano.CredentialType.ScriptHash) return NEVER;
  const stakeScriptHash = stakeCredential.hash;
  return assetId =>
    parseCustodyAccountTokenName(Cardano.AssetId.getAssetName(assetId))
      ?.stakeScriptHash === stakeScriptHash &&
    findCustodyContractVersion(Cardano.AssetId.getPolicyId(assetId)).ok;
};
