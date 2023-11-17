import React, { useState } from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';

import { sleep } from '../../test';
import {
  page,
  Section,
  Variants,
  UIStateTable,
  ColorSchemaTable,
} from '../decorators';
import { Divider } from '../divider';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { AssetInput } from './asset-input.component';
import { invalidState, validState } from './asset-input.fixtures';
import { MaxButton } from './max-button.component';

import type { Asset, AssetState } from './asset-input.data';

const subtitle = ``;

export default {
  title: 'Input fields/Asset Input',
  component: AssetInput,
  decorators: [page({ title: 'Asset Input', subtitle })],
} as Meta;

const AssetInputMainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <AssetInput state={validState('1')} />
    </Variants.Cell>
  </Variants.Row>
);

const AssetInputUIStates = (): JSX.Element => (
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
        <ColorSchemaTable headers={['Rest']}>
          <AssetInputMainComponents />
        </ColorSchemaTable>
      </Section>

      <Divider my="$64" />

      <Section title="Secondary items">
        <UIStateTable>
          <AssetInputUIStates />
        </UIStateTable>
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
