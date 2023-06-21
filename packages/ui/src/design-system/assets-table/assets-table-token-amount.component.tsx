import React from 'react';

import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './assets-table-token-amount.css';

interface Props {
  amount: string;
  fiatPrice: string;
}

export const TokenAmount = ({
  amount,
  fiatPrice,
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex flexDirection="column" alignItems="flex-end" className={cx.container}>
      <Typography.Body.Large weight="$semibold" className={cx.amount}>
        {amount}
      </Typography.Body.Large>
      <Typography.Body.Normal weight="$semibold" className={cx.fiatPrice}>
        {fiatPrice}
      </Typography.Body.Normal>
    </Flex>
  );
};
