import React from 'react';

import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './assets-table-market-price.css';

interface Props {
  tokenPrice: string;
  priceChange: string;
  priceTrend: 'down' | 'up';
}

export const MarketPrice = ({
  tokenPrice,
  priceChange,
  priceTrend,
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex flexDirection="column" alignItems="center" className={cx.container}>
      <Text.Body.Large weight="$semibold">{tokenPrice}</Text.Body.Large>
      <Text.Body.Normal
        weight="$semibold"
        color={priceTrend === 'up' ? 'success' : 'error'}
      >
        {priceChange}
      </Text.Body.Normal>
    </Flex>
  );
};
