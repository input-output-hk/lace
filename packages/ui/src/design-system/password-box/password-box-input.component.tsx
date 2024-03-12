import React, { useState } from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { Flex } from '../flex';
import * as Typography from '../typography';

import { PasswordInputButton } from './password-box-button.component';
import * as cx from './password-box-input.css';

export interface PasswordInputProps extends Form.FormControlProps {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  value: string;
  errorMessage?: string;
  onChange?: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  defaultIsPasswordVisible?: boolean;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const PasswordInput = ({
  required = false,
  disabled = false,
  id,
  label,
  name,
  value,
  errorMessage = '',
  containerClassName = '',
  onChange,
  defaultIsPasswordVisible = false,
  containerStyle,
}: Readonly<PasswordInputProps>): JSX.Element => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(
    defaultIsPasswordVisible,
  );

  return (
    <div className={cx.root}>
      <Form.Field
        name="field"
        className={cn(cx.container, {
          [cx.disabledContainer]: disabled,
          [containerClassName]: containerClassName,
        })}
        style={containerStyle}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Form.Control asChild>
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              required={required}
              placeholder=""
              className={cn(cx.input, { [cx.largeDots]: !isPasswordVisible })}
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
          <PasswordInputButton
            onClick={(event): void => {
              event.preventDefault();
              setIsPasswordVisible(!isPasswordVisible);
            }}
            disabled={disabled}
            isPasswordVisible={isPasswordVisible}
          />
        </Flex>
      </Form.Field>
      {errorMessage && (
        <Typography.Label className={cx.errorMessage}>
          {errorMessage}
        </Typography.Label>
      )}
    </div>
  );
};
