import React from 'react';

import { ReactComponent as ShieldIcon } from '@lace/icons/dist/ShieldGradientComponent';
import type { Meta } from '@storybook/react';

import { Box } from '../box';
import { page, Section, Variants, ColorSchemaTable } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { Item } from './educational-card-item.component';
import { Root } from './educational-card-root.component';

const subtitle = ``;

export default {
  title: 'Cards/Educational Card',
  component: Item,
  decorators: [page({ title: 'Educational Card', subtitle })],
} as Meta;

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <ColorSchemaTable headers={['Default']}>
          <Variants.Row>
            <Variants.Cell>
              <Box w="$380">
                <Root title="Main title">
                  <Item
                    label="Label"
                    title="Content title"
                    icon={<ShieldIcon />}
                  />
                  <Item
                    label="Label"
                    title="Content title"
                    icon={<ShieldIcon />}
                  />
                  <Item
                    label="Label"
                    title="Content title"
                    icon={<ShieldIcon />}
                  />
                  <Item
                    label="Label"
                    title="Content title"
                    icon={<ShieldIcon />}
                  />
                </Root>
              </Box>
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>

      <Divider my="$64" />

      <Section title="Educational card items">
        <ColorSchemaTable
          headers={['Rest', 'Hover', 'Active / pressed', 'Focused']}
        >
          <Variants.Row>
            <Variants.Cell>
              <Item label="Label" title="Content title" icon={<ShieldIcon />} />
            </Variants.Cell>
            <Variants.Cell>
              <Item
                label="Label"
                title="Content title"
                icon={<ShieldIcon />}
                id="hover"
              />
            </Variants.Cell>
            <Variants.Cell>
              <Item
                label="Label"
                title="Content title"
                icon={<ShieldIcon />}
                id="pressed"
              />
            </Variants.Cell>
            <Variants.Cell>
              <Item
                label="Label"
                title="Content title"
                icon={<ShieldIcon />}
                id="focused"
              />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
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
