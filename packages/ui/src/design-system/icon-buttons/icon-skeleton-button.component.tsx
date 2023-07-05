import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import classNames from 'classnames';

import { Flex } from '../flex';

import * as cx from './icon-skeleton-button.css';

export type Props = ComponentPropsWithoutRef<'button'>;

export const NavigationSkeletonButton = ({
  id,
  disabled,
  children,
  className,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      {...props}
      id={id}
      disabled={disabled}
      className={classNames(cx.button, cx.container, className)}
    >
      <Flex w="$24" h="$24" alignItems="center" justifyContent="center">
        {children}
      </Flex>
    </button>
  );
};
