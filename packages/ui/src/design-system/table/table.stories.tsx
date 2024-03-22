import React, { useState } from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { TooltipStorybookContextProvider } from '../tooltip/tooltip-storybook-context-provider.component';

import { Table } from './index';

import './table.stories.css';

export default {
  title: 'List & tables/Table',
  subcomponents: {
    Body: Table.Body,
    Header: Table.Header,
    Row: Table.Row,
  },
  decorators: [page({ title: 'Responsive table' })],
} as Meta;

const Layout = ({
  maxWidth = 710,
  children,
}: Readonly<{ children: React.ReactNode; maxWidth?: number }>): JSX.Element => (
  <TooltipStorybookContextProvider>
    <Flex h="$fill" w="$fill" alignItems="center" justifyContent="center">
      <Box w="$fill" style={{ maxWidth: `${maxWidth}px` }}>
        {children}
      </Box>
    </Flex>
  </TooltipStorybookContextProvider>
);

enum Columns {
  ticker = 'ticker',
  saturation = 'saturation',
  ros = 'ros',
  cost = 'cost',
  margin = 'margin',
  blocks = 'blocks',
  pledge = 'pledge',
  liveStake = 'liveStake',
}

enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

interface TableSortOptions {
  field: Columns;
  order: SortDirection;
}

const columnsTitles = {
  [Columns.ticker]: 'Ticker',
  [Columns.saturation]: 'Saturation',
  [Columns.ros]: 'ROS',
  [Columns.cost]: 'Cost',
  [Columns.margin]: 'Margin',
  [Columns.blocks]: 'Blocks',
  [Columns.pledge]: 'Pledge',
  [Columns.liveStake]: 'Live Stake',
};

const columns = Object.keys(Columns).filter(v =>
  Number.isNaN(Number(v)),
) as Columns[];

const isSortingAvailable = (value: string): boolean => {
  console.log(value);
  return true;
};

const MainComponents = ({
  maxWidth,
  selectedIndexes = [],
}: Readonly<{
  maxWidth?: number;
  selectedIndexes?: number[];
}>): JSX.Element => {
  const [sort, setSort] = useState<TableSortOptions>({
    field: Columns.ticker,
    order: SortDirection.desc,
  });
  const [selected, setSelected] = useState(new Set(selectedIndexes));
  const isActiveSortItem = (value: string): boolean => value === sort.field;

  const headers = columns.map(column => ({
    label: columnsTitles[column],
    tooltipText: columnsTitles[column],
    value: column,
  }));

  const onSortChange = (field: Columns): void => {
    if (!Object.keys(Columns).includes(field)) return;
    const order =
      field === sort.field && sort.order === SortDirection.asc
        ? SortDirection.desc
        : SortDirection.asc;

    setSort({ field, order });
  };

  const onSelect = (index: number): void => {
    const newState = new Set(selected);
    if (newState.has(index)) {
      newState.delete(index);
    } else {
      newState.add(index);
    }
    setSelected(newState);
  };

  const list = [
    {
      [Columns.ticker]: 'TKRNM',
      [Columns.saturation]: '123.45%',
      [Columns.ros]: '3,45%',
      [Columns.cost]: '340',
      [Columns.margin]: '3.45%',
      [Columns.blocks]: '1,210',
      [Columns.pledge]: '105.56K',
      [Columns.liveStake]: '1.59M',
    },
    {
      [Columns.ticker]: 'TKRNM',
      [Columns.saturation]: '52.45%',
      [Columns.ros]: '121,45%',
      [Columns.cost]: '170',
      [Columns.margin]: '1.45%',
      [Columns.blocks]: '5,320',
      [Columns.pledge]: '90M',
      [Columns.liveStake]: '2.18M',
    },
  ];

  return (
    <Variants.Row>
      <Variants.Cell>
        <Layout maxWidth={maxWidth}>
          <Table.Header
            dataTestId="stake-pool"
            headers={headers}
            isActiveSortItem={isActiveSortItem}
            isSortingAvailable={isSortingAvailable}
            onSortChange={onSortChange}
            order={sort.order}
            withSelection
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100px',
            }}
          >
            <Table.Body<Record<string, string>>
              loadMoreData={(): void => {
                console.log('load more');
              }}
              items={list}
              itemContent={(index, props): JSX.Element => (
                <Table.Row<typeof props, Columns>
                  onClick={(...data): void => {
                    console.log(data);
                  }}
                  columns={columns}
                  dataTestId="stake-pool"
                  data={props}
                  onSelect={(): void => {
                    onSelect(index);
                  }}
                  selected={selected.has(index)}
                  withSelection
                />
              )}
            />
          </div>
        </Layout>
      </Variants.Cell>
    </Variants.Row>
  );
};

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <Variants.Table headers={['Default']}>
          <MainComponents />
        </Variants.Table>
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table headers={['Dark Mode']}>
            <MainComponents />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>

      <Divider my="$64" />

      <Section title="Checkbox selection disabled (limited to custom nro. of items)">
        <Variants.Table headers={['Expanded']}>
          <MainComponents maxWidth={1100} selectedIndexes={[0]} />
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Responsiveness">
        <Variants.Table headers={['Compact']}>
          <MainComponents maxWidth={614} />
        </Variants.Table>
        <Variants.Table headers={['Expanded']}>
          <MainComponents maxWidth={1100} />
        </Variants.Table>
      </Section>
    </Cell>
  </Grid>
);
