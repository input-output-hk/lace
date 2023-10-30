import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './metadata.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  text: string;
};

export const Metadata = ({
  label,
  text,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$6">
      <Cell colStart="$1" colEnd="$3">
        <Typography.Body.Normal className={cx.label}>
          {label}
        </Typography.Body.Normal>
      </Cell>
      <Cell colStart="$3" colEnd="$7">
        <Flex justifyContent="flex-end" h="$fill">
          <Typography.Address className={cx.text}>{text}</Typography.Address>
        </Flex>
      </Cell>
    </Grid>
  );
};
