import React from 'react';

import { Flex } from '../flex';
import { Cell, Grid } from '../grid';
import { Text } from '../text';
import { Tooltip } from '../tooltip';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<'div'> & {
  label: string;
  tooltip?: string;
};

export const MetadataBase = ({
  label,
  children,
  tooltip,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$6">
      <Cell colStart="$1" colEnd="$3">
        {tooltip == undefined ? (
          <Text.Body.Normal weight="$semibold">{label}</Text.Body.Normal>
        ) : (
          <Tooltip label={tooltip}>
            <div>
              <Text.Body.Normal weight="$semibold">{label}</Text.Body.Normal>
            </div>
          </Tooltip>
        )}
      </Cell>
      <Cell colStart="$3" colEnd="$7">
        <Flex justifyContent="flex-end" h="$fill">
          {children}
        </Flex>
      </Cell>
    </Grid>
  );
};
