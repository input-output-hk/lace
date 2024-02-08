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
import { TransactionOrigin } from './dapp-transaction-origin.component';
import { TransactionSummary } from './dapp-transaction-summary.component';
import { TransactionType } from './dapp-transaction-type.component';

const subtitle = `Control that displays data items in rows.`;

export default {
  title: 'List & tables/DApp transaction summary',
  subcomponents: { TransactionOrigin, TransactionSummary, TransactionType },
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
  // {
  //   key: '',
  //   value: {
  //     amount: BigInt(-2),
  //     assetInfo: {
  //       assetId:
  //         '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
  //       fingerprint: 'asset1sjk0uucljv4qxxnhq8gjy7r5mar64erhfuh4q8',
  //       name: '57696e67526964657273',
  //       nftMetadata: null,
  //       policyId: '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7',
  //       quantity: BigInt(1),
  //       supply: BigInt(1),
  //       tokenMetadata: {
  //         assetId:
  //           '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
  //         decimals: 6,
  //         desc: 'WingRiders is a decentralized exchange protocol on Cardano. WRT provides access to dao voting and other DEX related functions.',
  //         icon: '',
  //         name: 'WingRiders Preprod Governance Token',
  //         ticker: 'tWRT',
  //         url: 'https://app.preprod.wingriders.com',
  //       },
  //     },
  //   },
  // },
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
    <Flex
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      w="$fill"
    >
      <TransactionType label="Transaction" transactionType={'Sent'} />
      <TransactionOrigin label="Origin" origin="Wingriders" />
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
    </Flex>
  </Layout>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Layout>
          <TransactionType label="Transaction" transactionType={'Sent'} />
          <TransactionOrigin label="Origin" origin="Wingriders" />
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
