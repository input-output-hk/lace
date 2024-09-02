import React from 'react';
import { useTranslation } from 'react-i18next';
import { Password } from '@lace/core';
import styles from './SignMessagePassword.module.scss';
import { OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';

export type SignMessagePasswordProps = {
  isSigningInProgress: boolean;
  error: string;
  handlePasswordChange: OnPasswordChange;
  closeDrawer: () => void;
};

export const SignMessagePassword = ({ error, handlePasswordChange }: SignMessagePasswordProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Password
      onChange={handlePasswordChange}
      label={t('core.signMessage.passwordLabel')}
      dataTestId="sign-message-password-input"
      error={!!error}
      errorMessage={error}
      wrapperClassName={styles.passwordWrapper}
    />
  );
};
