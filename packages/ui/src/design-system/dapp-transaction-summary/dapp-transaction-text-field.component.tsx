import type { ReactNode } from 'react';
import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';
import { Tooltip } from '../tooltip';

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
          <Text.Body.Normal weight="$medium">{label}</Text.Body.Normal>
          {tooltip !== undefined && (
            <Box ml="$8">
              <Tooltip label={tooltip}>
                <InfoIcon className={cx.tooltipIcon} />
              </Tooltip>
            </Box>
          )}
        </Flex>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end" h="$fill">
          <Text.Body.Small weight="$medium" className={cx.text}>
            {text}
          </Text.Body.Small>
        </Flex>
      </Cell>
    </Grid>
  );
};
