import React from 'react';

import classNames from 'classnames';

import { ReactComponent as CloseIcon } from '../../assets/icons/close.component.svg';

import * as cx from './remove-button.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<HTMLButtonElement> & {
  disabled?: boolean;
};

export const RemoveButton = ({
  disabled,
  ...props
}: Readonly<Props>): JSX.Element => (
  <button
    {...props}
    disabled={disabled}
    className={classNames(cx.container, cx.button)}
  >
    <CloseIcon className={cx.icon} />
  </button>
);
