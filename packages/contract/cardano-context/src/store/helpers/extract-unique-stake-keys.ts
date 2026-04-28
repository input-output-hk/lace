import { CardanoRewardAccount } from '../../types';

import type { CardanoAddressData } from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';

/**
 * Extracts unique stake keys (reward accounts) from a list of addresses.
 * Supports multi-delegation by handling addresses with different stake keys.
 *
 * @param accountAddresses - Array of addresses belonging to an account
 * @returns Array of unique CardanoRewardAccount values
 */
export const extractUniqueStakeKeys = (
  accountAddresses: AnyAddress<CardanoAddressData>[],
): CardanoRewardAccount[] => {
  const stakeKeys = new Set<CardanoRewardAccount>();
  for (const address of accountAddresses) {
    if (address?.data?.rewardAccount) {
      stakeKeys.add(CardanoRewardAccount(address.data.rewardAccount));
    }
  }
  return Array.from(stakeKeys);
};
