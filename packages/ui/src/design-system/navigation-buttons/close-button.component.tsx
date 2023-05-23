import React from 'react';

import { ReactComponent as CloseIcon } from '../../assets/icons/close.component.svg';

import * as cx from './close-button.css';
import { NavigationSkeletonButton } from './navigation-skeleton-button.component';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
  onClose?: () => void;
};

export const Close = ({
  onClose,
  onClick,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <NavigationSkeletonButton
      {...props}
      onClick={(event): void => {
        onClose?.();
        onClick?.(event);
      }}
    >
      <CloseIcon className={cx.icon} />
    </NavigationSkeletonButton>
  );
};
