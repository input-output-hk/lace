import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { page, Variants, Section, UIStateTable } from '../decorators';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Separator } from './profile-dropdown-separator.component';
import { WalletOption } from './profile-dropdown-wallet-option.component';
import { WalletOptionSample } from './profile-dropdown-wallet-option.fixtures';
import { WalletStatus } from './profile-dropdown-wallet-status.component';

import type { WalletType } from './profile-dropdown.data';

const subtitle = `The Profile Dropdown component is a navigation and toolbar component that displays the wallet information, theme and settings.`;

export default {
  title: 'Navigation and toolbars/Profile Dropdown',
  component: WalletOption,
  decorators: [page({ title: 'Profile Dropdown', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

interface Props {
  disabled?: boolean;
  id?: string;
  type?: WalletType;
}

const ProfileDropdownItems = (): JSX.Element => {
  const render = (props: Readonly<Props>): JSX.Element => {
    return (
      <Flex flexDirection="column" style={{ width: '228px' }}>
        <WalletOptionSample {...props} />
        <Separator />
        <WalletOptionSample type="cold" />
        <Separator />
        <WalletOptionSample type="shared" />
      </Flex>
    );
  };
  return (
    <Variants.Row>
      <Variants.Cell>{render({})}</Variants.Cell>
      <Variants.Cell>{render({ id: 'hover' })}</Variants.Cell>
      <Variants.Cell>{render({ id: 'pressed' })}</Variants.Cell>
      <Variants.Cell>{render({ disabled: true })}</Variants.Cell>
      <Variants.Cell>{render({ id: 'focused' })}</Variants.Cell>
    </Variants.Row>
  );
};

const WalletStatuses = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <WalletStatus status="synced" label="Wallet synced" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletStatus status="syncing" label="Wallet syncing" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletStatus status="error" label="Not synced to the blockchain" />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Profile dropdown items">
        <UIStateTable>
          <ProfileDropdownItems />
        </UIStateTable>

        <Box my="$20" />

        <Variants.Table headers={['Synced', 'Syncing', 'Not synced']}>
          <WalletStatuses />
        </Variants.Table>

        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <WalletStatuses />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focusVisible: '#focused',
    active: '#pressed',
  },
};
