import type { ReactNode } from 'react';
import React from 'react';

import { Flex } from '../flex';

import * as cx from './navigation-skeleton-button.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
  children: ReactNode;
};

export const NavigationSkeletonButton = ({
  id,
  disabled,
  children,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button {...props} id={id} disabled={disabled} className={cx.container}>
      <Flex w="$24" h="$24" alignItems="center" justifyContent="center">
        {children}
      </Flex>
    </button>
  );
};
