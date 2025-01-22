import React, { FormEvent } from 'react';
import {
  OnPasswordChange,
  UncontrolledPasswordBox,
  UncontrolledPasswordBoxProps
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

const mapProps = (props: PasswordProps): UncontrolledPasswordBoxProps => ({
  ...props,
  testId: props['data-testid'] || props.dataTestId,
  label: props.label || '',
  size: undefined,
  prefix: undefined,
  onSubmit: (event: FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    props.onSubmit?.(event);
  },
  containerClassName: props.wrapperClassName,
  errorMessage: props.error ? props.errorMessage : undefined
});

export const Password = ({
  errorMessage = '',
  dataTestId = 'password-input',
  autoFocus = false,
  ...rest
}: PasswordProps): React.ReactElement => (
  <UncontrolledPasswordBox {...mapProps({ ...rest, dataTestId, errorMessage, autoFocus })} />
);
