import React, { useState } from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';

import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { sleep } from '../../test';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { AssetInput } from './asset-input.component';
import { MaxButton } from './max-button.component';

import type { Asset, AssetState } from './asset-input.data';

const subtitle = ``;

export default {
  title: 'Input fields/Asset Input',
  component: AssetInput,
  decorators: [page({ title: 'Asset Input', subtitle })],
} as Meta;

const asset: Asset = {
  balance: String(10_000_000),
  amount: '',
  id: '',
  ticker: 'Token',
  fiat: {
    value: '0',
    ticker: 'USD',
  },
};

const validState = (id = '1'): AssetState => ({
  type: 'valid',
  asset: {
    ...asset,
    id,
  },
});

const invalidState = (id = '1'): AssetState => ({
  type: 'invalid',
  asset: {
    ...asset,
    id,
  },
  error: 'Insufficient balance',
});

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <AssetInput state={validState('1')} />
    </Variants.Cell>
  </Variants.Row>
);

const SecondaryItems = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <MaxButton label="MAX" />
      </Variants.Cell>
      <Variants.Cell>
        <MaxButton label="MAX" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <MaxButton label="MAX" id="pressed" />
      </Variants.Cell>
      <Variants.Cell />
      <Variants.Cell />
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Overview">
        <Variants.Table
          headers={['Browser view — simple', 'Browser view — simple + error']}
        >
          <Variants.Row>
            <Variants.Cell>
              <AssetInput state={validState('1')} />
            </Variants.Cell>
            <Variants.Cell>
              <AssetInput state={invalidState('1')} />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Rest']}>
          <MainComponents />
        </Variants.Table>
        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <MainComponents />
          </Variants.Table>
        </ThemeProvider>
      </Section>

      <Divider my="$64" />

      <Section title="Secondary items">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <SecondaryItems />
        </Variants.Table>
        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <SecondaryItems />
          </Variants.Table>
        </ThemeProvider>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
    active: '#pressed',
  },
};

type Interactions = ComponentStory<typeof AssetInput>;
export const Interactions: Interactions = (): JSX.Element => {
  const [state, setState] = useState<AssetState>(validState('1'));

  const onTickerClick = (asset: Readonly<Asset>): void => {
    setState(currentState => ({
      ...currentState,
      asset: { ...currentState.asset, ticker: `Token ${asset.id}` },
    }));
  };

  const onAmountChange = (asset: Readonly<Asset>, amount: string): void => {
    setState(currentState => {
      if (currentState.asset.id !== asset.id) {
        return currentState;
      }

      if (Number(currentState.asset.balance) < Number(amount)) {
        return {
          ...currentState,
          type: 'invalid',
          error: 'Insufficient balance',
          asset: {
            ...currentState.asset,
            amount: amount,
          },
        };
      }

      return {
        ...currentState,
        type: 'valid',
        asset: {
          ...currentState.asset,
          amount: amount,
        },
      };
    });
  };

  const onMaxClick = (asset: Readonly<Asset>): void => {
    setState(currentState => {
      return {
        ...currentState,
        type: 'valid',
        asset: {
          ...currentState.asset,
          amount: asset.balance,
        },
      };
    });
  };

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <AssetInput
            state={state}
            onTickerClick={onTickerClick}
            onAmountChange={onAmountChange}
            onMaxClick={onMaxClick}
          />
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  userEvent.click(await canvas.findByTestId(`asset-input-ticker-button-1`));

  await userEvent.type(
    canvas.getByTestId(`asset-input-amount-input-1`),
    '12000000',
    {
      delay: 100,
    },
  );

  expect(await canvas.findByTestId(`asset-input-error-1`)).toHaveTextContent(
    'Insufficient balance',
  );

  await sleep();

  userEvent.click(await canvas.findByTestId(`asset-input-max-button-1`));
  expect(canvas.queryByTestId(`asset-input-error-1`)).not.toBeInTheDocument();
};
