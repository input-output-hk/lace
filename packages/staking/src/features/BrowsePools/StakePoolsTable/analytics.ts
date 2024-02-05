import { PostHogAction } from '@lace/common';
import { MetricType } from './types';

export const analyticsActionsMap: Record<MetricType, PostHogAction> = {
  [MetricType.ticker]: PostHogAction.StakingBrowsePoolsTickerClick,
  [MetricType.apy]: PostHogAction.StakingBrowsePoolsRosClick,
  [MetricType.saturation]: PostHogAction.StakingBrowsePoolsSaturationClick,
  [MetricType.cost]: PostHogAction.StakingBrowsePoolsCostClick,
  [MetricType.margin]: PostHogAction.StakingBrowsePoolsMarginClick,
  [MetricType.blocks]: PostHogAction.StakingBrowsePoolsBlocksClick,
  [MetricType.pledge]: PostHogAction.StakingBrowsePoolsPledgeClick,
  [MetricType.liveStake]: PostHogAction.StakingBrowsePoolsLiveStakeClick,
};
