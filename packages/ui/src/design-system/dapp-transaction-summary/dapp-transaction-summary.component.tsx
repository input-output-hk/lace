/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  transactionAmount: string;
  title?: string;
  cardanoSymbol?: string;
};

export const TransactionSummary = ({
  transactionAmount,
  title,
  cardanoSymbol,
  ...props
}: Readonly<Props>): JSX.Element => (
  <div className={cx.txSummaryContainer}>
    {title !== undefined && (
      <Flex justifyContent="flex-start">
        <Typography.Body.Large className={cx.txSummaryTitle}>
          {title}
        </Typography.Body.Large>
      </Flex>
    )}
    <div className={cx.txAmountContainer}>
      <Grid {...props} alignItems="$center" columns="$2">
        <Cell>
          <AdaComponent className={cx.adaIcon} />
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Normal
              className={cx.label}
              data-testid="dapp-transaction-amount-value"
            >
              {transactionAmount} {cardanoSymbol}
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
    </div>
  </div>
);
