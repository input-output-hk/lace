import React from 'react';
import type { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Box } from '@input-output-hk/lace-ui-toolkit';

import { MidnightPreLaunchSettingsBanner } from './index';

export default {
  title: 'Midnight/MidnightPreLaunchSettingsBanner'
} as Meta<typeof MidnightPreLaunchSettingsBanner>;

export const Overview = (): JSX.Element => (
  <>
    <Box w="$312">
      <MidnightPreLaunchSettingsBanner onCtaButtonClick={action('onCtaButtonClick')} />
    </Box>
    <Box w="$342">
      <MidnightPreLaunchSettingsBanner onCtaButtonClick={action('onCtaButtonClick')} />
    </Box>
    <Box w="$420">
      <MidnightPreLaunchSettingsBanner onCtaButtonClick={action('onCtaButtonClick')} />
    </Box>
  </>
);
