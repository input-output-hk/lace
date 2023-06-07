import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './initials.css';

interface Props {
  letter: string;
}

export const Initials = ({ letter }: Readonly<Props>): JSX.Element => (
  <Flex className={cx.root} alignItems="center" justifyContent="center">
    <Text.Body.Large className={cx.text} weight="$bold">
      {letter}
    </Text.Body.Large>
    <Box className={cx.background} />
  </Flex>
);
