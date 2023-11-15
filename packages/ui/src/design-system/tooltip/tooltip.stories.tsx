import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { Box } from '../box';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { RichTooltipContent } from './rich-tooltip-content.component';
import { TooltipContent } from './tooltip-content.component';
import { StorybookContentRenderer } from './tooltip-storybook-content-renderer.component';
import { TooltipStorybookContextProvider } from './tooltip-storybook-context-provider.component';

import { Tooltip, RichTooltip } from './index';

import type { RichTooltipContentProps } from './rich-tooltip-content.component';
import type { TooltipContentProps } from './tooltip-content.component';

const subtitle =
  'The tooltip control displays a short message when the user hovers over an element.';

export default {
  title: 'Status & info/Tooltip',
  component: Tooltip,
  subcomponents: {
    RichTooltip,
  },
  decorators: [page({ title: 'Tooltip', subtitle })],
} as Meta;

const SampleTooltip = ({
  label,
}: Readonly<TooltipContentProps>): JSX.Element => (
  <StorybookContentRenderer>
    <TooltipContent label={label} />
  </StorybookContentRenderer>
);

const SampleRichTooltip = ({
  title,
  description,
}: Readonly<RichTooltipContentProps>): JSX.Element => (
  <StorybookContentRenderer>
    <RichTooltipContent title={title} description={description} />
  </StorybookContentRenderer>
);

const MainComponents = (): JSX.Element => (
  <TooltipStorybookContextProvider>
    <Variants.Row>
      <Variants.Cell>
        <StorybookContentRenderer>
          <TooltipContent label="Tooltip text in one line" />
        </StorybookContentRenderer>
      </Variants.Cell>
      <Variants.Cell>
        <SampleRichTooltip
          title="Rich Text"
          description={
            <Box w="$148">
              <Flex justifyContent="space-between">
                <Box>Label</Box>
                <Box>0.0%</Box>
              </Flex>
              <Flex justifyContent="space-between">
                <Box>Label</Box>
                <Box>0.0%</Box>
              </Flex>
            </Box>
          }
        />
      </Variants.Cell>
    </Variants.Row>
  </TooltipStorybookContextProvider>
);

const VariantsTable = (): JSX.Element => (
  <Section title="Variants">
    <Variants.Table
      headers={['Simple - one line', 'Simple - multiple lines', 'Rich']}
    >
      <Variants.Row>
        <Variants.Cell>
          <SampleTooltip label="Tooltip text in one line" />
        </Variants.Cell>
        <Variants.Cell>
          <SampleTooltip label="Tooltip text in multiple lines and flexible width and length." />
        </Variants.Cell>
        <Variants.Cell>
          <SampleRichTooltip
            title="Rich tooltip"
            description={
              <Box w="$148">
                <Flex justifyContent="space-between">
                  <Box>ROS</Box>
                  <Box>3.8%</Box>
                </Flex>
                <Flex justifyContent="space-between">
                  <Box>Saturation</Box>
                  <Box>33.8%</Box>
                </Flex>
              </Box>
            }
          />
        </Variants.Cell>
      </Variants.Row>
    </Variants.Table>
  </Section>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex flexDirection="column" alignItems="center" w="$fill" my="$32">
          <SampleTooltip label="Tooltip text" />
        </Flex>
      </Section>
      <Section title="Usage">
        <Flex
          alignItems="center"
          justifyContent="center"
          w="$fill"
          my="$32"
          gap="$214"
        >
          <Tooltip label="This is a sample tooltip text">
            <button>Hover me for simple tooltip</button>
          </Tooltip>
          <RichTooltip
            title="Rich tooltip"
            description={
              <Box w="$148">
                <Flex justifyContent="space-between">
                  <Box>ROS</Box>
                  <Box>3.8%</Box>
                </Flex>
                <Flex justifyContent="space-between">
                  <Box>Saturation</Box>
                  <Box>33.8%</Box>
                </Flex>
              </Box>
            }
          >
            <button>Hover me for rich tooltip</button>
          </RichTooltip>
        </Flex>
      </Section>
      <VariantsTable />

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Default']}>
          <MainComponents />
        </Variants.Table>
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <MainComponents />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);
