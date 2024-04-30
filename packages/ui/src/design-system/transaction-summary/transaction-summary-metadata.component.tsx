import React from 'react';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { Text } from '../text';

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
        <Text.Body.Normal
          weight="$medium"
          {...(testID != undefined && { 'data-testid': `${testID}-label` })}
        >
          {label}
        </Text.Body.Normal>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end" h="$fill">
          <Text.Body.Normal
            weight="$medium"
            className={cx.text}
            {...(testID != undefined && { 'data-testid': `${testID}-value` })}
          >
            {text}
          </Text.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
