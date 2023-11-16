import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { WalletOption } from './personal-dropdown-wallet-option.component';
const subtitle = `Component for the profile dropdown to represent the wallet type.`;

export default {
  title: 'Navigation and toolbars/Personal Dropdown/Wallet Option',
  component: WalletOption,
  decorators: [page({ title: 'WalletOption', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

const WalletOptionSample = ({
  disabled,
  id,
}: Readonly<{ disabled?: boolean; id?: string }>): JSX.Element => (
  <div style={{ width: '228px' }}>
    <WalletOption
      title="Alice's wallet"
      subtitle="Account #0"
      disabled={disabled}
      id={id}
      type="hot"
    />
  </div>
);

const Buttons = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <WalletOptionSample />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="hover" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="pressed" />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample disabled />
    </Variants.Cell>
    <Variants.Cell>
      <WalletOptionSample id="focused" />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Variants.Table
            headers={['Hot wallet', 'Cold wallet', 'Shared wallet']}
          >
            <Variants.Row>
              <Variants.Cell>
                <WalletOption
                  title="Alice's wallet"
                  subtitle="Account #0"
                  type="hot"
                />
              </Variants.Cell>
              <Variants.Cell>
                <WalletOption
                  title="Alice's wallet"
                  subtitle="Account #0"
                  type="cold"
                />
              </Variants.Cell>
              <Variants.Cell>
                <WalletOption
                  title="Alice's wallet"
                  subtitle="Account #0"
                  type="shared"
                />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <Buttons />
        </Variants.Table>

        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Buttons />
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
