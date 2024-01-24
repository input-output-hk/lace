import { Cell, Flex, Grid, LocalThemeProvider, ThemeColorScheme, Variants } from '@lace/ui';

import { Section } from '@lace/ui/src/design-system/decorators';
import type { Meta } from '@storybook/react';
import { SortAndFilter, SortAndFilterProps } from './SortAndFilter';

export default {
  title: 'Cards/Stake Pool Sorting & Filter',
} as Meta;

const CardsGroup = () => (
  <Flex
    style={{
      flexWrap: 'wrap',
      rowGap: 10,
    }}
    gap="$20"
  >
    <div style={{ width: 340 }}>
      <SortAndFilter toggleSection="sorting" />
    </div>
    <div style={{ width: 340 }}>
      <SortAndFilter toggleSection="filtering" />
    </div>
  </Flex>
);

export const Overview = (): JSX.Element => (
  <>
    <Grid columns="$2">
      <Cell w={'$fill'} style={{ display: 'inline-flex', justifyContent: 'center' }}>
        <SortAndFilter toggleSection="sorting" />
      </Cell>
      <Cell style={{ display: 'inline-flex', justifyContent: 'center' }}>
        <SortAndFilter toggleSection="filtering" />
      </Cell>
    </Grid>

    <Section title="Main component">
      <Grid columns="$1">
        <Cell>
          <Variants.Table headers={['Default']}>
            <Variants.Row>
              <Variants.Cell>
                <CardsGroup />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Cell>
        <Cell>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table headers={['Dark Mode']}>
              <Variants.Row>
                <Variants.Cell>
                  <CardsGroup />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </LocalThemeProvider>
        </Cell>
      </Grid>
    </Section>
  </>
);

export const Controls = {
  args: {
    toggleSection: 'sorting',
  } as SortAndFilterProps,
  render: (props: SortAndFilterProps) => (
    <div style={{ width: 220 }}>
      <SortAndFilter {...props} />
    </div>
  ),
};
