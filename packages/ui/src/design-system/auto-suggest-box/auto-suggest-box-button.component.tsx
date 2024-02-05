import React from 'react';

import { ReactComponent as BookIcon } from '@lace/icons/dist/BookComponent';
import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';

import * as cx from './auto-suggest-box-button.css';

interface Props {
  disabled: boolean;
  isCloseButton: boolean;
  onButtonClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
}

export const Button = ({
  disabled,
  isCloseButton,
  onButtonClick,
}: Readonly<Props>): JSX.Element => {
  const Icon = isCloseButton ? CloseIcon : BookIcon;
  return (
    <button
      data-testid={`auto-suggest-box-button-${
        isCloseButton ? 'close' : 'open'
      }`}
      className={cx.button}
      onClick={onButtonClick}
      disabled={disabled}
    >
      <Icon className={cx.icon} />
    </button>
  );
};
