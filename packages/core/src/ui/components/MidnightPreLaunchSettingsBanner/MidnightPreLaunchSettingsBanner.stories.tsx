import React from 'react';
import type { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Box } from '@input-output-hk/lace-ui-toolkit';

import { MidnightPreLaunchSettingsBanner } from './index';
import MidnightPreLaunchBannerImage from '../../assets/images/midnight-launch-event-sidebar-banner.png';

export default {
  title: 'Midnight/MidnightPreLaunchSettingsBanner'
} as Meta<typeof MidnightPreLaunchSettingsBanner>;

export const Overview = (): JSX.Element => (
  <>
    <Box w="$312">
      <MidnightPreLaunchSettingsBanner
        bannerImageUrl={MidnightPreLaunchBannerImage}
        onCtaButtonClick={action('onCtaButtonClick')}
      />
    </Box>
    <Box w="$342">
      <MidnightPreLaunchSettingsBanner
        bannerImageUrl={MidnightPreLaunchBannerImage}
        onCtaButtonClick={action('onCtaButtonClick')}
      />
    </Box>
    <Box w="$420">
      <MidnightPreLaunchSettingsBanner
        bannerImageUrl={MidnightPreLaunchBannerImage}
        onCtaButtonClick={action('onCtaButtonClick')}
      />
    </Box>
  </>
);
