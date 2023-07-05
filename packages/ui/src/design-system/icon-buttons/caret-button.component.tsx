import React from 'react';

import { ReactComponent as CaretIcon } from '../../assets/icons/caret.component.svg';

import * as cx from './caret-button.css';

import type { OmitClassName } from '../../types';

type Props = Omit<OmitClassName<'button'>, 'children'>;

export const Caret = ({
  id,
  disabled,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <button {...props} id={id} disabled={disabled} className={cx.container}>
      <CaretIcon />
    </button>
  );
};
