import React from 'react';

import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';

import * as cx from './close-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { Props as SkeletonButtonProps } from './navigation-skeleton-button.component';

type Props = Omit<SkeletonButtonProps, 'children'> & {
  disabled?: boolean;
  // Needed for @storybook/addon-docs
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
};

export const Close = ({ ...props }: Readonly<Props>): JSX.Element => (
  <NavigationSkeletonButton {...props}>
    <CloseIcon className={cx.icon} />
  </NavigationSkeletonButton>
);
