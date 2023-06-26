import React, { useState } from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { sleep } from '../../test';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { BundleInput } from './bundle-input.component';
import { RemoveButton } from './remove-button.component';

import type { Asset, AssetState } from '../asset-input/asset-input.data';

const subtitle = ``;

export default {
  title: 'Input fields/Bundle Input',
  component: BundleInput,
  decorators: [page({ title: 'Bundle input', subtitle })],
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
      <BundleInput state={[validState('1'), validState('2')]} />
    </Variants.Cell>
  </Variants.Row>
);

const SecondaryItems = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <RemoveButton />
      </Variants.Cell>
      <Variants.Cell>
        <RemoveButton id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <RemoveButton id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <RemoveButton disabled />
      </Variants.Cell>
      <Variants.Cell>
        <RemoveButton id="focused" />
      </Variants.Cell>
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
              <BundleInput state={[validState('1')]} />
            </Variants.Cell>
            <Variants.Cell>
              <BundleInput state={[invalidState('1')]} />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table
          headers={[
            'Browser view — multiple assets',
            'Browser view — multiple assets + error',
          ]}
        >
          <Variants.Row>
            <Variants.Cell>
              <BundleInput
                state={[validState('1'), validState('2'), validState('3')]}
              />
            </Variants.Cell>
            <Variants.Cell>
              <BundleInput
                state={[invalidState('1'), validState('2'), validState('3')]}
              />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Rest']}>
          <MainComponents />
        </Variants.Table>
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <MainComponents />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>

      <Divider my="$64" />

      <Section title="Secondary items">
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <SecondaryItems />
        </Variants.Table>
        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <SecondaryItems />
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
    active: '#pressed',
  },
};

type Interactions = ComponentStory<typeof BundleInput>;
export const Interactions: Interactions = (): JSX.Element => {
  const [state, setState] = useState<AssetState[]>([]);

  const onAddAsset = (): void => {
    setState([...state, validState((state.length + 1).toString())]);
  };

  const onTickerClick = (asset: Readonly<Asset>): void => {
    setState(
      state.map(currentState => {
        if (currentState.asset.id === asset.id) {
          return {
            ...currentState,
            asset: { ...currentState.asset, ticker: `Token ${asset.id}` },
          };
        }

        return currentState;
      }),
    );
  };

  const onAmountChange = (asset: Readonly<Asset>, amount: string): void => {
    setState(
      state.map(currentState => {
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
      }),
    );
  };

  const onMaxClick = (asset: Readonly<Asset>): void => {
    setState(
      state.map(currentState => {
        if (currentState.asset.id !== asset.id) {
          return currentState;
        }

        return {
          ...currentState,
          type: 'valid',
          asset: {
            ...currentState.asset,
            amount: currentState.asset.balance,
          },
        };
      }),
    );
  };

  const onRemoveAsset = (asset: Readonly<Asset>): void => {
    setState(state.filter(currentState => currentState.asset.id !== asset.id));
  };

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <BundleInput
            state={state}
            onAddAsset={onAddAsset}
            onTickerClick={onTickerClick}
            onAmountChange={onAmountChange}
            onMaxClick={onMaxClick}
            onRemoveAsset={onRemoveAsset}
          />
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  userEvent.click(await canvas.findByTestId('bundle-input-add-asset-button'));

  await sleep();

  userEvent.click(await canvas.findByTestId(`asset-input-ticker-button-1`));

  await sleep();

  userEvent.click(await canvas.findByTestId('bundle-input-add-asset-button'));

  userEvent.click(await canvas.findByTestId(`asset-input-ticker-button-2`));

  await userEvent.type(
    canvas.getByTestId(`asset-input-amount-input-2`),
    '12000000',
    {
      delay: 100,
    },
  );

  expect(await canvas.findByTestId(`asset-input-error-2`)).toHaveTextContent(
    'Insufficient balance',
  );

  await sleep();

  userEvent.click(await canvas.findByTestId(`asset-input-max-button-2`));
  expect(canvas.queryByTestId(`asset-input-error-2`)).not.toBeInTheDocument();

  await sleep();

  userEvent.click(await canvas.findByTestId(`bundle-input-remove-button-2`));
  expect(canvas.queryByTestId(`bundle-input-asset-2`)).not.toBeInTheDocument();
};
