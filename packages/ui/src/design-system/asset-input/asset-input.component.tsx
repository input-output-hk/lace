import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import { AmountInput } from './amount-input.component';
import * as cx from './asset-input.css';
import { MaxButton } from './max-button.component';
import { TickerButton } from './ticker-button.component';

import type { Asset, AssetState } from './asset-input.data';

interface Props {
  state: AssetState;
  onTickerClick?: (asset: Readonly<Asset>) => void;
  onAmountChange?: (asset: Readonly<Asset>, amount: string) => void;
  onMaxClick?: (asset: Readonly<Asset>) => void;
}

export const AssetInput = ({
  state,
  onTickerClick,
  onAmountChange,
  onMaxClick,
}: Readonly<Props>): JSX.Element => (
  <div className={cx.root}>
    <Box className={cx.assetNameBox}>
      <TickerButton
        id={state.asset.id}
        name={state.asset.ticker}
        onClick={(): void => {
          onTickerClick?.(state.asset);
        }}
      />
    </Box>
    <Box className={cx.amountBox}>
      <Flex alignItems="center" justifyContent="flex-end">
        <MaxButton
          label="MAX"
          data-testid={`asset-input-max-button-${state.asset.id}`}
          onClick={(): void => {
            onMaxClick?.(state.asset);
          }}
        />
        <Box ml="$8">
          <AmountInput
            id={state.asset.id}
            value={state.asset.amount}
            onChange={(value): void => {
              onAmountChange?.(state.asset, value);
            }}
          />
        </Box>
      </Flex>
    </Box>
    <Box className={cx.balance}>
      <Text.Body.Normal color="secondary">
        Balance: {state.asset.balance}
      </Text.Body.Normal>
    </Box>
    <Box className={cx.valueInFiat}>
      <Flex
        flexDirection="column"
        alignItems="flex-end"
        justifyContent="flex-end"
      >
        <Text.Body.Normal color="secondary">
          ≈ {state.asset.fiat.value} {state.asset.fiat.ticker}
        </Text.Body.Normal>
        {state.type === 'invalid' && (
          <Text.Label
            color="error"
            data-testid={`asset-input-error-${state.asset.id}`}
          >
            {state.error}
          </Text.Label>
        )}
      </Flex>
    </Box>
  </div>
);
