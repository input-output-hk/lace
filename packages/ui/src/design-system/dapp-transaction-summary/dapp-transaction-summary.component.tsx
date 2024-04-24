/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';
import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';
import classNames from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Tooltip } from '../tooltip';
import * as Typography from '../typography';

import * as styles from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  testId?: string;
  transactionAmount: string;
  title?: string;
  cardanoSymbol?: string;
  tooltip?: string;
};

export const TransactionSummary = ({
  testId,
  transactionAmount,
  title,
  cardanoSymbol,
  tooltip,
  ...props
}: Readonly<Props>): JSX.Element => (
  <div className={styles.txSummaryContainer}>
    {title !== undefined && (
      <Flex justifyContent="flex-start">
        <Typography.Body.Normal className={styles.txSummaryTitle}>
          {title}
        </Typography.Body.Normal>
        {tooltip && (
          <Box ml="$8">
            <Tooltip label={tooltip}>
              <div>
                <InfoIcon className={styles.tooltipIcon} />
              </div>
            </Tooltip>
          </Box>
        )}
      </Flex>
    )}
    <div className={styles.txAmountContainer} data-testid={testId}>
      <Grid {...props} alignItems="$center" columns="$2">
        <Cell>
          <AdaComponent className={styles.adaIcon} />
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Normal
              className={classNames(styles.label, {
                [styles.positiveBalance]: !transactionAmount.includes('-'),
              })}
            >
              {transactionAmount} {cardanoSymbol}
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
    </div>
  </div>
);
