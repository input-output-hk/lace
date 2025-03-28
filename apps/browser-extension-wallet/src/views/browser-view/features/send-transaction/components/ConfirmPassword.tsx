import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OnPasswordChange, Password, useSecrets } from '@lace/core';
import styles from './ConfirmPassword.module.scss';
import { useSubmitingState } from '../store';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import cn from 'classnames';
import { useAutoFocus } from '@lace/common';

const inputId = `id-${uuidv4()}`;

export const ConfirmPassword = (): React.ReactElement => {
  const { isInMemoryWallet, isSharedWallet } = useWalletStore();
  const { t } = useTranslation();

  const { isPasswordValid, setSubmitingTxState } = useSubmitingState();
  const { setPassword } = useSecrets();

  const handleChange: OnPasswordChange = (target) => {
    setPassword(target);
    setSubmitingTxState({ isPasswordValid: true });
  };

  useAutoFocus(inputId, true);

  return (
    (isInMemoryWallet || isSharedWallet) && (
      <div className={cn(styles.container)}>
        <div className={styles.password}>
          <Password
            onChange={handleChange}
            error={!isPasswordValid}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
            label={t('browserView.transaction.send.password.placeholder')}
            id={inputId}
          />
        </div>
      </div>
    )
  );
};
