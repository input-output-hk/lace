import React from 'react';

import { Secondary } from '../buttons/secondary-button';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  origin: string;
};

export const TransactionOrigin = ({
  label,
  origin,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <>
      <Grid {...props} columns="$2">
        <Cell>
          <Flex alignItems="center">
            <Typography.Body.Normal className={cx.label}>
              {label}
            </Typography.Body.Normal>
          </Flex>
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end" alignItems="center">
            <Secondary label={origin} />
          </Flex>
        </Cell>
      </Grid>
      <Divider my="$20" />
    </>
  );
};
