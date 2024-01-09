import React from 'react';

import cn from 'classnames';

import { ReactComponent as CaretIcon } from '../../assets/icons/caret.component.svg';

import * as cx from './caret-button.css';

import type { OmitClassName } from '../../types';

type Props = Omit<OmitClassName<'button'>, 'children'> & {
  direction?: 'asc' | 'desc';
};

export const Caret = ({
  id,
  direction = 'asc',
  disabled,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button
      {...props}
      id={id}
      disabled={disabled}
      className={cn(cx.container, cx[direction])}
    >
      <CaretIcon />
    </button>
  );
};
