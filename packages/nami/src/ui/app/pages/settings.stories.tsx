import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

import {
  getCurrentAccount,
  getWhitelisted,
  getFavoriteIcon,
} from '../../../api/extension/api.mock';
import { currentAccount } from '../../../mocks/account.mock';

import Settings from './settings';
import { useStoreState, useStoreActions } from '../../store.mock';
import { store } from '../../../mocks/store.mock';
import {
  Route,
  mockedHistory,
  useHistory,
} from '../../../../.storybook/mocks/react-router-dom.mock';

const SettingsStory = ({
  colorMode,
  path,
}: Readonly<{
  colorMode: 'dark' | 'light';
  path: string;
}>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);
  const history = useHistory();
  history.replace(path ?? '*');

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
      return (mockedHistory[0] === '' && path === '*') ||
        mockedHistory[0] === path ? (
        <Component />
      ) : null;
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
    path: '',
  },
};

export const SettingsDark: Story = {
  parameters: {
    ...SettingsLight.parameters,
    colorMode: 'dark',
  },
};

export const GeneralSettingsLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'general',
  },
};

export const GeneralSettingsDark: Story = {
  parameters: {
    ...GeneralSettingsLight.parameters,
    colorMode: 'dark',
  },
};

export const GeneralChangePasswordLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'general',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Toggle', async () => {
      await userEvent.click(canvas.getByText('Change Password'));
    });
  },
};

export const GeneralChangePasswordDark: Story = {
  ...GeneralChangePasswordLight,
  parameters: {
    ...GeneralChangePasswordLight.parameters,
    colorMode: 'dark',
  },
};
export const GeneralResetWalletLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'general',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Toggle', async () => {
      await userEvent.click(canvas.getByText('Reset Wallet'));
    });
  },
};

export const GeneralResetWalletDark: Story = {
  ...GeneralResetWalletLight,
  parameters: {
    ...GeneralResetWalletLight.parameters,
    colorMode: 'dark',
  },
};

export const WhitelistedLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'whitelisted',
  },
  beforeEach: () => {
    getWhitelisted.mockImplementation(async () => {
      return (await Promise.resolve(['https://app.sundae.fi'])) as never[];
    });
    getFavoriteIcon.mockImplementation(() => {
      return 'https://app.sundae.fi/static/images/favicon.png';
    });
  },
};

export const WhitelistedDark: Story = {
  ...WhitelistedLight,
  parameters: {
    ...WhitelistedLight.parameters,
    colorMode: 'dark',
  },
};

export const WhitelistedEmptyLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'whitelisted',
  },
};
export const WhitelistedEmptyDark: Story = {
  parameters: {
    ...WhitelistedEmptyLight.parameters,
    colorMode: 'dark',
  },
};

export const NetworkLight: Story = {
  parameters: {
    colorMode: 'light',
    path: 'network',
  },
};

export const NetworkDark: Story = {
  parameters: {
    ...NetworkLight.parameters,
    colorMode: 'dark',
  },
};
