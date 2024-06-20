import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

import { getCurrentAccount } from '../../../api/extension/api.mock';
import { currentAccount } from '../../../mocks/account.mock';

import Settings from './settings';
import { useStoreState, useStoreActions } from '../../store.mock';
import { store } from '../../../mocks/store.mock';
import { Route } from '../../../../.storybook/mocks/react-router-dom.mock';

const SettingsStory = ({
  colorMode,
}: Readonly<{ colorMode: 'dark' | 'light' }>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);

  return (
    <Box width="400" height="600">
      <Settings />
    </Box>
  );
};

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '400px',
      height: '600px',
    },
  },
};

const meta: Meta<typeof SettingsStory> = {
  title: 'Settings',
  component: SettingsStory,
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
    useStoreState.mockImplementation((callback: any) => {
      return callback(store);
    });
    useStoreActions.mockImplementation(() => {
      return () => void 0;
    });
    Route.mockImplementation(({ path, component: Component }) => {
      console.log(path);
      return <>{path === 'general' ? <Component /> : null}</>;
    });

    return () => {
      getCurrentAccount.mockReset();
      useStoreState.mockReset();
      useStoreActions.mockReset();
      Route.mockReset();
    };
  },
};
type Story = StoryObj<typeof SettingsStory>;
export default meta;

export const SettingsLight: Story = {
  parameters: {
    colorMode: 'light',
  },
};

export const SettingsDark: Story = {
  parameters: {
    colorMode: 'dark',
  },
};

export const ChangePasswordLight: Story = {
  parameters: {
    colorMode: 'light',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Toggle', async () => {
      await userEvent.click(canvas.getByText('Change Password'));
    });
  },
};

export const ChangePasswordDark: Story = {
  ...ChangePasswordLight,
  parameters: {
    colorMode: 'dark',
  },
};
export const ResetWalletLight: Story = {
  parameters: {
    colorMode: 'light',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Toggle', async () => {
      await userEvent.click(canvas.getByText('Reset Wallet'));
    });
  },
};

export const ResetWalletDark: Story = {
  ...ResetWalletLight,
  parameters: {
    colorMode: 'dark',
  },
};
