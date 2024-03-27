import React from 'react';

import type { Meta } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Address } from './transaction-summary-address.component';
import { Amount } from './transaction-summary-amount.component';
import { Metadata } from './transaction-summary-metadata.component';
import { Other } from './transaction-summary-other.component';

const subtitle = `Control that displays data items in rows.`;

export default {
  title: 'List & tables/Transaction summary',
  subcomponents: { Address, Amount, Metadata, Other },
  decorators: [page({ title: 'Transaction summary', subtitle })],
} as Meta;

const Layout = ({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element => (
  <Flex h="$fill" w="$fill" alignItems="center" justifyContent="center">
    <Box w="$fill" style={{ maxWidth: '584px' }}>
      {children}
    </Box>
  </Flex>
);

const Example = (): JSX.Element => (
  <Layout>
    <Flex
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      w="$fill"
    >
      <Grid columns="$1" rows="$fitContent" gutters="$32">
        <Cell>
          <Address
            label="Address"
            address="addr1q998xresx3rr0d5w6rp88nmckcgykdulmresrja5ul0c4f4f25q0fp2qmfvfpzru79r9nxjslff0cr3eac4y43j865uqvzlalu"
          />
        </Cell>
        <Cell>
          <Grid columns="$1" rows="$fitContent" gutters="$16">
            <Cell>
              <Amount label="Sent" amount="102.00 ADA" fiatPrice="84.45 USD" />
            </Cell>
            <Cell>
              <Amount amount="102.00 ADA" fiatPrice="84.45 USD" />
            </Cell>
            <Cell>
              <Amount
                label="With Tooltip"
                tooltip="This is a sample tooltip text"
                amount="102.00 ADA"
                fiatPrice="84.45 USD"
                data-testid="sample"
              />
            </Cell>
            <Cell>
              <Amount
                label="Received"
                amount="102.00 ADA"
                fiatPrice="84.45 USD"
                highlightPositiveAmount
              />
            </Cell>
          </Grid>
        </Cell>
      </Grid>
    </Flex>
  </Layout>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <Address
            label="Address"
            address="addr1q998xresx3rr0d5w6rp88nmckcgykdulmresrja5ul0c4f4f25q0fp2qmfvfpzru79r9nxjslff0cr3eac4y43j865uqvzlalu"
          />
        </Layout>
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <Amount label="Label" amount="102.00 ADA" fiatPrice="84.45 USD" />
        </Layout>
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <Other label="Label" text="Text" />
        </Layout>
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <Metadata
            label="Metadata"
            text="Ut condimentum enim pulvinar, consequat nunc vitae, feugiat nisl. Vestibulum elementum condiment congue et nam quis ipsum diam."
          />
        </Layout>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Example">
        <Example />
      </Section>

      <Divider my="$64" />

      <Section title="Variants">
        <Variants.Table headers={['Address / hash', 'Amount']}>
          <Variants.Row>
            <Variants.Cell>
              <Address
                label="Address"
                address="addr1q998xresx3rr0d5w6rp88nmckcgykdulmresrja5ul0c4f4f25q0fp2qmfvfpzru79r9nxjslff0cr3eac4y43j865uqvzlalu"
              />
            </Variants.Cell>
            <Variants.Cell>
              <Amount label="Label" amount="102.00 ADA" fiatPrice="84.45 USD" />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table headers={['Other', 'Metadata']}>
          <Variants.Row>
            <Variants.Cell>
              <Other label="Label" text="Text" />
            </Variants.Cell>
            <Variants.Cell>
              <Metadata
                label="Metadata"
                text="Ut condimentum enim pulvinar, consequat nunc vitae, feugiat nisl. Vestibulum elementum condiment congue et nam quis ipsum diam."
              />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

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
