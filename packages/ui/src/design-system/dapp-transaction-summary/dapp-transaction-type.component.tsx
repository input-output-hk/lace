import React from 'react';

import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

export const TransactionTypes = {
  Withdrawal: 'withdrawal' as const,
  Received: 'incoming' as const,
  Sent: 'outgoing' as const,
  Sending: 'sending' as const,
  'Self Transaction': 'self' as const,
};

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
    <>
      <Grid {...props} columns="$2">
        <Cell>
          <Typography.Body.Large className={cx.boldLabel}>
            {label}
          </Typography.Body.Large>
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Large className={cx.coloredText}>
              {transactionType}
            </Typography.Body.Large>
          </Flex>
        </Cell>
      </Grid>
      <Divider my="$20" />
    </>
  );
};
