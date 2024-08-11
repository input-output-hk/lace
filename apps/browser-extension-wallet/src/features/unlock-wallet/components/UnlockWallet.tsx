import React from 'react';
import { ContentLayout } from '@components/Layout';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import { Button } from '@lace/common';
import { Password, PasswordProps } from '@lace/core';
import styles from './UnlockWallet.module.scss';
import { useTranslation } from 'react-i18next';
import { ForgotPassword } from './ForgotPassword';

interface PasswordInput {
  handleChange?: PasswordProps['onChange'];
  invalidPass?: PasswordProps['error'];
}

export interface UnlockWalletProps {
  onUnlock: () => void;
  onForgotPasswordClick?: () => void;
  passwordInput: PasswordInput;
  isLoading?: boolean;
  unlockButtonDisabled?: boolean;
  showForgotPassword?: boolean;
}

export const UnlockWallet = ({
  onUnlock,
  onForgotPasswordClick,
  passwordInput,
  unlockButtonDisabled,
  showForgotPassword = true
}: UnlockWalletProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <ContentLayout>
      <form onSubmit={onUnlock} className={styles.lockWalletContent}>
        <div className={styles.content} data-testid="unlock-screen">
          <img src={laceLogoMark} alt="LACE" className={styles.image} data-testid="unlock-screen-img" />
          <h1 className={styles.title} data-testid="unlock-screen-title">
            {t('unlock.sectionTitle')}
          </h1>
          <Password
            errorMessage={t('general.errors.invalidPassword')}
            error={passwordInput.invalidPass}
            onChange={passwordInput.handleChange}
            onPressEnter={(e) => {
              e.preventDefault();
              onUnlock();
            }}
            label={t('unlock.input.placeholder')}
          />
        </div>
        <div className={styles.blockButton}>
          <Button color="gradient" onClick={onUnlock} disabled={unlockButtonDisabled} data-testid="unlock-button">
            {t('unlock.button')}
          </Button>
        </div>
        {showForgotPassword && <ForgotPassword onForgotPasswordClick={onForgotPasswordClick} />}
      </form>
    </ContentLayout>
  );
};
