import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './educational-card-item.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  label: string;
  title: string;
  icon: ReactNode;
};

export const Item = ({
  label,
  title,
  icon,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Flex {...props} className={cx.root} p="$16" alignItems="center">
    <Flex
      className={cx.iconBox}
      mr="$24"
      alignItems="center"
      justifyContent="center"
    >
      {icon}
    </Flex>
    <Box>
      <Box mb="$8">
        <Text.Body.Normal weight="$medium" color="secondary">
          {label}
        </Text.Body.Normal>
      </Box>
      <Text.Body.Large weight="$semibold" className={cx.title}>
        {title}
      </Text.Body.Large>
    </Box>
  </Flex>
);
