import React from 'react';

import type { Meta } from '@storybook/react';

import token1 from '../../assets/images/token-1.png';
import token2 from '../../assets/images/token-2.png';
import token3 from '../../assets/images/token-3.png';
import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { page, Variants, Section } from '../decorators';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { TransactionAssets } from './dapp-transaction-assets.component';
import { TransactionSummary } from './dapp-transaction-summary.component';
// import * as styles from './dapp-transaction-summary.stories.css';
import { TransactionType } from './dapp-transaction-type.component';

const subtitle = `Control that displays data items in rows.`;

export default {
  title: 'List & tables/DApp transaction summary',
  subcomponents: { TransactionSummary, TransactionType },
  decorators: [page({ title: 'Dapp transaction summary', subtitle })],
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

const items = [
  {
    imageSrc: token1,
    balance: '-200.00',
    tokenName: 'Maui',
    metadataHash: '#3442348',
    recipient: '',
  },
  {
    imageSrc: '',
    balance: '-10.00',
    tokenName: 'HairMaui',
    metadataHash: '#3438888',
    recipient: '',
  },
  {
    imageSrc: token2,
    balance: '-1000.00',
    tokenName: 'Lapisluzzz',
    metadataHash: '#3430008',
    recipient: '',
  },
  {
    imageSrc: token3,
    balance: '-1078.00',
    tokenName: 'HawaiSand',
    metadataHash: '#3430008',
    recipient: '',
  },
  {
    imageSrc: '',
    balance: '-20780.00',
    tokenName: 'HelloSand',
    metadataHash: '#3430008',
    recipient: '',
  },
];

const Example = (): JSX.Element => (
  <Layout>
    <TransactionType label="Transaction" transactionType={'Sent'} />
    <TransactionSummary
      title="Transaction Summary"
      transactionAmount="-100.00"
    />
    {items.map(value => (
      <TransactionAssets
        key={value.metadataHash}
        imageSrc={value.imageSrc}
        balance={value.balance}
        tokenName={value.tokenName}
        metadataHash={value.metadataHash}
      />
    ))}
  </Layout>
);

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <Layout>
        <TransactionType label="Transaction" transactionType={'Sent'} />
        <TransactionSummary
          title="Transaction Summary"
          transactionAmount="-100.00"
        />
        <>
          {items.map(value => (
            <TransactionAssets
              key={value.metadataHash}
              imageSrc={value.imageSrc}
              balance={value.balance}
              tokenName={value.tokenName}
              metadataHash={value.metadataHash}
            />
          ))}
        </>
      </Layout>
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Example">
        <Example />
      </Section>

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
