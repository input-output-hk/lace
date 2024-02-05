import React from 'react';

import cn from 'classnames';

import { Flex } from '../flex';

import * as cx from './auto-suggest-box-input.css';

export interface Props {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  value: string;
  onChange: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
}

export const Input = ({
  required = false,
  disabled = false,
  label,
  name,
  id,
  value,
  onChange,
}: Readonly<Props>): JSX.Element => {
  return (
    <Flex justifyContent="space-between" alignItems="center">
      <input
        data-testid="auto-suggest-box-input"
        id={id}
        type="text"
        required={required}
        className={cx.input}
        disabled={disabled}
        name={name}
        value={value}
        onChange={onChange}
      />
      <span className={cn(cx.label)}>{label}</span>
    </Flex>
  );
};
