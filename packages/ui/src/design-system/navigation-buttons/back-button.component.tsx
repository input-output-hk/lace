import React from 'react';

import { ReactComponent as ArrowLeftIcon } from '../../assets/icons/arrow-left.component.svg';

import * as cx from './back-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
  // Needed for @storybook/addon-docs
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
};

export const Back = ({ ...props }: Readonly<Props>): JSX.Element => {
  return (
    <NavigationSkeletonButton {...props}>
      <ArrowLeftIcon className={cx.icon} />
    </NavigationSkeletonButton>
  );
};
