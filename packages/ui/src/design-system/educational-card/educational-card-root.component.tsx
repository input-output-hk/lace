import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { Text } from '../text';

import * as cx from './educational-card-root.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  title: string;
};

export const Root = ({
  title,
  children,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Flex {...props} className={cx.root} px="$16" py="$24" flexDirection="column">
    <Box px="$16" pb="$16">
      <Text.SubHeading weight="$bold">{title}</Text.SubHeading>
    </Box>
    <Grid columns="$1" gutters="$0">
      {children}
    </Grid>
  </Flex>
);
