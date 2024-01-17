import React from 'react';

import { ReactComponent as RefreshIcon } from '@lace/icons/dist/RefreshComponent';
import type { Meta } from '@storybook/react';

import { Box } from '../box';
import { page, Section, Variants, ColorSchemaTable } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { ActionCard } from './action-card.component';

const subtitle = ``;

export default {
  title: 'Cards/Action Card',
  component: ActionCard,
  decorators: [page({ title: 'Action Card', subtitle })],
} as Meta;

const title = [
  {
    text: 'Sync network',
    highlight: false,
  },
  { text: 'click here', highlight: true },
];

const description = 'Description';

const RenderActionCard = ({
  id,
}: Readonly<{ id?: string; files?: string[] }>): JSX.Element => (
  <ActionCard
    title={title}
    description={description}
    id={id}
    icon={<RefreshIcon />}
  />
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <ColorSchemaTable headers={['Default', 'Title']}>
          <Variants.Row>
            <Variants.Cell>
              <Box w="$342">
                <RenderActionCard />
              </Box>
            </Variants.Cell>
            <Variants.Cell>
              <Box w="$342">
                <ActionCard title={title} icon={<RefreshIcon />} />
              </Box>
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>

      <Divider my="$64" />

      <Section title="Action card items">
        <ColorSchemaTable headers={['Rest', 'Hover']}>
          <Variants.Row>
            <Variants.Cell>
              <RenderActionCard />
            </Variants.Cell>
            <Variants.Cell>
              <RenderActionCard id="hover" />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
        <ColorSchemaTable headers={['Active / pressed', 'Focused']}>
          <Variants.Row>
            <Variants.Cell>
              <RenderActionCard id="pressed" />
            </Variants.Cell>
            <Variants.Cell>
              <RenderActionCard id="focused" />
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
