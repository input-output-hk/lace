import type { ReactNode } from 'react';
import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Tooltip } from '../tooltip';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-text-field.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  text: ReactNode | string;
  tooltip?: string;
};

export const TransactionTextField = ({
  label,
  text,
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
        <Flex justifyContent="flex-end" h="$fill">
          <Typography.Body.Small className={cx.text}>
            {text}
          </Typography.Body.Small>
        </Flex>
      </Cell>
    </Grid>
  );
};
