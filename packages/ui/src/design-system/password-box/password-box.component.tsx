import React from 'react';

import * as Form from '@radix-ui/react-form';

import { PasswordInput } from './password-box-input.component';

import type { PasswordInputProps } from './password-box-input.component';

export interface PasswordBoxProps extends PasswordInputProps {
  rootStyle?: React.CSSProperties;
  onSubmit: (event: Readonly<React.FormEvent>) => void;
}

export const PasswordBox = ({
  rootStyle,
  onSubmit,
  ...props
}: Readonly<PasswordBoxProps>): JSX.Element => {
  return (
    <Form.Root style={rootStyle} onSubmit={onSubmit}>
      <PasswordInput {...props} />
    </Form.Root>
  );
};
