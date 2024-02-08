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
  <>
    {title !== undefined && (
      <Flex justifyContent="flex-start">
        <Typography.Body.Large className={cx.boldLabel}>
          {title}
        </Typography.Body.Large>
      </Flex>
    )}
    <Grid {...props} columns="$2">
      <Cell>
        <AdaComponent className={cx.adaIcon} />
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end">
          <Typography.Body.Normal className={cx.label}>
            {transactionAmount} {cardanoSymbol}
          </Typography.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  </>
);
