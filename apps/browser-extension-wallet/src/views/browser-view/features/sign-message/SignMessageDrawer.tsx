import React, { useState, useCallback, useEffect } from 'react';
import { useSignMessageState } from './useSignMessageState';
import { useDrawerConfiguration } from './useDrawerConfiguration';
import { WalletOwnAddressDropdown, Password as PasswordInput, useSecrets } from '@lace/core';
import { TextArea, PostHogAction, toast } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import styles from './SignMessageDrawer.module.scss';
import { MainLoader } from '@components/MainLoader';
import { ResultMessage } from '@components/ResultMessage';
import CheckSuccessImg from '@assets/icons/circle-check-gradient.svg';

export const SignMessageDrawer: React.FC = () => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const {
    usedAddresses,
    isSigningInProgress,
    signatureObject,
    error,
    hardwareWalletError,
    isHardwareWallet,
    performSigning
  } = useSignMessageState();
  const { password, setPassword, clearSecrets } = useSecrets();

  const [selectedAddress, setSelectedAddress] = useState('');
  const [message, setMessage] = useState('');
  const [shouldShowPasswordPrompt, setShouldShowPasswordPrompt] = useState(false);

  useEffect(() => {
    if (error) {
      setShouldShowPasswordPrompt(true);
    }
  }, [error]);

  const handleSign = useCallback(() => {
    if (!isHardwareWallet && !password.value) {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
      setShouldShowPasswordPrompt(true);
    } else {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction);
      performSigning(selectedAddress, message, password);
    }
  }, [isHardwareWallet, password, analytics, performSigning, selectedAddress, message]);

  const handleCopy = useCallback(() => {
    toast.notify({
      text: t('general.clipboard.copiedToClipboard'),
      withProgressBar: true
    });
    analytics.sendEventToPostHog(PostHogAction.SignMessageCopySignatureClick);
  }, [analytics, t]);

  useDrawerConfiguration({
    selectedAddress,
    message,
    isSigningInProgress,
    isHardwareWallet,
    error,
    handleSign,
    handleCopy,
    clearSecrets,
    signatureObject
  });

  const renderInitialState = () => (
    <>
      <Text.Body.Large weight="$bold">{t('core.signMessage.instructions')}</Text.Body.Large>
      <Text.Body.Normal className={styles.subtitle}>{t('core.signMessage.subtitle')}</Text.Body.Normal>
      {isHardwareWallet && hardwareWalletError && (
        <div className={styles.errorMessage}>
          <Text.Body.Normal color="error">{hardwareWalletError}</Text.Body.Normal>
        </div>
      )}
      <div className={styles.inputGroup}>
        <Text.Body.Normal weight="$medium">{t('core.signMessage.addressLabel')}</Text.Body.Normal>
        <WalletOwnAddressDropdown
          addresses={usedAddresses}
          onSelect={setSelectedAddress}
          placeholder={t('core.signMessage.selectAddress')}
        />
      </div>
      <div className={styles.inputGroup}>
        <Text.Body.Normal weight="$medium">{t('core.signMessage.messageLabel')}</Text.Body.Normal>
        <TextArea
          placeholder={t('core.signMessage.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          dataTestId="sign-message-input"
          rows={4}
          className={styles.customTextArea}
        />
      </div>
    </>
  );

  const renderPasswordPrompt = () => (
    <>
      <Text.Body.Large weight="$bold">{t('core.signMessage.passwordTitle')}</Text.Body.Large>
      <Text.Body.Normal className={styles.subtitle}>{t('core.signMessage.passwordSubtitle')}</Text.Body.Normal>
      <PasswordInput
        onChange={setPassword}
        label={t('core.signMessage.passwordLabel')}
        dataTestId="sign-message-password-input"
        error={!!error}
        errorMessage={error}
        wrapperClassName={styles.passwordWrapper}
      />
    </>
  );

  const renderSignature = () => (
    <div className={styles.inputGroup}>
      <ResultMessage
        customBgImg={CheckSuccessImg}
        title={t('core.signMessage.successTitle')}
        description={t('core.signMessage.successDescription')}
      />
      <TextArea
        value={signatureObject.signature}
        dataTestId="sign-message-signature"
        rows={4}
        className={styles.customTextArea}
      />
    </div>
  );

  const renderContent = () => {
    if (isSigningInProgress) {
      return <MainLoader />;
    }

    if (signatureObject) {
      return renderSignature();
    }

    if (shouldShowPasswordPrompt) {
      return renderPasswordPrompt();
    }

    return renderInitialState();
  };

  return (
    <div data-testid="sign-message" className={styles.container}>
      {renderContent()}
    </div>
  );
};
