import React from 'react';

import { Flex } from '../flex';
import { Text } from '../text';

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
      <Text.Body.Large weight="$semibold">{amount}</Text.Body.Large>
      <Text.Body.Normal color="secondary" weight="$semibold">
        {fiatPrice}
      </Text.Body.Normal>
    </Flex>
  );
};
