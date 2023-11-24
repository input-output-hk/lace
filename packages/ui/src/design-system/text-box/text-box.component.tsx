import React from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './text-box.css';

export interface TextBoxProps extends Form.FormControlProps {
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
  'data-testid'?: string;
}

export const TextBox = ({
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
  ...rest
}: Readonly<TextBoxProps>): JSX.Element => {
  return (
    <Form.Root>
      <Flex justifyContent="space-between" alignItems="center">
        <Form.Field
          name="field"
          className={cn(cx.container, {
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
              data-testid={rest['data-testid']}
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
