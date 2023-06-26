import React from 'react';

import classNames from 'classnames';

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
        className={classNames({
          [cx.down]: priceTrend === 'down',
          [cx.up]: priceTrend === 'up',
        })}
      >
        {priceChange}
      </Typography.Body.Normal>
    </Flex>
  );
};
