import React from 'react';

import { ReactComponent as BookIcon } from '@lace/icons/dist/BookComponent';
import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';

import * as cx from './auto-suggest-box-button.css';
import { useAutoSuggestBoxContext } from './auto-suggest-box.provider';

interface Props {
  disabled: boolean;
}

export const Button = ({ disabled }: Readonly<Props>): JSX.Element => {
  const { value, setValue, isSuggesting, setIsSuggesting } =
    useAutoSuggestBoxContext();
  const isCloseButton = isSuggesting || Boolean(value);
  const Icon = isCloseButton ? CloseIcon : BookIcon;
  return (
    <button
      className={cx.button}
      onClick={(event): void => {
        event.preventDefault();
        if (isCloseButton) {
          setValue('');
        }
        setIsSuggesting(!isCloseButton);
      }}
      disabled={disabled}
    >
      <Icon className={cx.icon} />
    </button>
  );
};
