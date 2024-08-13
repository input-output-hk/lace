import cn from 'classnames';
import React from 'react';
import { Password, PasswordProps } from '@ui/components/Password';
import styles from './styles.module.scss';

export interface WalletPasswordConfirmationInputProps {
  label: string;
  isVisible: boolean;
  shouldShowErrorMessage?: boolean;
  errorMessage?: string;
  onChange: PasswordProps['onChange'];
}

export const WalletPasswordConfirmationInput = ({
  label,
  isVisible,
  onChange,
  shouldShowErrorMessage,
  errorMessage
}: WalletPasswordConfirmationInputProps): React.ReactElement => (
  <div
    className={cn(styles.passwordConfirmationContainerHidden, {
      [styles.passwordConfirmationContainerVissible]: isVisible
    })}
  >
    <Password
      className={styles.input}
      label={label}
      onChange={onChange}
      data-testid="wallet-password-confirmation-input"
      errorMessage={errorMessage}
      error={shouldShowErrorMessage}
    />
  </div>
);
