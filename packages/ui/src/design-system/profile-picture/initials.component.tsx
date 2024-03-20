import React from 'react';

import classNames from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './initials.css';

interface Props {
  letter: string;
  radius?: 'circle' | 'rounded';
}

export const Initials = ({
  letter,
  radius = 'circle',
}: Readonly<Props>): JSX.Element => (
  <Flex
    className={classNames(cx.root, {
      [cx.rounded]: radius === 'rounded',
      [cx.circle]: radius === 'circle',
    })}
    alignItems="center"
    justifyContent="center"
  >
    <Text.Body.Large className={cx.text} weight="$bold">
      {letter}
    </Text.Body.Large>
    <Box className={cx.background} />
  </Flex>
);
