import React from 'react';
import { useTranslation } from 'react-i18next';
import { SignMessage, Password } from '@lace/core';
import { useSignMessageState } from './useSignMessageState';
import styles from './SignMessageDrawer.module.scss';

export const SignMessageDrawer: React.FC = () => {
  const { t } = useTranslation();
  const {
    usedAddresses,
    handleSignData,
    isSigningInProgress,
    signature,
    error,
    hardwareWalletError,
    isHardwareWallet,
    showPasswordPrompt,
    handlePasswordChange,
    handlePasswordSubmit,
    closeDrawer
  } = useSignMessageState();

  const renderPasswordPrompt = () => (
    <div className={styles.passwordContainer}>
      <h2 className={styles.title}>{t('core.signMessage.enterPasswordTitle')}</h2>
      <p className={styles.subtitle}>{t('core.signMessage.enterPasswordSubtitle')}</p>
      <Password
        onChange={handlePasswordChange}
        label={t('core.signMessage.passwordLabel')}
        dataTestId="sign-message-password-input"
        error={!!error}
        errorMessage={error}
        wrapperClassName={styles.passwordWrapper}
      />
      <div className={styles.buttonContainer}>
        <button onClick={handlePasswordSubmit} className={styles.confirmButton} disabled={isSigningInProgress}>
          {t('core.signMessage.signButton')}
        </button>
        <button onClick={closeDrawer} className={styles.cancelButton}>
          {t('core.signMessage.cancelButton')}
        </button>
      </div>
    </div>
  );

  const renderSignMessage = () => (
    <SignMessage
      addresses={usedAddresses}
      onClose={closeDrawer}
      onSign={handleSignData}
      isSigningInProgress={isSigningInProgress}
      signature={signature}
      error={error}
      hardwareWalletError={hardwareWalletError}
      isHardwareWallet={isHardwareWallet}
    />
  );

  return <>{!isHardwareWallet && showPasswordPrompt ? renderPasswordPrompt() : renderSignMessage()}</>;
};
