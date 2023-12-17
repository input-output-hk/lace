import { PostHogAction } from '@lace/common';
import { Columns } from './types';

export const analyticsActionsMap: Record<Columns, PostHogAction> = {
  [Columns.ticker]: PostHogAction.StakingBrowsePoolsTickerClick,
  [Columns.apy]: PostHogAction.StakingBrowsePoolsRosClick,
  [Columns.saturation]: PostHogAction.StakingBrowsePoolsSaturationClick,
  [Columns.cost]: PostHogAction.StakingBrowsePoolsCostClick,
  [Columns.margin]: PostHogAction.StakingBrowsePoolsMarginClick,
  [Columns.blocks]: PostHogAction.StakingBrowsePoolsBlocksClick,
  [Columns.pledge]: PostHogAction.StakingBrowsePoolsPledgeClick,
};
