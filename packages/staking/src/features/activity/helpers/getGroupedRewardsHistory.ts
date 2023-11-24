import { AssetActivityListProps } from '@lace/core';

export const getGroupedRewardsActivities = (walletActivities: AssetActivityListProps[]) =>
  walletActivities
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.type === 'rewards'),
    }))
    .filter((group) => group.items.length > 0);
