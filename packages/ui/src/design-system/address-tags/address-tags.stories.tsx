import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Cell, Grid } from '../grid';

import { AddressTag } from './address-tag.component';
import { AddressTagVariants } from './types';

export default {
  title: 'AddressTag',
  decorators: [
    page({
      title: 'Address Tag',
      subtitle: 'Simple component to flag addresses as own or foreign.',
    }),
  ],
} as Meta;

export const Overview = (): JSX.Element => {
  const variantsData = [
    {
      Component: AddressTag,
      variant: AddressTagVariants.Own,
    },
    {
      Component: AddressTag,
      variant: AddressTagVariants.Foreign,
    },
  ];
  const renderTable = (showHeader = false): JSX.Element => (
    <Variants.Table
      headers={showHeader ? variantsData.map(v => v.variant) : []}
    >
      <Variants.Row>
        {variantsData.map(({ Component, variant }) => (
          <Variants.Cell key={variant}>
            <Component variant={variant}>{variant}</Component>
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
