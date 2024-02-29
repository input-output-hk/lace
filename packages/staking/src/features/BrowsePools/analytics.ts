import { PostHogAction } from '@lace/common';
import { SortField } from 'features/BrowsePools/types';

export const analyticsActionsMap: Record<SortField, PostHogAction> = {
  blocks: PostHogAction.StakingBrowsePoolsBlocksClick,
  cost: PostHogAction.StakingBrowsePoolsCostClick,
  liveStake: PostHogAction.StakingBrowsePoolsLiveStakeClick,
  margin: PostHogAction.StakingBrowsePoolsMarginClick,
  pledge: PostHogAction.StakingBrowsePoolsPledgeClick,
  ros: PostHogAction.StakingBrowsePoolsRosClick,
  saturation: PostHogAction.StakingBrowsePoolsSaturationClick,
  ticker: PostHogAction.StakingBrowsePoolsTickerClick,
};
