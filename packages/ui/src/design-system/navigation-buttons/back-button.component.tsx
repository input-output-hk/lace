import React from 'react';

import { ReactComponent as ArrowLeftIcon } from '../../assets/icons/arrow-left.component.svg';

import * as cx from './back-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
  onGoBack?: () => void;
};

export const Back = ({
  onGoBack,
  onClick,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <NavigationSkeletonButton
      {...props}
      onClick={(event): void => {
        onGoBack?.();
        onClick?.(event);
      }}
    >
      <ArrowLeftIcon className={cx.icon} />
    </NavigationSkeletonButton>
  );
};
