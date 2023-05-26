import React from 'react';

import { ReactComponent as CloseIcon } from '../../assets/icons/close.component.svg';

import * as cx from './close-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
  // Needed for @storybook/addon-docs
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
};

export const Close = ({ ...props }: Readonly<Props>): JSX.Element => {
  return (
    <NavigationSkeletonButton {...props}>
      <CloseIcon className={cx.icon} />
    </NavigationSkeletonButton>
  );
};
