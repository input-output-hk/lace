import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoRewardAccount } from '@lace-contract/cardano-context';

export const uniqueRewardAccounts = (
  addresses: GroupedAddress[],
): CardanoRewardAccount[] =>
  [...new Set(addresses.map(({ rewardAccount }) => rewardAccount))].map(
    rewardAccount => rewardAccount as unknown as CardanoRewardAccount,
  );
