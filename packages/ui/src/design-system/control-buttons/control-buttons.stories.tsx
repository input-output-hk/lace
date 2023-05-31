import React from 'react';

import type { Meta } from '@storybook/react';

import { ReactComponent as PlusCircle } from '../../assets/icons/plus-circle.component.svg';
import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { Page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { Filled } from './filled-button.component';

const subtitle = ``;

export default {
  title: 'Buttons/Control Buttons',
  component: Filled,
  decorators: [
    (Story): JSX.Element => (
      <Page title="Control Buttons" subtitle={subtitle}>
        <Story />
      </Page>
    ),
  ],
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Filled label="Label" icon={<PlusCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="hover" icon={<PlusCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="pressed" icon={<PlusCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" disabled icon={<PlusCircle />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="focused" icon={<PlusCircle />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
      <Variants.Cell />
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Variants">
        <Variants.Table
          headers={[
            'Label + icon (primary)',
            'Label + icon (secondary)',
            'Icon',
            'Small',
            'Remove (red)',
          ]}
        >
          <Variants.Row>
            <Variants.Cell />
            <Variants.Cell>
              <Filled label="Label" icon={<PlusCircle />} />
            </Variants.Cell>
            <Variants.Cell />
            <Variants.Cell />
            <Variants.Cell />
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Main components">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <Buttons />
        </Variants.Table>

        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Buttons />
          </Variants.Table>
        </ThemeProvider>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
    active: '#pressed',
  },
};
