import cn from 'classnames';
import React from 'react';
import { Password } from '@lace/common';
import styles from './styles.module.scss';

export interface WalletPasswordConfirmationInputProps {
  id: string;
  label: string;
  isVisible: boolean;
  shouldShowErrorMessage?: boolean;
  errorMessage?: string;
  onChange?: () => void;
}

export const WalletPasswordConfirmationInput = ({
  id,
  label,
  isVisible,
  shouldShowErrorMessage,
  errorMessage
}: WalletPasswordConfirmationInputProps): React.ReactElement => (
  <div
    className={cn(styles.passwordConfirmationContainerHidden, {
      [styles.passwordConfirmationContainerVissible]: isVisible
    })}
  >
    <Password id={id} label={label} data-testid="wallet-password-confirmation-input" />
    {shouldShowErrorMessage && (
      <p
        className={cn(styles.paragraph, { [styles.error]: shouldShowErrorMessage })}
        data-testid="wallet-password-confirmation-input-error"
      >
        {errorMessage}
      </p>
    )}
  </div>
);
