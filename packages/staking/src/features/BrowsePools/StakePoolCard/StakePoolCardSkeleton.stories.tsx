import { Cell, Flex, Grid, Section, ThemeColorScheme, Variants } from '@input-output-hk/lace-ui-toolkit';

import { LocalThemeProvider } from 'features/theme';
import type { Meta } from '@storybook/react';
import { StakePoolCardSkeleton } from './';

export default {
  title: 'StakePoolsGrid/StakePoolCardSkeleton',
} as Meta;

const CardsGroup = ({ count }: { count: number }) => (
  <Flex
    style={{
      flexWrap: 'wrap',
    }}
  >
    {[...Array.from({ length: count }).keys()].map((key, index) => (
      <Flex w="$214" alignItems="center" justifyContent="center" key={key} p="$10">
        <StakePoolCardSkeleton index={index} />
      </Flex>
    ))}
  </Flex>
);

export const Overview = {
  render: () => (
    <Section title="Grid Card Skeleton">
      <Grid columns="$1">
        <Cell>
          <Variants.Table headers={['Default']}>
            <Variants.Row>
              <Variants.Cell>
                <Flex style={{ backgroundColor: 'white' }} p="$28">
                  <CardsGroup count={18} />
                </Flex>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Cell>
        <Cell>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table headers={['Dark Mode']}>
              <Variants.Row>
                <Variants.Cell>
                  <CardsGroup count={18} />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </LocalThemeProvider>
        </Cell>
      </Grid>
    </Section>
  ),
};
