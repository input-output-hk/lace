import React from 'react';

import classNames from 'classnames';

import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './text-link.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<'a'> & {
  disabled?: boolean;
  label?: string;
};

export const TextLink = ({
  disabled = false,
  label,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex
      {...props}
      aria-disabled={disabled ? 'true' : undefined}
      className={classNames(cx.button, cx.container)}
      alignItems="center"
      justifyContent="center"
    >
      <Flex alignItems="center" justifyContent="center">
        <Text.Button
          color="highlight"
          className={classNames(cx.label)}
          weight="$semibold"
        >
          {label}
        </Text.Button>
      </Flex>
    </Flex>
  );
};
