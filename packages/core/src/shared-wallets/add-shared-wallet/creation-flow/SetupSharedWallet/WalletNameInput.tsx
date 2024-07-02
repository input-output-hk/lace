import { Input, inputProps } from '@lace/common';
import cn from 'classnames';
import React from 'react';
import styles from './WalletNameInput.module.scss';

export interface WalletNameInputProps {
  errorMessage?: string;
  label: string;
  maxLength: number;
  onChange: inputProps['onChange'];
  shouldShowErrorMessage?: boolean;
  value: string;
}

export const WalletNameInput = ({
  value,
  label,
  shouldShowErrorMessage,
  errorMessage,
  onChange,
  maxLength,
}: WalletNameInputProps): React.ReactElement => (
  <div className={styles.walletNameInputContainer}>
    <Input
      dataTestId="wallet-name-input"
      value={value}
      label={label}
      onChange={onChange}
      maxLength={maxLength}
      className={styles.paddingLeft}
      autoFocus
    />
    {shouldShowErrorMessage && (
      <p
        className={cn(styles.paragraph, { [`${styles.error}`]: shouldShowErrorMessage })}
        data-testid="wallet-name-input-error"
      >
        {errorMessage}
      </p>
    )}
  </div>
);
