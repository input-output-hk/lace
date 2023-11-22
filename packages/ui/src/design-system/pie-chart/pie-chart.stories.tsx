import type { ReactElement } from 'react';
import React from 'react';

import type { Meta } from '@storybook/react';
import isChromatic from 'chromatic/isChromatic';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Cell, Grid } from '../grid';
import { TooltipContent } from '../tooltip';

import { PieChart } from './pie-chart.component';
import {
  PIE_CHART_DEFAULT_COLOR_SET,
  PieChartGradientColor,
} from './pie-chart.data';

import type { PieChartProps } from './pie-chart.component';

const isNotInChromatic = !isChromatic();

const mockDataSet = (amount: number): { name: string; value: number }[] =>
  Array.from({ length: amount }).map((_, index) => ({
    name: `Pool ${index + 1}`,
    value: 100 / amount,
  }));

const meta: Meta<typeof PieChart> = {
  title: 'Elements/PieChart',
  component: PieChart,
  decorators: [page({ title: 'PieChart' })],
  argTypes: {
    nameKey: {
      table: {
        disable: true,
      },
    },
    valueKey: {
      table: {
        disable: true,
      },
    },
  },
};

export default meta;

const CustomTooltip = (): ReactElement => (
  <TooltipContent label="This is an example tooltip" />
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Default color set">
        <Variants.Table headers={['One', 'Two', 'Three', 'Four', 'Five']}>
          <Variants.Row>
            {[
              { data: mockDataSet(1) },
              { data: mockDataSet(2) },
              { data: mockDataSet(3) },
              {
                data: [
                  { name: 'Pool 1', value: 35 },
                  { name: 'Pool 2', value: 35 },
                  { name: 'Pool 3', value: 15 },
                  { name: 'Pool 4', value: 15 },
                ],
              },
              {
                data: [
                  { name: 'Pool 1', value: 35 },
                  { name: 'Pool 2', value: 35 },
                  { name: 'Pool 3', value: 10 },
                  { name: 'Pool 4', value: 10 },
                  { name: 'Pool 5', value: 10 },
                ],
              },
            ].map((pieChartProps, index) => (
              <Variants.Cell key={index}>
                <PieChart animate={isNotInChromatic} {...pieChartProps} />
              </Variants.Cell>
            ))}
          </Variants.Row>
        </Variants.Table>
        <Variants.Table headers={['Six', 'Seven', 'Eight', 'Nine', 'Ten']}>
          <Variants.Row>
            {[
              {
                data: [
                  { name: 'Pool 1', value: 30 },
                  { name: 'Pool 2', value: 30 },
                  { name: 'Pool 3', value: 10 },
                  { name: 'Pool 4', value: 10 },
                  { name: 'Pool 5', value: 10 },
                  { name: 'Pool 6', value: 10 },
                ],
              },
              {
                data: [
                  { name: 'Pool 1', value: 25 },
                  { name: 'Pool 2', value: 25 },
                  { name: 'Pool 3', value: 10 },
                  { name: 'Pool 4', value: 10 },
                  { name: 'Pool 5', value: 10 },
                  { name: 'Pool 6', value: 10 },
                  { name: 'Pool 7', value: 10 },
                ],
              },
              {
                data: [
                  { name: 'Pool 1', value: 20 },
                  { name: 'Pool 2', value: 20 },
                  { name: 'Pool 3', value: 10 },
                  { name: 'Pool 4', value: 10 },
                  { name: 'Pool 5', value: 10 },
                  { name: 'Pool 6', value: 10 },
                  { name: 'Pool 7', value: 10 },
                  { name: 'Pool 8', value: 10 },
                ],
              },
              {
                data: [
                  { name: 'Pool 1', value: 15 },
                  { name: 'Pool 2', value: 15 },
                  { name: 'Pool 3', value: 10 },
                  { name: 'Pool 4', value: 10 },
                  { name: 'Pool 5', value: 10 },
                  { name: 'Pool 6', value: 10 },
                  { name: 'Pool 7', value: 10 },
                  { name: 'Pool 8', value: 10 },
                  { name: 'Pool 9', value: 10 },
                ],
              },
              { data: mockDataSet(10) },
            ].map((pieChartProps, index) => (
              <Variants.Cell key={index}>
                <PieChart animate={isNotInChromatic} {...pieChartProps} />
              </Variants.Cell>
            ))}
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Custom colors">
        <Variants.Table
          headers={[PieChartGradientColor.LaceLinearGradient, '', '', '', '']}
        >
          <Variants.Row>
            <Variants.Cell>
              <PieChart
                colors={[PieChartGradientColor.LaceLinearGradient]}
                data={mockDataSet(1)}
                animate={isNotInChromatic}
              />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Dark theme">
        <Variants.Table
          headers={[
            'All colors',
            PieChartGradientColor.LaceLinearGradient,
            '',
            '',
            '',
          ]}
        />
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table headers={['', '', '', '', '']}>
            <Variants.Row>
              <Variants.Cell>
                <PieChart
                  animate={isNotInChromatic}
                  data={[
                    { name: 'Pool 1', value: 15 },
                    { name: 'Pool 2', value: 15 },
                    { name: 'Pool 3', value: 10 },
                    { name: 'Pool 4', value: 10 },
                    { name: 'Pool 5', value: 10 },
                    { name: 'Pool 6', value: 10 },
                    { name: 'Pool 7', value: 10 },
                    { name: 'Pool 8', value: 10 },
                    { name: 'Pool 9', value: 10 },
                  ]}
                />
              </Variants.Cell>
              <Variants.Cell>
                <PieChart
                  colors={[PieChartGradientColor.LaceLinearGradient]}
                  data={mockDataSet(1)}
                  animate={isNotInChromatic}
                />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </LocalThemeProvider>
      </Section>

      <Divider my="$64" />

      <Section title="Responsive">
        <Grid columns="$8" rows="$none">
          <Cell colStart="$1" colEnd="$4">
            <PieChart
              colors={[PieChartGradientColor.LaceLinearGradient]}
              data={mockDataSet(1)}
              animate={isNotInChromatic}
            />
          </Cell>
          <Cell colStart="$4" colEnd="$6">
            <PieChart
              colors={[PieChartGradientColor.LaceLinearGradient]}
              data={mockDataSet(1)}
              animate={isNotInChromatic}
            />
          </Cell>
          <Cell>
            <PieChart
              colors={[PieChartGradientColor.LaceLinearGradient]}
              data={mockDataSet(1)}
              animate={isNotInChromatic}
            />
          </Cell>
        </Grid>
      </Section>
    </Cell>
  </Grid>
);

type ConfigurableStoryProps = Pick<
  PieChartProps<{ name: string; value: number }>,
  'colors' | 'data' | 'direction'
> & { tooltip: boolean };

export const Controls = ({
  colors,
  data,
  tooltip,
  ...props
}: Readonly<ConfigurableStoryProps>): JSX.Element => (
  <Grid columns="$5">
    <Cell>
      <PieChart
        animate={isNotInChromatic}
        colors={colors}
        data={data}
        tooltip={tooltip ? CustomTooltip : undefined}
        {...props}
      />
    </Cell>
  </Grid>
);

Controls.argTypes = {
  colors: {
    defaultValue: 0,
    control: {
      type: 'select',
      labels: {
        0: 'default color set',
        1: 'lace linear gradient',
      },
    },
    options: [0, 1],
    mapping: [
      PIE_CHART_DEFAULT_COLOR_SET,
      [PieChartGradientColor.LaceLinearGradient],
    ],
  },
  data: {
    defaultValue: 1,
    control: {
      type: 'range',
      min: 1,
      max: 10,
      step: 1,
    },
    mapping: Array.from({ length: 11 }).map((_, index) => mockDataSet(index)),
  },
  direction: {
    defaultValue: 'clockwise',
    control: 'inline-radio',
    options: ['clockwise', 'counterclockwise'],
  },
  tooltip: {
    defaultValue: true,
    control: 'boolean',
  },
};
