/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';

import * as styles from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  testId?: string;
  transactionAmount: string;
  title?: string;
  cardanoSymbol?: string;
};

export const TransactionSummary = ({
  testId,
  transactionAmount,
  title,
  cardanoSymbol,
  ...props
}: Readonly<Props>): JSX.Element => (
  <div className={styles.txSummaryContainer}>
    {title !== undefined && (
      <Flex justifyContent="flex-start" mb="$18">
        <Text.Body.Large weight="$bold">{title}</Text.Body.Large>
      </Flex>
    )}
    <div className={styles.txAmountContainer} data-testid={testId}>
      <Grid {...props} alignItems="$center" columns="$2">
        <Cell>
          <AdaComponent className={styles.adaIcon} />
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Text.Body.Small
              color={transactionAmount.includes('-') ? 'primary' : 'success'}
              weight="$semibold"
            >
              {transactionAmount} {cardanoSymbol}
            </Text.Body.Small>
          </Flex>
        </Cell>
      </Grid>
    </div>
  </div>
);
