/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';
import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';
import { Tooltip } from '../tooltip';

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
      <Flex justifyContent="flex-start" mb="$18">
        <Text.Body.Normal weight="$semibold">{title}</Text.Body.Normal>
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
            <Text.Body.Normal
              color={transactionAmount.includes('-') ? 'primary' : 'success'}
              weight="$semibold"
            >
              {transactionAmount} {cardanoSymbol}
            </Text.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
    </div>
  </div>
);
