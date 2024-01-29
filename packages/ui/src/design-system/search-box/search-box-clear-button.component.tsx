import React, { forwardRef } from 'react';
import type { MouseEvent, Ref } from 'react';

import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';
import classNames from 'classnames';

import * as cx from './search-box-clear-button.css';

import type { OmitClassName } from '../../types';

type Props = Omit<OmitClassName<'button'>, 'onChange'> & {
  onClick?: (event: Readonly<MouseEvent<HTMLButtonElement>>) => void;
  id?: string;
  disabled?: boolean;
  active?: boolean;
};

const PureClearButton = (
  { onClick, id, disabled, active, ...props }: Readonly<Props>,
  ref: Ref<HTMLButtonElement>,
): JSX.Element => (
  <div className={cx.container}>
    <button
      {...props}
      onClick={onClick}
      className={classNames(cx.button, {
        [cx.active]: active,
      })}
      id={id}
      disabled={disabled}
      ref={ref}
    >
      <CloseIcon />
    </button>
  </div>
);

export const ClearButton = forwardRef(PureClearButton);
