import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';
import { Tooltip } from '../tooltip';

import * as cx from './transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label?: string;
  tooltip?: string;
  amount: string;
  fiatPrice: string;
  'data-testid'?: string;
};

const makeTestId = (namespace = '', path = ''): string | undefined => {
  return namespace === '' ? undefined : `tx-amount-${namespace}-${path}`;
};

export const Amount = ({
  label,
  amount,
  fiatPrice,
  tooltip,
  ...props
}: Readonly<Props>): JSX.Element => {
  const testId = props['data-testid'];

  return (
    <Grid {...props} data-testid={makeTestId(testId, 'root')} columns="$2">
      <Cell>
        <Flex>
          <Text.Body.Normal
            weight="$semibold"
            data-testid={makeTestId(testId, 'label')}
          >
            {label}
          </Text.Body.Normal>
          {tooltip !== undefined && (
            <Box ml="$8" className={cx.tooltip}>
              <Tooltip label={tooltip}>
                <div
                  className={cx.tooltipText}
                  data-testid={makeTestId(testId, 'tooltip-icon')}
                >
                  <InfoIcon />
                </div>
              </Tooltip>
            </Box>
          )}
        </Flex>
      </Cell>
      <Cell>
        <Flex flexDirection="column" alignItems="flex-end" h="$fill">
          <Text.Body.Normal
            weight="$medium"
            className={cx.text}
            data-testid={makeTestId(testId, 'amount')}
          >
            {amount}
          </Text.Body.Normal>
          <Text.Body.Normal
            className={cx.secondaryText}
            data-testid={makeTestId(testId, 'fiat')}
          >
            {fiatPrice}
          </Text.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
