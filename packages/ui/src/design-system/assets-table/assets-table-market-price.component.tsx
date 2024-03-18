import React from 'react';

import { Flex } from '../flex';
import * as Typography from '../typography';

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
      <Typography.Body.Large weight="$semibold" className={cx.text}>
        {tokenPrice}
      </Typography.Body.Large>
      <Typography.Body.Normal
        weight="$semibold"
        color={priceTrend === 'up' ? 'success' : 'error'}
      >
        {priceChange}
      </Typography.Body.Normal>
    </Flex>
  );
};
