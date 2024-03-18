import React from 'react';

import * as Form from '@radix-ui/react-form';
import cn from 'classnames';

import { sx } from '../../design-tokens';
import { Flex } from '../flex';
import * as Typography from '../typography';

import * as cx from './text-box.css';

import type { Sx } from '../../design-tokens';

export interface TextBoxProps extends Form.FormControlProps {
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  errorMessage?: string;
  onChange?: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  maxLength?: number;
  'data-testid'?: string;
  w?: Sx['w'];
}

export const TextBox = ({
  required = false,
  disabled = false,
  id,
  label,
  name,
  defaultValue,
  value,
  errorMessage = '',
  containerClassName = '',
  onChange,
  containerStyle,
  maxLength,
  w = '$auto',
  ...rest
}: Readonly<TextBoxProps>): JSX.Element => (
  <Form.Root>
    <Flex justifyContent="space-between" alignItems="center">
      <Form.Field
        name="field"
        className={cn(sx({ w }), cx.container, containerClassName)}
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
            defaultValue={defaultValue}
            value={value}
            onChange={onChange}
            id={id}
            maxLength={maxLength}
            data-testid={rest['data-testid']}
          />
        </Form.Control>
        <Form.Label className={cn(cx.label)}>{label}</Form.Label>
      </Form.Field>
    </Flex>
    {errorMessage && (
      <Typography.Label color="error" className={cx.errorMessage}>
        {errorMessage}
      </Typography.Label>
    )}
  </Form.Root>
);
