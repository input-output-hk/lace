import React from 'react';

import type { Meta } from '@storybook/react';

import { page, Section, Variants, ColorSchemaTable } from '../decorators';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { Loader } from './loader.component';

const subtitle = ``;

export default {
  title: 'Elements/Loader',
  component: Loader,
  decorators: [page({ title: 'Loader', subtitle })],
} as Meta;

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <ColorSchemaTable headers={['Default']}>
          <Variants.Row>
            <Variants.Cell>
              <Loader w="$148" h="$148" />
            </Variants.Cell>
          </Variants.Row>
        </ColorSchemaTable>
      </Section>
    </Cell>
  </Grid>
);
