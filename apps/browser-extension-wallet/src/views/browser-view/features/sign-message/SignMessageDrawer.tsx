import React, { useState, useCallback } from 'react';
import { useSignMessageState } from './useSignMessageState';
import { useDrawerConfiguration } from './useDrawerConfiguration';
import { SignMessageResult } from './SignMessageResult';
import { WalletOwnAddressDropdown, Password as PasswordInput, useSecrets } from '@lace/core';
import { TextArea, PostHogAction } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import styles from './SignMessageDrawer.module.scss';

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

  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [shouldShowPasswordPrompt, setShouldShowPasswordPrompt] = useState<boolean>(false);

  const handleSign = useCallback(() => {
    if (!isHardwareWallet && !password.value) {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
      setShouldShowPasswordPrompt(true);
    } else {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction);
      performSigning(selectedAddress, message, password);
    }
  }, [isHardwareWallet, password, analytics, performSigning, selectedAddress, message]);

  useDrawerConfiguration({
    selectedAddress,
    message,
    password,
    isSigningInProgress,
    isHardwareWallet,
    handleSign,
    clearSecrets
  });

  if (signatureObject?.signature) {
    return <SignMessageResult signature={signatureObject.signature} />;
  }

  return (
    <div data-testid="sign-message" className={styles.container}>
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
        {shouldShowPasswordPrompt && !isHardwareWallet && (
          <PasswordInput
            onChange={setPassword}
            label={t('core.signMessage.passwordLabel')}
            dataTestId="sign-message-password-input"
            error={!!error}
            errorMessage={error}
            wrapperClassName={styles.passwordWrapper}
          />
        )}
      </div>
      {error && (
        <div className={styles.errorMessage}>
          <Text.Body.Normal color="error">{error}</Text.Body.Normal>
        </div>
      )}
    </div>
  );
};
