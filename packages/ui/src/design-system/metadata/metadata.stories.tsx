import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { page, Variants, Section } from '../decorators';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Metadata } from './metadata.component';

const subtitle = `Control that displays data items in rows.`;

export default {
  title: 'List & tables/Metadata',
  decorators: [page({ title: 'Metadata', subtitle })],
} as Meta;

const Layout = ({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element => (
  <Flex h="$fill" w="$fill" alignItems="center" justifyContent="center">
    <Box w="$fill" style={{ maxWidth: '360px' }}>
      {children}
    </Box>
  </Flex>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <Grid>
            <Cell>
              <Metadata
                label="URL"
                text="https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu"
              />
            </Cell>
            <Cell>
              <Metadata
                label="Hash"
                tooltip="9bba8233cdd086f0325daba465d568a88970d42536f9e71e92a80d5922ded885"
                text="9bba8233cdd086f0325daba465d568a88970d42536f9e71e92a80d5922ded885"
              />
            </Cell>
            <Cell>
              <Metadata label="Drep" text="65ge6g54g5dd5" />
            </Cell>
            <Cell>
              <Metadata label="Deposit paid" text="0.35 ADA" />
            </Cell>
          </Grid>
        </Layout>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
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
