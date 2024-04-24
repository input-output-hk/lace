import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';
import classNames from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Tooltip } from '../tooltip';
import * as Typography from '../typography';

import * as cx from './transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label?: string;
  tooltip?: string;
  amount: string;
  fiatPrice?: string;
  'data-testid'?: string;
  className?: string;
  displayFiat?: boolean;
  highlightPositiveAmount?: boolean;
};

const makeTestId = (namespace = '', path = ''): string | undefined => {
  return namespace === '' ? undefined : `tx-amount-${namespace}-${path}`;
};

export const Amount = ({
  label,
  amount,
  fiatPrice,
  tooltip,
  className,
  displayFiat = true,
  highlightPositiveAmount,
  ...props
}: Readonly<Props>): JSX.Element => {
  const testId = props['data-testid'];
  const shouldHighlightPositiveAmount =
    highlightPositiveAmount === true && !amount.includes('-');
  return (
    <div className={className}>
      <Grid {...props} data-testid={makeTestId(testId, 'root')} columns="$2">
        <Cell>
          <Flex>
            <Typography.Body.Normal
              data-testid={makeTestId(testId, 'label')}
              className={cx.label}
            >
              {label}
            </Typography.Body.Normal>
            {tooltip !== undefined && (
              <Box ml="$8">
                <Tooltip label={tooltip}>
                  <div data-testid={makeTestId(testId, 'tooltip-icon')}>
                    <InfoIcon className={cx.tooltipIcon} />
                  </div>
                </Tooltip>
              </Box>
            )}
          </Flex>
        </Cell>
        <Cell>
          <Flex flexDirection="column" alignItems="flex-end" h="$fill">
            <Typography.Body.Normal
              className={classNames(cx.text, {
                [cx.normalAmount]: !shouldHighlightPositiveAmount,
                [cx.highlightedAmount]: shouldHighlightPositiveAmount,
              })}
              data-testid={makeTestId(testId, 'amount')}
            >
              {amount}
            </Typography.Body.Normal>
            {displayFiat && (
              <Typography.Body.Normal
                className={cx.secondaryText}
                data-testid={makeTestId(testId, 'fiat')}
              >
                {fiatPrice}
              </Typography.Body.Normal>
            )}
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
