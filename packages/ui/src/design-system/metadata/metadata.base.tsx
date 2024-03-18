import React from 'react';

import { Flex } from '../flex';
import { Cell, Grid } from '../grid';
import { Tooltip } from '../tooltip';
import * as Typography from '../typography';

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
          <Typography.Body.Normal weight="$semibold">
            {label}
          </Typography.Body.Normal>
        ) : (
          <Tooltip label={tooltip}>
            <div>
              <Typography.Body.Normal weight="$semibold">
                {label}
              </Typography.Body.Normal>
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
