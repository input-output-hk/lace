import { Box, Cell, Flex, Grid, LocalThemeProvider, Section, ThemeColorScheme, Variants } from '@lace/ui';
import { action } from '@storybook/addon-actions';
import { useArgs } from '@storybook/preview-api';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { StakePoolSortOptions } from 'features/BrowsePools';
import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { PoolsFilter, QueryStakePoolsFilters } from '../../store';
import { BrowsePoolsPreferencesCard } from './BrowsePoolsPreferencesCard';
import { SortAndFilterTab } from './types';

const meta: Meta<typeof BrowsePoolsPreferencesCard> = {
  component: BrowsePoolsPreferencesCard,
  title: 'Cards/Stake Pool Sorting & Filter',
};
export default meta;
const Wrapper = ({ defaultTab }: { defaultTab: SortAndFilterTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sort, setSort] = useState<StakePoolSortOptions>({
    field: 'ticker',
    order: 'asc',
  });
  const [filter, setFilter] = useState<QueryStakePoolsFilters>({
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
    (options) => {
      action('FilterChange')(options);
      setFilter(options);
    },
    [setFilter]
  );

  return (
    <Box w="$342">
      <BrowsePoolsPreferencesCard
        activeTab={activeTab}
        sort={sort}
        filter={filter}
        onTabChange={setActiveTab}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />
    </Box>
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

export const Interactions: StoryObj<typeof BrowsePoolsPreferencesCard> = {
  args: {
    activeTab: SortAndFilterTab.sort,
    filter: {
      [PoolsFilter.Saturation]: ['', ''],
      [PoolsFilter.ProfitMargin]: ['', ''],
      [PoolsFilter.Performance]: ['', ''],
      [PoolsFilter.Ros]: ['lastepoch'],
    },
    sort: {
      field: 'pledge',
      order: 'desc',
    },
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('radio-btn-test-id-ticker')));
    const tickerBtn = canvas.getByTestId('radio-btn-test-id-ticker');

    await userEvent.click(tickerBtn);
    const saturationBtn = canvas.getByTestId('radio-btn-test-id-saturation');
    await step('Change sort field', async () => {
      await userEvent.click(saturationBtn);
    });

    const iconDesc = canvas.getByTestId('sort-desc');
    await waitFor(() => expect(saturationBtn).toBeChecked());
    await waitFor(() => expect(iconDesc).toBeInTheDocument());
    await step('Click on iconDesc', async () => {
      await userEvent.click(iconDesc);
    });

    await waitFor(() => expect(iconDesc).not.toBeInTheDocument());
    const iconAsc = canvas.getByTestId('sort-asc');
    await waitFor(() => expect(iconAsc).toBeInTheDocument());
  },
  render: function Render(args) {
    const [{ sort }, setArgs] = useArgs();

    return (
      <BrowsePoolsPreferencesCard
        {...args}
        sort={sort}
        onSortChange={(newSort) => {
          setArgs({
            ...args,
            sort: newSort,
          });
        }}
      />
    );
  },
};
