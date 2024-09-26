import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  getCurrentAccount,
  getFavoriteIcon,
} from '../../../../api/extension/api.mock';

import Enable from './enable';
import { currentAccount } from '../../../../mocks/account.mock';

const EnableStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="572">
      <Enable
        request={{ origin: 'https://app.sundae.fi' }}
        controller={{ returnData: () => {} }}
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
    getCurrentAccount.mockImplementation(async () => {
      return await Promise.resolve(currentAccount);
    });
    getFavoriteIcon.mockImplementation(() => {
      return 'https://app.sundae.fi/static/images/favicon.png';
    });
    window.chrome = {
      runtime: {
        id: 'mock',
      },
    };
    return () => {
      getCurrentAccount.mockReset();
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
