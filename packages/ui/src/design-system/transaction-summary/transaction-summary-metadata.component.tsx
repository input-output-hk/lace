import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  text: string;
  testID?: string;
};

export const Metadata = ({
  label,
  text,
  testID,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid {...props} columns="$2">
      <Cell>
        <Typography.Body.Large
          className={cx.label}
          weight="$bold"
          {...(testID != undefined && { 'data-testid': `${testID}-label` })}
        >
          {label}
        </Typography.Body.Large>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end" h="$fill">
          <Typography.Body.Normal
            className={cx.text}
            {...(testID != undefined && { 'data-testid': `${testID}-value` })}
          >
            {text}
          </Typography.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
