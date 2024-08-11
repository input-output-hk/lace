import React from 'react';
import {
  UncontrolledPasswordBox,
  UncontrolledPasswordBoxProps,
  OnPasswordChange
} from '@input-output-hk/lace-ui-toolkit';
import { inputProps } from '@lace/common';

export type PasswordProps = {
  error?: boolean;
  autoFocus?: boolean;
  errorMessage?: string;
  wrapperClassName?: string;
  label?: string;
  dataTestId?: string;
  onChange: OnPasswordChange;
} & Omit<inputProps, 'onChange' | 'value'>;

const noop = (): void => void 0;
const mapProps = (props: PasswordProps): UncontrolledPasswordBoxProps => ({
  ...props,
  // TODO: map all props; some might have different names
  testId: props.dataTestId,
  label: props.label || '',
  size: undefined,
  prefix: undefined,
  onSubmit: props.onSubmit || noop
});

export const Password = ({
  errorMessage = 'invalid password',
  dataTestId = 'password-input',
  autoFocus = false,
  ...rest
}: PasswordProps): React.ReactElement => (
  <UncontrolledPasswordBox {...mapProps({ ...rest, dataTestId, errorMessage, autoFocus })} />
);
