import type { ElementType } from 'react';
import React from 'react';

import type { ComponentStory, Meta } from '@storybook/react';

import cardanoImage from '../../assets/images/cardano-blue-bg.png';
import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { MarketPrice } from './assets-table-market-price.component';
import { TokenAmount } from './assets-table-token-amount.component';
import { TokenProfile } from './assets-table-token-profile.component';
import { AssetsTable } from './assets-table.component';

const subtitle = `A table displays a collections of data grouped into rows`;

export default {
  title: 'List & tables/Assets table',
  component: AssetsTable,
  subcomponents: {
    TokenProfile,
    TokenAmount,
    MarketPrice,
  },
  decorators: [page({ title: 'Assets table', subtitle })],
  argTypes: {
    priceTrend: {
      options: ['up', 'down'],
      control: { type: 'select' },
    },
  },
} as Meta;

const PopUpView = ({
  children,
}: Readonly<{ children: JSX.Element }>): JSX.Element => {
  return <div style={{ width: '342px' }}>{children}</div>;
};

interface AssetInfoProps {
  id?: string;
  priceTrend?: 'down' | 'up';
}

const SimpleAssetInfo = ({ id }: Readonly<AssetInfoProps>): JSX.Element => (
  <AssetsTable id={id}>
    <TokenProfile
      imageSrc={cardanoImage}
      name="Token name"
      description="Subtitle"
    />
    <TokenAmount amount="23,584.48" fiatPrice="24,568.54 USD" />
  </AssetsTable>
);

const DetailedAssetInfo = ({
  id,
  priceTrend = 'up',
}: Readonly<AssetInfoProps>): JSX.Element => (
  <AssetsTable id={id}>
    <TokenProfile
      imageSrc={cardanoImage}
      name="Token name"
      description="Subtitle"
    />
    <MarketPrice
      tokenPrice="1.092"
      priceChange="+3.21"
      priceTrend={priceTrend}
    />
    <TokenAmount amount="23,584.48" fiatPrice="24,568.54 USD" />
  </AssetsTable>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <DetailedAssetInfo />
      </Variants.Cell>
      <Variants.Cell>
        <DetailedAssetInfo id="hover" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <SimpleAssetInfo />
      </Variants.Cell>
      <Variants.Cell>
        <SimpleAssetInfo id="hover" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <DetailedAssetInfo />
          <DetailedAssetInfo priceTrend="down" />
        </Flex>
      </Section>

      <Section title="Variants">
        <Variants.Table headers={['Asset selection view', 'Pop-up view']}>
          <Variants.Row>
            <Variants.Cell>
              <SimpleAssetInfo />
            </Variants.Cell>
            <Variants.Cell>
              <PopUpView>
                <SimpleAssetInfo />
              </PopUpView>
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table headers={['Browser view']}>
          <Variants.Row>
            <Variants.Cell>
              <DetailedAssetInfo />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Rest', 'Hover / Focused']}>
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

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
  },
};

interface ControlsProps {
  tokenName: string;
  tokenSubtitle: string;
  tokenPrice: string;
  priceChange: string;
  priceTrend: 'down' | 'up';
  tokenAmount: string;
  fiatPrice: string;
}

type Controls = ComponentStory<ElementType<ControlsProps>>;

export const Controls: Controls = ({
  fiatPrice,
  tokenAmount,
  tokenName,
  tokenPrice,
  priceChange,
  priceTrend,
  tokenSubtitle,
}: Readonly<ControlsProps>): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <AssetsTable>
            <TokenProfile
              imageSrc={cardanoImage}
              name={tokenName}
              description={tokenSubtitle}
            />
            <MarketPrice
              tokenPrice={tokenPrice}
              priceChange={priceChange}
              priceTrend={priceTrend}
            />
            <TokenAmount amount={tokenAmount} fiatPrice={fiatPrice} />
          </AssetsTable>
        </Flex>
      </Section>
    </Cell>
  </Grid>
);

Controls.args = {
  tokenAmount: '23,584.48',
  fiatPrice: '24,568.54 USD',
  tokenName: 'Token name',
  tokenPrice: '1.092',
  priceChange: '+3.21',
  priceTrend: 'up',
  tokenSubtitle: 'Subtitle',
};
