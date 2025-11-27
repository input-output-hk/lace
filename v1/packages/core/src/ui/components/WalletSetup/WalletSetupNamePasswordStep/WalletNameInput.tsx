import cn from 'classnames';
import React from 'react';
import { Input, inputProps } from '@lace/common';
import styles from './styles.module.scss';
import { WALLET_NAME_INPUT_MAX_LENGTH } from './utils';

export interface WalletNameInputProps {
  value: string;
  onChange: inputProps['onChange'];
  label: string;
  shouldShowErrorMessage?: boolean;
  errorMessage?: string;
  maxLength: number;
}

export const WalletNameInput = ({
  value,
  label,
  shouldShowErrorMessage,
  errorMessage,
  onChange,
  maxLength = WALLET_NAME_INPUT_MAX_LENGTH
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
        className={cn(styles.paragraph, { [styles.error]: shouldShowErrorMessage })}
        data-testid="wallet-name-input-error"
      >
        {errorMessage}
      </p>
    )}
  </div>
);
