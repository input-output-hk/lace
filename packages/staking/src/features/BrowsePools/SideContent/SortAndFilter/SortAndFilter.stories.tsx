import { Box, Cell, Flex, Grid, LocalThemeProvider, ThemeColorScheme, Variants } from '@lace/ui';

import { Section } from '@lace/ui/src/design-system/decorators';
import { SortDirection, SortField } from 'features/BrowsePools/StakePoolsTable/types';
import { useState } from 'react';
import type { Meta } from '@storybook/react';

import { SortAndFilter } from './SortAndFilter';
import { FilterValues, PoolsFilter, VisibleSection } from './types';

export default {
  title: 'Cards/Stake Pool Sorting & Filter',
} as Meta;

const Wrapper = ({ visibleSection: inVisibleSection }: { visibleSection: VisibleSection }) => {
  const [visibleSection, setVisibleSection] = useState(inVisibleSection);
  const [sortedBy, setSortedBy] = useState(SortField.saturation);
  const [filters, setFilters] = useState<FilterValues>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: [''],
  });
  const [direction, setDirection] = useState(SortDirection.asc);

  return (
    <SortAndFilter
      onSortChange={setSortedBy}
      onFiltersChange={setFilters}
      onDirectionChange={setDirection}
      onVisibleSectionChange={setVisibleSection}
      sortedBy={sortedBy}
      direction={direction}
      filters={filters}
      visibleSection={visibleSection}
    />
  );
};

const CardsGroup = () => (
  <Flex
    style={{
      flexWrap: 'wrap',
      rowGap: 10,
    }}
    gap="$20"
  >
    <Box w="$342">
      <Wrapper visibleSection="sorting" />{' '}
    </Box>
    <Box w="$342">
      <Wrapper visibleSection="filtering" />{' '}
    </Box>
  </Flex>
);

export const Overview = (): JSX.Element => (
  <>
    <Grid columns="$2">
      <Cell w="$fill" style={{ display: 'inline-flex', justifyContent: 'center' }}>
        {/* <SortAndFilter toggleSection="sorting" /> */}
      </Cell>
      <Cell style={{ display: 'inline-flex', justifyContent: 'center' }}>
        {/* <SortAndFilter toggleSection="filtering" /> */}
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
