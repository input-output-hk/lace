import React from 'react';
import { OnPasswordChange, Password } from '@lace/core';
import styles from './ConfirmPassword.module.scss';
import { useSubmitingState, usePassword } from '../store';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import cn from 'classnames';

export const ConfirmPassword = (): React.ReactElement => {
  const { isInMemoryWallet, isSharedWallet } = useWalletStore();
  const { t } = useTranslation();

  const { isPasswordValid, setSubmitingTxState } = useSubmitingState();
  const { setPassword } = usePassword();

  const handleChange: OnPasswordChange = (target) => {
    setPassword(target.value);
    setSubmitingTxState({ isPasswordValid: true });
  };

  return (
    (isInMemoryWallet || isSharedWallet) && (
      <div className={cn(styles.container)}>
        <div className={styles.password}>
          <Password
            onChange={handleChange}
            error={!isPasswordValid}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
            placeholder={t('browserView.transaction.send.password.placeholder')}
            autoFocus
          />
        </div>
      </div>
    )
  );
};
