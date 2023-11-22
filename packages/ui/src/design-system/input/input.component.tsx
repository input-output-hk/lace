import React from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './input.css';

export interface InputProps extends Form.FormControlProps {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  value: string;
  errorMessage?: string;
  onChange?: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const Input = ({
  required = false,
  disabled = false,
  id,
  label,
  name,
  value,
  errorMessage = '',
  containerClassName = '',
  onChange,
  containerStyle,
}: Readonly<InputProps>): JSX.Element => {
  return (
    <Form.Root>
      <Flex justifyContent="space-between" alignItems="center">
        <Form.Field
          name="field"
          className={cn(cx.container, {
            [cx.disabledContainer]: disabled,
            [containerClassName]: containerClassName,
          })}
          style={containerStyle}
        >
          <Form.Control asChild>
            <input
              type="text"
              required={required}
              placeholder=""
              className={cx.input}
              disabled={disabled}
              name={name}
              value={value}
              onChange={onChange}
              id={id}
            />
          </Form.Control>
          <Form.Label
            className={cn(cx.label, { [cx.disabledLabel]: disabled })}
          >
            {label}
          </Form.Label>
        </Form.Field>
      </Flex>
      {errorMessage && (
        <Typography.Label className={cx.errorMessage}>
          {errorMessage}
        </Typography.Label>
      )}
    </Form.Root>
  );
};
