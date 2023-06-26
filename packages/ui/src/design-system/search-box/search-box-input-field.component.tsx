import type { Ref } from 'react';
import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './search-box-input-field.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'input'> & {
  onClear?: () => void;
  active?: boolean;
};

const PureInputField = (
  { active, ...props }: Readonly<Props>,
  ref: Ref<HTMLInputElement>,
): JSX.Element => (
  <div className={cx.container}>
    <input
      {...props}
      className={classNames(cx.input, {
        [cx.active]: active,
      })}
      ref={ref}
    />
  </div>
);

export const InputField = forwardRef<HTMLInputElement, Props>(PureInputField);
