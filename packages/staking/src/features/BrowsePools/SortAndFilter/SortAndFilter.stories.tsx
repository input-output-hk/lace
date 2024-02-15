import { Box, Cell, Flex, Grid, LocalThemeProvider, Section, ThemeColorScheme, Variants } from '@lace/ui';
import { action } from '@storybook/addon-actions';
import { SortDirection, SortField, StakePoolSortOptions } from 'features/BrowsePools';
import { useCallback, useState } from 'react';
import type { Meta } from '@storybook/react';

import { SortAndFilter } from './SortAndFilter';
import { FilterValues, PoolsFilter, SortAndFilterTab } from './types';

export default {
  title: 'Cards/Stake Pool Sorting & Filter',
} as Meta;

const Wrapper = ({ defaultTab }: { defaultTab: SortAndFilterTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sort, setSort] = useState<StakePoolSortOptions>({
    field: SortField.saturation,
    order: SortDirection.asc,
  });
  const [filter, setFilter] = useState<FilterValues>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: ['lastepoch'],
  });

  const handleSortChange = useCallback(
    (options: StakePoolSortOptions) => {
      action('SortChange')(options);
      setSort(options);
    },
    [setSort]
  );

  const handleFilterChange = useCallback(
    (options: FilterValues) => {
      action('FilterChange')(options);
      setFilter(options);
    },
    [setFilter]
  );

  return (
    <SortAndFilter
      activeTab={activeTab}
      sort={sort}
      filter={filter}
      onTabChange={setActiveTab}
      onSortChange={handleSortChange}
      onFilterChange={handleFilterChange}
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
      <Wrapper defaultTab={SortAndFilterTab.sort} />
    </Box>
    <Box w="$342">
      <Wrapper defaultTab={SortAndFilterTab.filter} />
    </Box>
  </Flex>
);

export const Overview = (): JSX.Element => (
  <>
    <Grid columns="$2">
      <Cell w="$fill" style={{ display: 'inline-flex', justifyContent: 'center' }}>
        <Wrapper defaultTab={SortAndFilterTab.sort} />
      </Cell>
      <Cell style={{ display: 'inline-flex', justifyContent: 'center' }}>
        <Wrapper defaultTab={SortAndFilterTab.filter} />
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
