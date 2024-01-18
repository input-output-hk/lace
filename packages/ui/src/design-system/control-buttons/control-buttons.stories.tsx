import React from 'react';

import { ReactComponent as PlusCircle } from '@lace/icons/dist/PlusCircleComponent';
import type { Meta } from '@storybook/react';

import { page, Variants, Section, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { Danger } from './danger-button.component';
import { Filled } from './filled-button.component';
import { Icon } from './icon-button.component';
import { Outlined } from './outlined-button.component';
import { Small } from './small-button.component';

const subtitle = ``;

const SampleIcon = (): JSX.Element => <PlusCircle />;

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
    <Variants.Row>
      <Variants.Cell>
        <Icon icon={<SampleIcon />} size="extraSmall" />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="hover" icon={<SampleIcon />} size="extraSmall" />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="pressed" icon={<SampleIcon />} size="extraSmall" />
      </Variants.Cell>
      <Variants.Cell>
        <Icon disabled icon={<SampleIcon />} size="extraSmall" />
      </Variants.Cell>
      <Variants.Cell>
        <Icon id="focused" icon={<SampleIcon />} size="extraSmall" />
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
              <Danger label="Label" />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
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
    focus: '#focused',
    active: '#pressed',
  },
};
