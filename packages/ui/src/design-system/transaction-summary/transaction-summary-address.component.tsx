import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  address: string;
  testID?: string;
};

export const Address = ({
  label,
  address,
  testID,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$2">
      <Cell>
        <Typography.Body.Normal
          weight="$semibold"
          {...(testID != undefined && { 'data-testid': `${testID}-label` })}
        >
          {label}
        </Typography.Body.Normal>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end" h="$fill">
          <Typography.Address
            weight="$medium"
            className={cx.text}
            {...(testID != undefined && { 'data-testid': `${testID}-value` })}
          >
            {address}
          </Typography.Address>
        </Flex>
      </Cell>
    </Grid>
  );
};
