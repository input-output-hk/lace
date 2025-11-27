import { Box, Cell, Flex, Grid, Section, Text, ThemeColorScheme, Variants } from '@input-output-hk/lace-ui-toolkit';
import { SortField } from 'features/BrowsePools';
import { LocalThemeProvider } from 'features/theme';

import type { Meta } from '@storybook/react';
import { StakePoolCard, StakePoolCardProps } from './StakePoolCard';

export default {
  title: 'StakePoolsGrid/StakePoolCard',
} as Meta;

const metricTypeOptions: SortField[] = [
  'ticker',
  'saturation',
  'ros',
  'cost',
  'margin',
  'blocks',
  'pledge',
  'liveStake',
];

const CardsGroup = (props: StakePoolCardProps) => (
  <Flex
    style={{
      flexWrap: 'wrap',
      rowGap: 10,
    }}
    gap="$20"
    w="$584"
  >
    <Box w="$214">
      <StakePoolCard {...props} />
    </Box>
    <Box w="$214">
      <StakePoolCard {...props} />
    </Box>
    <Box w="$214">
      <StakePoolCard {...props} />
    </Box>
    <Box w="$214">
      <StakePoolCard {...props} />
    </Box>
  </Flex>
);

const overviewCardProps: StakePoolCardProps = {
  metricType: 'blocks',
  metricValue: '123_456',
  saturation: '51.75',
  selected: false,
  title: 'TIKRNM',
};

export const Overview = () => (
  <>
    <Grid columns="$2">
      <Cell>
        <Grid columns="$1">
          <Cell>
            <Variants.Table headers={['Default']}>
              <Flex alignItems="center" justifyContent="center" h="$214">
                <Box w="$214">
                  <StakePoolCard {...overviewCardProps} />
                </Box>
              </Flex>
            </Variants.Table>
            <Variants.Table headers={['Selected']}>
              <Flex alignItems="center" justifyContent="center" h="$214">
                <Box w="$214">
                  <StakePoolCard {...overviewCardProps} selected />
                </Box>
              </Flex>
            </Variants.Table>
          </Cell>
        </Grid>
      </Cell>
      <Cell>
        <Variants.Table headers={['Hover']}>
          <Flex alignItems="center" style={{ height: 550 }} justifyContent="center">
            <Box w="$214">Placeholder</Box>
          </Flex>
        </Variants.Table>
      </Cell>
    </Grid>

    <Section title="Parameter(s) variants">
      <Grid columns="$2">
        <Cell>
          <Variants.Table headers={['Default']}>
            <Variants.Row>
              <Variants.Cell>
                <CardsGroup {...overviewCardProps} />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Cell>
        <Cell>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table headers={['Dark Mode']}>
              <Variants.Row>
                <Variants.Cell>
                  <CardsGroup {...overviewCardProps} />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </LocalThemeProvider>
        </Cell>
      </Grid>
    </Section>

    <Section title="Parameter(s) types">
      <Variants.Table
        headers={['Ticker', 'Saturation', 'ROS', 'Cost', 'Margin', 'Produced blocks', 'Pledge', 'Live stake']}
      >
        <Variants.Row>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="ticker" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="saturation" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="ros" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="cost" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="margin" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="blocks" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="pledge" />
          </Variants.Cell>
          <Variants.Cell style={{ padding: 10 }}>
            <StakePoolCard {...overviewCardProps} metricType="liveStake" />
          </Variants.Cell>
        </Variants.Row>
      </Variants.Table>
    </Section>

    <Section title="Hover">
      <Grid columns="$2">
        <Cell>
          <Variants.Table headers={['Hover']}>
            <Variants.Row>
              <Variants.Cell>
                <Box w="$214" h="$420">
                  Hover Placeholder
                </Box>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Cell>
        <Cell>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table headers={['Dark Mode']}>
              <Variants.Row>
                <Variants.Cell>
                  <Box w="$214" h="$420">
                    Hover Placeholder
                  </Box>
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </LocalThemeProvider>
        </Cell>
      </Grid>
    </Section>

    <Section title="Failsafe(s)">
      <Variants.Table headers={['Pool information (example)', 'Scenarios']}>
        <Variants.Row>
          <Variants.Cell align="left" valign="top">
            <Flex flexDirection="column" gap="$28">
              <Flex flexDirection="column">
                <Text.Body.Small weight="$medium">Full name</Text.Body.Small>
                <Text.Body.Large weight="$bold">Medusa Development Support</Text.Body.Large>
              </Flex>
              <Flex flexDirection="column">
                <Text.Body.Small weight="$medium">Ticker</Text.Body.Small>
                <Text.Body.Large weight="$bold">MDS</Text.Body.Large>
              </Flex>
              <Flex flexDirection="column">
                <Text.Body.Small weight="$medium">Description</Text.Body.Small>
                <Text.Body.Large weight="$bold">
                  This pool allows us to sustain and improve our free services and provide you with the best user
                  experience. Our pool has high uptime, good ROI and equipped with low-latency auto-recovering system.
                </Text.Body.Large>
              </Flex>
            </Flex>
          </Variants.Cell>
          <Variants.Cell align="left" valign="top">
            <Grid columns="$2">
              <Cell>
                <Flex flexDirection="column">
                  <Text.Body.Large weight="$bold">Default</Text.Body.Large>
                  <Text.Body.Small weight="$medium">
                    Display the ticker name only, along with the param (based on the sorting field)
                  </Text.Body.Small>
                </Flex>
              </Cell>
              <Cell>
                <Box w="$214">
                  <StakePoolCard title="MDS" metricType="cost" metricValue="30_000_000" saturation="51.75" />
                </Box>
              </Cell>
              <Cell>
                <Flex flexDirection="column">
                  <Text.Body.Large weight="$bold">No ticker but with “full name”</Text.Body.Large>
                  <Text.Body.Small weight="$medium">
                    Use the “full name” to replace the ticker at the small card view (w/ ellipsis)
                  </Text.Body.Small>
                </Flex>
              </Cell>
              <Cell>
                <Box w="$214">
                  <StakePoolCard
                    title="Medusa Development Support"
                    metricType="cost"
                    metricValue="30_000_000"
                    saturation="51.75"
                  />
                </Box>
              </Cell>
              <Cell>
                <Flex flexDirection="column">
                  <Text.Body.Large weight="$bold">No ticker & no “full name”</Text.Body.Large>
                  <Text.Body.Small weight="$medium">Use the “-” symbol</Text.Body.Small>
                </Flex>
              </Cell>
              <Cell>
                <Box w="$214">
                  <StakePoolCard metricType="cost" metricValue="30_000_000" saturation="51.75" />
                </Box>
              </Cell>
              <Cell>
                <Flex flexDirection="column">
                  <Text.Body.Large weight="$bold">No ticker, “full name” and “param”</Text.Body.Large>
                  <Text.Body.Small weight="$medium">Use the “-” symbol on both, ticker and param</Text.Body.Small>
                </Flex>
              </Cell>
              <Cell>
                <Box w="$214">
                  <StakePoolCard metricType="cost" saturation="51.75" />
                </Box>
              </Cell>
            </Grid>
          </Variants.Cell>
        </Variants.Row>
      </Variants.Table>
    </Section>
  </>
);

export const Controls = {
  argTypes: {
    metricType: {
      control: { type: 'select' },
      options: metricTypeOptions,
    },
  },
  args: {
    metricType: 'blocks',
    metricValue: '123_456',
    saturation: '51.75',
    selected: false,
    title: 'TIKRNM',
  } as StakePoolCardProps,
  render: (props: StakePoolCardProps) => (
    <Box w="$214">
      <StakePoolCard {...props} />
    </Box>
  ),
};
