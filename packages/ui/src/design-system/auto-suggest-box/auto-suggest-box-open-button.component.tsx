import React from 'react';

import { ReactComponent as BookIcon } from '@lace/icons/dist/BookComponent';

import * as cx from './auto-suggest-box-button.css';

interface Props {
  disabled: boolean;
  onClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
}

export const OpenButton = ({
  disabled,
  onClick,
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      data-testid="auto-suggest-box-button-open"
      className={cx.button}
      onClick={onClick}
      disabled={disabled}
    >
      <BookIcon className={cx.icon} />
    </button>
  );
};
