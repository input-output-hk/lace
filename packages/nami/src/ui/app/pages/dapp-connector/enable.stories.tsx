import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

import { getFavoriteIcon } from '../../../../api/extension/api.mock';

import { Enable } from './enable';

const EnableStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);
  const origin = 'https://app.sundae.fi';

  return (
    <Box width="400" height="572">
      <Enable
        request={{ origin }}
        controller={{ returnData: () => {} }}
        accountName={'Account 1'}
        accountAvatar="0.51801253"
        dappConnector={{
          getDappInfo: async () =>
            await {
              logo: getFavoriteIcon(origin),
              name: 'name',
              url: origin,
              domain: origin.split('//')[1],
            },
        }}
      />
    </Box>
  );
};

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '572px',
    },
  },
};

const meta: Meta<typeof EnableStory> = {
  title: 'Dapp Connector/Enable',
  component: EnableStory,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup',
    },
    layout: 'centered',
  },
  beforeEach: () => {
    getFavoriteIcon.mockImplementation(() => {
      return 'https://app.sundae.fi/static/images/favicon.png';
    });
    window.chrome = {
      runtime: {
        id: 'mock',
      },
    };
    return () => {
      getFavoriteIcon.mockReset();
    };
  },
};
type Story = StoryObj<typeof EnableStory>;

export default meta;

export const Light: Story = {
  parameters: {
    colorMode: 'light',
  },
};
export const Dark: Story = {
  parameters: {
    colorMode: 'dark',
  },
};
