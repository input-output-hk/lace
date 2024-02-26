import React from 'react';

import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';

import * as cx from './auto-suggest-box-button.css';

interface Props {
  disabled: boolean;
  onClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
}

export const CloseButton = ({
  disabled,
  onClick,
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      data-testid="auto-suggest-box-button-close"
      className={cx.button}
      onClick={onClick}
      disabled={disabled}
    >
      <CloseIcon className={cx.icon} />
    </button>
  );
};
