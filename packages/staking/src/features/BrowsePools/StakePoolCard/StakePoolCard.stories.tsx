import { Box, Cell, Flex, Grid, LocalThemeProvider, Text, ThemeColorScheme, Variants } from '@lace/ui';

import { Section } from '@lace/ui/src/design-system/decorators';
import type { Meta } from '@storybook/react';
import { StakePoolCard, StakePoolCardProps } from './StakePoolCard';
import { MetricType } from './types';

export default {
  title: 'StakePoolsGrid/StakePoolCard',
} as Meta;

const metricTypeOptions: MetricType[] = ['blocks', 'cost', 'margin', 'pledge', 'saturation', 'live-stake', 'ticker'];

const CardsGroup = (props: StakePoolCardProps) => (
  <Flex
    style={{
      flexWrap: 'wrap',
      rowGap: 10,
    }}
    gap="$20"
    w="$584"
  >
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
  </Flex>
);

export const Overview = {
  argTypes: {
    metricType: {
      control: { options: metricTypeOptions, type: 'select' },
    },
  },
  args: {
    metricType: 'blocks',
    metricValue: 123_456,
    saturation: 51.75,
    selected: false,
    title: 'TIKRNM',
  } as StakePoolCardProps,
  render: (props: StakePoolCardProps) => (
    <>
      <Grid columns="$2">
        <Cell>
          <Grid columns="$1">
            <Cell>
              <Variants.Table headers={['Default']}>
                <Flex alignItems="center" justifyContent="center" h="$214">
                  <div style={{ width: 220 }}>
                    <StakePoolCard {...props} />
                  </div>
                </Flex>
              </Variants.Table>
              <Variants.Table headers={['Selected']}>
                <Flex alignItems="center" justifyContent="center" h="$214">
                  <div style={{ width: 220 }}>
                    <StakePoolCard {...props} selected />
                  </div>
                </Flex>
              </Variants.Table>
            </Cell>
          </Grid>
        </Cell>
        <Cell>
          <Variants.Table headers={['Hover']}>
            <div style={{ alignItems: 'center', display: 'flex', height: 550, justifyContent: 'center' }}>
              <div style={{ width: 220 }}>Placeholder</div>
            </div>
          </Variants.Table>
        </Cell>
      </Grid>

      <Section title="Parameter(s) variants">
        <Grid columns="$2">
          <Cell>
            <Variants.Table headers={['Default']}>
              <Variants.Row>
                <Variants.Cell>
                  <CardsGroup {...props} />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </Cell>
          <Cell>
            <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
              <Variants.Table headers={['Dark Mode']}>
                <Variants.Row>
                  <Variants.Cell>
                    <CardsGroup {...props} />
                  </Variants.Cell>
                </Variants.Row>
              </Variants.Table>
            </LocalThemeProvider>
          </Cell>
        </Grid>
      </Section>

      <Section title="Parameter(s) types">
        <Variants.Table
          headers={['Ticker', 'Satiration', 'ROS', 'Cost', 'Margin', 'Produced-blocks', 'Pledge', 'Live stake']}
        >
          <Variants.Row>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="ticker" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="saturation" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="ros" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="cost" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="margin" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="blocks" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="pledge" />
            </Variants.Cell>
            <Variants.Cell style={{ padding: 10 }}>
              <StakePoolCard {...props} metricType="live-stake" />
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
                  <div style={{ width: 220 }}>
                    <StakePoolCard title="MDS" metricType="cost" metricValue={30_000_000} saturation={51.75} />
                  </div>
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
                  <div style={{ width: 220 }}>
                    <StakePoolCard
                      title="Medusa Development Support"
                      metricType="cost"
                      metricValue={30_000_000}
                      saturation={51.75}
                    />
                  </div>
                </Cell>
                <Cell>
                  <Flex flexDirection="column">
                    <Text.Body.Large weight="$bold">No ticker & no “full name”</Text.Body.Large>
                    <Text.Body.Small weight="$medium">Use the “-” symbol</Text.Body.Small>
                  </Flex>
                </Cell>
                <Cell>
                  <div style={{ width: 220 }}>
                    <StakePoolCard metricType="cost" metricValue={30_000_000} saturation={51.75} />
                  </div>
                </Cell>
                <Cell>
                  <Flex flexDirection="column">
                    <Text.Body.Large weight="$bold">No ticker, “full name” and “param”</Text.Body.Large>
                    <Text.Body.Small weight="$medium">Use the “-” symbol on both, ticker and param</Text.Body.Small>
                  </Flex>
                </Cell>
                <Cell>
                  <div style={{ width: 220 }}>
                    <StakePoolCard metricType="cost" saturation={51.75} />
                  </div>
                </Cell>
              </Grid>
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>
    </>
  ),
};

export const Controls = {
  argTypes: {
    metricType: {
      control: { options: metricTypeOptions, type: 'select' },
    },
  },
  args: {
    metricType: 'blocks',
    metricValue: 123_456,
    saturation: 51.75,
    selected: false,
    title: 'TIKRNM',
  } as StakePoolCardProps,
  render: (props: StakePoolCardProps) => (
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
  ),
};
