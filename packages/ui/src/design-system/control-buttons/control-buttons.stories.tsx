import React from 'react';

import type { Meta } from '@storybook/react';

import { ReactComponent as PlusCircle } from '../../assets/icons/plus-circle.component.svg';
import { sx, ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { Danger } from './danger-button.component';
import { Filled } from './filled-button.component';
import { Icon } from './icon-button.component';
import { Outlined } from './outlined-button.component';
import { Small } from './small-button.component';

const subtitle = ``;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const SampleIcon = () => <PlusCircle className={sx({ fontSize: '$18' })} />;

export default {
  title: 'Buttons/Control Buttons',
  component: Filled,
  decorators: [page({ title: 'Control Buttons', subtitle })],
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Outlined label="Label" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Outlined label="Label" id="hover" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Outlined label="Label" id="pressed" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Outlined label="Label" disabled icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Outlined label="Label" id="focused" icon={<SampleIcon />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Filled label="Label" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="hover" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="pressed" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" disabled icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Filled label="Label" id="focused" icon={<SampleIcon />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Icon icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="hover" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="pressed" icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Icon disabled icon={<SampleIcon />} />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="focused" icon={<SampleIcon />} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Small label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <Small label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Small label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Small label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Small label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Danger label="Label" />
      </Variants.Cell>
      <Variants.Cell>
        <Danger label="Label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Danger label="Label" id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Danger label="Label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Danger label="Label" id="focused" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Variants">
        <Variants.Table
          headers={[
            'Outlined (label + icon)',
            'Filled (label + icon)',
            'Icon',
            'Small',
            'Remove (red)',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <Outlined label="Label" icon={<SampleIcon />} />
            </Variants.Cell>
            <Variants.Cell>
              <Filled label="Label" icon={<SampleIcon />} />
            </Variants.Cell>
            <Variants.Cell>
              <Icon icon={<SampleIcon />} />
            </Variants.Cell>
            <Variants.Cell>
              <Small label="Label" />
            </Variants.Cell>
            <Variants.Cell>
              <Filled label="Label" />
            </Variants.Cell>
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
