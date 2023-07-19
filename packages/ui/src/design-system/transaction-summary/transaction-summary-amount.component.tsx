import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label?: string;
  amount: string;
  fiatPrice: string;
};

export const Amount = ({
  label,
  amount,
  fiatPrice,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$2">
      <Cell>
        <Typography.Body.Normal className={cx.label}>
          {label}
        </Typography.Body.Normal>
      </Cell>
      <Cell>
        <Flex flexDirection="column" alignItems="flex-end" h="$fill">
          <Typography.Body.Normal className={cx.text}>
            {amount}
          </Typography.Body.Normal>
          <Typography.Body.Normal className={cx.secondaryText}>
            {fiatPrice}
          </Typography.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
