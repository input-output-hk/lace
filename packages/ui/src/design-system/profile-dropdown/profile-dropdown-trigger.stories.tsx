import React from 'react';

import type { Meta } from '@storybook/react';

import { page, Variants, Section, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Trigger } from './profile-dropdown-trigger.component';
const subtitle = `Reusable button component for use in a variety of controls containing only an icon for its content.`;

export default {
  title: 'Navigation and toolbars/Profile Dropdown/Trigger',
  component: Trigger,
  decorators: [page({ title: 'Trigger', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

const TriggerSample = ({
  disabled,
  id,
  active,
}: Readonly<{
  disabled?: boolean;
  id?: string;
  active?: boolean;
}>): JSX.Element => (
  <Trigger
    title="Alice's wallet"
    subtitle="Account #0"
    disabled={disabled}
    id={id}
    active={active}
    type="hot"
  />
);

const Buttons = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <TriggerSample />
    </Variants.Cell>
    <Variants.Cell>
      <TriggerSample id="hover" />
    </Variants.Cell>
    <Variants.Cell>
      <TriggerSample id="pressed" active />
    </Variants.Cell>
    <Variants.Cell>
      <TriggerSample disabled />
    </Variants.Cell>
    <Variants.Cell>
      <TriggerSample id="focused" />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Examples">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <TriggerSample />
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <UIStateTable>
          <Buttons />
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
