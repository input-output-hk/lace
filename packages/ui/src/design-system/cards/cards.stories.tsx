import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';
import { Text } from '../text';

import { Scheme } from './types';

import * as Card from '.';

export default {
  title: 'Card',
  subcomponents: {
    'Card.Elevated': Card.Elevated,
    'Card.Greyed': Card.Greyed,
    'Card.Outlined': Card.Outlined,
  },
  decorators: [
    page({
      title: 'Card',
      subtitle: 'A building block for more specific card components',
    }),
  ],
} as Meta;

export const Overview = (): JSX.Element => {
  const variantsData = [
    {
      Component: Card.Elevated,
      variant: Scheme.Elevated,
    },
    {
      Component: Card.Greyed,
      variant: Scheme.Greyed,
    },
    {
      Component: Card.Outlined,
      variant: Scheme.Outlined,
    },
    {
      Component: Card.Img,
      variant: Scheme.Img,
    },
  ];

  const renderTable = (showHeader = false): JSX.Element => (
    <Variants.Table
      headers={showHeader ? variantsData.map(v => v.variant) : []}
    >
      <Variants.Row>
        {variantsData.map(({ Component, variant }) => (
          <Variants.Cell key={variant}>
            <Component>
              <Flex
                h={'$80'}
                w={'$120'}
                alignItems={'center'}
                justifyContent={'center'}
              >
                <Text.Body.Large>{variant}</Text.Body.Large>
              </Flex>
            </Component>
          </Variants.Cell>
        ))}
      </Variants.Row>
    </Variants.Table>
  );

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Main components">
          <>
            {renderTable(true)}
            <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
              <div style={{ color: 'white' }}>{renderTable()}</div>
            </LocalThemeProvider>
          </>
        </Section>
      </Cell>
    </Grid>
  );
};
