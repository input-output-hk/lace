import React from 'react';

import { ReactComponent as CloseIcon } from '@lace/icons/dist/CloseComponent';
import classNames from 'classnames';

import * as cx from './remove-button.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<'button'> & {
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
