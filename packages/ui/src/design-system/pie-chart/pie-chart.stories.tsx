/* eslint-disable @typescript-eslint/naming-convention, functional/immutable-data */
import React from 'react';

import type { Meta } from '@storybook/react';
import isChromatic from 'chromatic/isChromatic';

import { page, Section, Variants } from '../decorators';
import { Cell, Grid } from '../grid';

import {
  PIE_CHART_DEFAULT_COLOR_SET,
  PieChartGradientColor,
} from './constants';
import { PieChart } from './pie-chart.component';

import type { PieChartProps } from './pie-chart.component';

const notInChromatic = !isChromatic();

const mockDataSet = (amount: number): { name: string; value: number }[] =>
  Array.from({ length: amount }).map((_, index) => ({
    name: `Pool ${index + 1}`,
    value: 100 / amount,
  }));

const meta: Meta<typeof PieChart> = {
  title: 'PieChart',
  decorators: [page({ title: 'PieChart' })],
};

export default meta;

export const Overview = (): JSX.Element => (
  <>
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
              <PieChart
                animate={notInChromatic}
                colors={PIE_CHART_DEFAULT_COLOR_SET}
                {...pieChartProps}
              />
            </Variants.Cell>
          ))}
        </Variants.Row>
      </Variants.Table>
    </Section>
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
            <PieChart
              animate={notInChromatic}
              colors={PIE_CHART_DEFAULT_COLOR_SET}
              {...pieChartProps}
            />
          </Variants.Cell>
        ))}
      </Variants.Row>
    </Variants.Table>
    <Section title="Custom colors">
      <Variants.Table
        headers={[PieChartGradientColor.LaceLinearGradient, '', '', '', '']}
      >
        <Variants.Row>
          <Variants.Cell>
            <PieChart
              colors={[PieChartGradientColor.LaceLinearGradient]}
              data={mockDataSet(1)}
              animate={notInChromatic}
            />
          </Variants.Cell>
        </Variants.Row>
      </Variants.Table>
    </Section>
    <Section title="Responsive">
      <Grid columns="$8" rows="$none">
        <Cell colStart="$1" colEnd="$4">
          <PieChart
            colors={[PieChartGradientColor.LaceLinearGradient]}
            data={mockDataSet(1)}
            animate={notInChromatic}
          />
        </Cell>
        <Cell colStart="$4" colEnd="$6">
          <PieChart
            colors={[PieChartGradientColor.LaceLinearGradient]}
            data={mockDataSet(1)}
            animate={notInChromatic}
          />
        </Cell>
        <Cell>
          <PieChart
            colors={[PieChartGradientColor.LaceLinearGradient]}
            data={mockDataSet(1)}
            animate={notInChromatic}
          />
        </Cell>
      </Grid>
    </Section>
  </>
);

type ConfigurableStoryProps = Pick<
  PieChartProps<{ name: string; value: number }>,
  'colors' | 'data' | 'direction' | 'tooltip'
>;

export const Configurable = ({
  colors,
  data,
  ...props
}: Readonly<ConfigurableStoryProps>): JSX.Element => (
  <Grid columns="$5">
    <Cell>
      <PieChart
        animate={notInChromatic}
        colors={colors}
        data={data}
        {...props}
      />
    </Cell>
  </Grid>
);

Configurable.argTypes = {
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
