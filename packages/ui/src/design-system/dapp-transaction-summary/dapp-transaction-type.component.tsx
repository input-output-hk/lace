import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

export enum TransactionTypes {
  Withdrawal = 'withdrawal',
  Receive = 'receive',
  Sent = 'sent',
  Send = 'send',
  Sending = 'sending',
  Mint = 'mint',
  'Self Transaction' = 'self',
}

type TransactionType = keyof typeof TransactionTypes;

type Props = OmitClassName<'div'> & {
  label: string;
  transactionType: TransactionType;
  testId?: string;
};

export const TransactionType = ({
  label,
  transactionType,
  testId,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <div className={cx.transactionTypeContainer}>
      <Grid {...props} columns="$2">
        <Cell>
          <Typography.Body.Large className={cx.txSummaryTitle}>
            {label}
          </Typography.Body.Large>
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Large
              className={cx.coloredText}
              data-testid={testId}
            >
              {transactionType}
            </Typography.Body.Large>
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
