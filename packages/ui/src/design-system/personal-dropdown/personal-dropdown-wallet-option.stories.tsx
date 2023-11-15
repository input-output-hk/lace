import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { WalletOption } from './personal-dropdown-wallet-option.component';
const subtitle = `Reusable button component for use in a variety of controls containing only an icon for its content.`;

export default {
  title: 'Navigation and toolbars/Personal Dropdown/Wallet Option',
  component: WalletOption,
  decorators: [page({ title: 'WalletOption', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

const Sample = ({
  disabled,
  id,
}: Readonly<{ disabled?: boolean; id?: string }>): JSX.Element => (
  <div style={{ width: '228px' }}>
    <WalletOption
      profile={{
        fallback: '0',
        imageSrc: '',
      }}
      title="Alice's wallet"
      subtitle="Account #0"
      disabled={disabled}
      id={id}
    />
  </div>
);

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Sample />
      </Variants.Cell>
      <Variants.Cell>
        <Sample id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Sample id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Sample disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Sample id="focused" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Sample />
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
