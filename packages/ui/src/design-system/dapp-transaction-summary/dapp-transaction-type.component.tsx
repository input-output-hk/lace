import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';

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
};

export const TransactionType = ({
  label,
  transactionType,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <div className={cx.transactionTypeContainer}>
      <Grid {...props} columns="$2">
        <Cell>
          <Text.Body.Large weight="$bold" data-testid="dapp-transaction-title">
            {label}
          </Text.Body.Large>
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Text.Body.Large
              color="accent"
              weight="$bold"
              data-testid="dapp-transaction-type"
            >
              {transactionType}
            </Text.Body.Large>
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
