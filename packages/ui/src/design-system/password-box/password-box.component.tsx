import React from 'react';

import * as Form from '@radix-ui/react-form';

import { PasswordInput } from './password-box-input.component';

import type { PasswordInputProps } from './password-box-input.component';

export interface PasswordBoxProps extends PasswordInputProps {
  rootStyle?: React.CSSProperties;
}

export const PasswordBox = ({
  rootStyle,
  ...props
}: Readonly<PasswordBoxProps>): JSX.Element => {
  return (
    <Form.Root style={rootStyle}>
      <PasswordInput {...props} />
    </Form.Root>
  );
};
