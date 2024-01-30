import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

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
  fiatPrice: string;
};

export const Amount = ({
  label,
  amount,
  fiatPrice,
  tooltip,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$2">
      <Cell>
        <Flex>
          <Typography.Body.Normal className={cx.label}>
            {label}
          </Typography.Body.Normal>
          {tooltip !== undefined && (
            <Box ml="$8" className={cx.tooltip}>
              <Tooltip label={tooltip}>
                <div className={cx.tooltipText}>
                  <InfoIcon />
                </div>
              </Tooltip>
            </Box>
          )}
        </Flex>
      </Cell>
      <Cell>
        <Flex flexDirection="column" alignItems="flex-end" h="$fill">
          <Typography.Body.Normal className={cx.text}>
            {amount}
          </Typography.Body.Normal>
          <Typography.Body.Normal className={cx.secondaryText}>
            {fiatPrice}
          </Typography.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
