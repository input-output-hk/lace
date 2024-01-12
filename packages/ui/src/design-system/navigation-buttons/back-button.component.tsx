import React from 'react';

import { ReactComponent as ArrowLeftIcon } from '@lace/icons/dist/ArrowLeftComponent';

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
