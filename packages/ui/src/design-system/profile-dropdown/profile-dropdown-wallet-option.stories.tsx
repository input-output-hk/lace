import React from 'react';

import type { Meta } from '@storybook/react';

import { page, Variants, Section, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { WalletOption } from './profile-dropdown-wallet-option.component';
const subtitle = `Component for the profile dropdown to represent the wallet type.`;

export default {
  title: 'Navigation and toolbars/Profile Dropdown/Wallet Option',
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

const WalletOptionUIStates = (): JSX.Element => (
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
                  title="Shared Wallet"
                  subtitle="Lace Team"
                  type="shared"
                />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <UIStateTable>
          <WalletOptionUIStates />
        </UIStateTable>
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
