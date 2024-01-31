import React from 'react';

import { ReactComponent as BookIcon } from '@lace/icons/dist/BookComponent';
import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';

import * as cx from './auto-suggest-box-button.css';
import { useAutoSuggestBoxContext } from './auto-suggest-box.provider';

interface Props {
  disabled: boolean;
}

export const Button = ({ disabled }: Readonly<Props>): JSX.Element => {
  const { isSuggesting, setIsSuggesting } = useAutoSuggestBoxContext();
  const Icon = isSuggesting ? CloseIcon : BookIcon;
  return (
    <button
      className={cx.button}
      onClick={(event): void => {
        event.preventDefault();
        setIsSuggesting(!isSuggesting);
      }}
      disabled={disabled}
    >
      <Icon className={cx.icon} />
    </button>
  );
};
