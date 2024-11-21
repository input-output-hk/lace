import React from 'react';

import { Box, useColorMode } from '@chakra-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

import { getFavoriteIcon } from '../../../api/extension/api.mock';
import { currentAccount } from '../../../mocks/account.mock';

import Settings from './settings';
import { useStoreState, useStoreActions } from '../../store.mock';
import { store } from '../../../mocks/store.mock';
import {
  Route,
  mockedHistory,
  useHistory,
} from '../../../../.storybook/mocks/react-router-dom.mock';
import { CurrencyCode } from '../../../adapters/currency';
import { Wallet } from '@lace/cardano';

const SettingsStory = ({
  colorMode,
  path,
  connectedDapps,
}: Readonly<{
  colorMode: 'dark' | 'light';
  path: string;
  connectedDapps: Wallet.DappInfo[];
}>): React.ReactElement => {
  const { setColorMode } = useColorMode();
  setColorMode(colorMode);
  const history = useHistory();
  history.replace(path ?? '*');

  return (
    <Box width="400" height="600">
      <Settings
        isValidURL={() => true}
        availableChains={['Mainnet', 'Preprod', 'Preview', 'Sanchonet']}
        environmentName="Preprod"
        getCustomSubmitApiForNetwork={() => ({
          status: true,
          url: 'https://cardano-preprod.blockfrost.io/api/v0',
        })}
        connectedDapps={connectedDapps}
        removeDapp={async () => false}
        accountName={currentAccount.name}
        accountAvatar={currentAccount.avatar}
        changePassword={async () => {}}
        currency={CurrencyCode.USD}
        deleteWallet={async () => {}}
        setCurrency={() => {}}
        setTheme={() => {}}
        theme="light"
        updateAccountMetadata={async () => undefined}
        isAnalyticsOptIn={false}
        isCompatibilityMode={false}
        handleAnalyticsChoice={async () => {}}
        handleCompatibilityModeChoice={async () => {}}
        switchWalletMode={async () => {}}
        switchNetwork={async () => {}}
        enableCustomNode={async () => {}}
        defaultSubmitApi=""
      />
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
    useStoreState.mockImplementation((callback: any) => {
      return callback(store);
    });
    useStoreActions.mockImplementation(() => {
      return () => void 0;
    });
    Route.mockImplementation(({ path, children }) => {
      return (mockedHistory[0] === '' && path === '*') ||
        mockedHistory[0] === path
        ? children
        : null;
    });

    return () => {
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
  ...SettingsLight,
  parameters: {
    ...SettingsLight.parameters,
    colorMode: 'dark',
  },
};

export const GeneralSettingsLight: Story = {
  parameters: {
    colorMode: 'light',
    path: '/settings/general',
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
    path: '/settings/general',
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
    path: '/settings/general',
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
    path: '/settings/whitelisted',
    connectedDapps: [
      {
        url: 'https://app.sundae.fi',
      },
    ],
  },
  beforeEach: () => {
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
    path: '/settings/whitelisted',
    connectedDapps: [],
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
    path: '/settings/network',
  },
};

export const NetworkDark: Story = {
  parameters: {
    ...NetworkLight.parameters,
    colorMode: 'dark',
  },
};

export const LegalLight: Story = {
  parameters: {
    colorMode: 'light',
    path: '/settings/legal',
  },
};

export const LegalDark: Story = {
  parameters: {
    ...LegalLight.parameters,
    colorMode: 'dark',
  },
};

export const LegalTermsOfUseLight: Story = {
  parameters: {
    colorMode: 'light',
    path: '/settings/legal',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('modal', async () => {
      await userEvent.click(canvas.getByText('Terms of Use'));
    });
  },
};

export const LegalTermsOfUseDark: Story = {
  ...LegalTermsOfUseLight,
  parameters: {
    ...LegalTermsOfUseLight.parameters,
    colorMode: 'dark',
  },
};

export const LegalPrivacyPolicyLight: Story = {
  parameters: {
    colorMode: 'light',
    path: '/settings/legal',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('modal', async () => {
      await userEvent.click(canvas.getByText('Privacy Policy'));
    });
  },
};

export const LegalPrivacyPolicyDark: Story = {
  ...LegalPrivacyPolicyLight,
  parameters: {
    ...LegalPrivacyPolicyLight.parameters,
    colorMode: 'dark',
  },
};
