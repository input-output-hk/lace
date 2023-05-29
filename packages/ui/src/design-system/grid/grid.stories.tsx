import type { ReactNode } from 'react';
import React from 'react';

import type { Meta } from '@storybook/react';

import { Box } from '../box';
import { page, Section } from '../decorators';

import { Cell } from './cell.component';
import { Grid } from './grid.component';

const subtitle =
  'Browser version of Lace relies on a primary 8-column grid layout and a secondary 4-column grid layout to ensure consistent and elegant relationships between design components.';

export default {
  title: 'Grid',
  component: Grid,
  subcomponents: {
    Cell,
  },
  decorators: [page({ title: 'Layout grid', subtitle })],
} as Meta;

const Col = (): JSX.Element => (
  <div
    style={{
      background: 'rgba(255, 84, 112, 0.1)',
      height: '256px',
      width: '100%',
    }}
  />
);

const Nest = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <div
    style={{
      background: 'rgba(255, 84, 112, 0.1)',
    }}
  >
    {children}
  </div>
);

export const Overview = (): JSX.Element => (
  <Box>
    <Section title="8-column">
      <Grid columns="$8" rows="$fitContent">
        {Array.from({ length: 8 }).map((_, index) => (
          <Cell key={`cell-${index}`}>
            <Col />
          </Cell>
        ))}
      </Grid>
    </Section>
    <Box mt="$32">
      <Section title="Nesting">
        <Grid columns="$2">
          <Cell>
            <Nest>
              <Grid columns="$3">
                <Cell>
                  <Col />
                </Cell>
                <Cell>
                  <Col />
                </Cell>
                <Cell>
                  <Col />
                </Cell>
              </Grid>
            </Nest>
          </Cell>
          <Cell>
            <Col />
          </Cell>
        </Grid>
      </Section>
    </Box>
  </Box>
);
