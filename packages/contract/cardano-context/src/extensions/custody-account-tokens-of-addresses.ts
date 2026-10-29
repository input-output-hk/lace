import { Cardano } from '@cardano-sdk/core';

import { isCardanoCustodyAccountTokenOf } from '../custody/account-token';

import type { CardanoPaymentAddress } from '../types';
import type { TokenId } from '@lace-contract/tokens';

/**
 * A test for the account tokens of the custody accounts among
 * `accountAddresses`: the state NFT and the grant tokens only mark a custody
 * account's control and grant UTxOs, so they are never a holding the
 * activity reports. Key addresses match nothing.
 */
export const isOwnCustodyAccountToken = (
  accountAddresses: readonly CardanoPaymentAddress[],
): ((tokenId: TokenId) => boolean) => {
  const tests = accountAddresses.flatMap(address => {
    const parsed = Cardano.Address.fromString(address);
    const stakeCredential = parsed?.asBase()?.getStakeCredential();
    if (
      !parsed ||
      stakeCredential?.type !== Cardano.CredentialType.ScriptHash
    ) {
      return [];
    }
    return [
      isCardanoCustodyAccountTokenOf(
        Cardano.RewardAccount.fromCredential(
          stakeCredential,
          parsed.getNetworkId(),
        ),
      ),
    ];
  });
  return tokenId =>
    tests.some(isAccountToken =>
      isAccountToken(tokenId as unknown as Cardano.AssetId),
    );
};
