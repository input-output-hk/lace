import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { Box } from '../box';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { RichContentInner } from './rich-tooltip-content-inner.component';
import { RichTooltip } from './rich-tooltip.component';
import { ContentInner } from './tooltip-content-inner.component';
import { Content } from './tooltip-content.component';
import { TooltipStorybookContextProvider } from './tooltip-storybook-context-provider.component';
import { Tooltip } from './tooltip.component';

import type { RichContentInnerProps } from './rich-tooltip-content-inner.component';
import type { ContentInnerProps } from './tooltip-content-inner.component';

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

const SampleTooltip = ({ label }: Readonly<ContentInnerProps>): JSX.Element => (
  <Content>
    <ContentInner label={label} />
  </Content>
);

const SampleRichTooltip = ({
  title,
  description,
}: Readonly<RichContentInnerProps>): JSX.Element => (
  <Content>
    <RichContentInner title={title} description={description} />
  </Content>
);

const MainComponents = (): JSX.Element => (
  <TooltipStorybookContextProvider>
    <Variants.Row>
      <Variants.Cell>
        <Content>
          <ContentInner label="Tooltip text in one line" />
        </Content>
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
            title="Rich tool tip"
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
