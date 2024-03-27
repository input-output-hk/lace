/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';
import classNames from 'classnames';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as styles from './dapp-transaction-summary.css';

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
  <div className={styles.txSummaryContainer}>
    {title !== undefined && (
      <Flex justifyContent="flex-start">
        <Typography.Body.Large className={styles.txSummaryTitle}>
          {title}
        </Typography.Body.Large>
      </Flex>
    )}
    <div className={styles.txAmountContainer}>
      <Grid {...props} alignItems="$center" columns="$2">
        <Cell>
          <AdaComponent className={styles.adaIcon} />
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Small
              className={classNames(styles.label, {
                [styles.positiveBalance]: !transactionAmount.includes('-'),
                [styles.negativeBalance]: transactionAmount.includes('-'),
              })}
              data-testId="dapp-transaction-amount-value"
            >
              {transactionAmount} {cardanoSymbol}
            </Typography.Body.Small>
          </Flex>
        </Cell>
      </Grid>
    </div>
  </div>
);
