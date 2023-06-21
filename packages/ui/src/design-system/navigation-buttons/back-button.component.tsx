import React from 'react';

import { ReactComponent as ArrowLeftIcon } from '../../assets/icons/arrow-left.component.svg';

import * as cx from './back-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { Props as SkeletonButtonProps } from './navigation-skeleton-button.component';

type Props = Omit<SkeletonButtonProps, 'children'> & {
  disabled?: boolean;
  // Needed for @storybook/addon-docs
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export const Back = ({ ...props }: Readonly<Props>): JSX.Element => (
  <NavigationSkeletonButton {...props}>
    <ArrowLeftIcon className={cx.icon} />
  </NavigationSkeletonButton>
);
