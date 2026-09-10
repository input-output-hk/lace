import { createUICustomisation } from '@lace-lib/util-render';

import { EarnRewardsBanner } from '../components/EarnRewardsBanner';

import type { PortfolioAnnouncement } from '@lace-contract/app';

const earnRewardsAnnouncement = createUICustomisation<PortfolioAnnouncement>({
  key: 'earn-rewards',
  Announcement: EarnRewardsBanner,
});

const loadPortfolioAnnouncements = () => earnRewardsAnnouncement;

export default loadPortfolioAnnouncements;
