import React, { useState, useCallback } from 'react';
import { WalletOwnAddressDropdown, Password as PasswordInput, useSecrets } from '@lace/core';
import { TextArea, Button, PostHogAction } from '@lace/common';
import { Password, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import styles from './SignMessageDrawer.module.scss';

export const SignMessageForm: React.FC<{
  usedAddresses: { address: string; id: number }[];
  isSigningInProgress: boolean;
  error: string;
  hardwareWalletError: string;
  isHardwareWallet: boolean;
  performSigning: (address: string, message: string, password: Partial<Password>) => void;
}> = ({ usedAddresses, isSigningInProgress, error, hardwareWalletError, isHardwareWallet, performSigning }) => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { password, setPassword } = useSecrets();
  const [shouldShowPasswordPrompt, setShouldShowPasswordPrompt] = useState<boolean>(false);

  const handleSign = useCallback(() => {
    if (!isHardwareWallet && !password) {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
      setShouldShowPasswordPrompt(true);
    } else {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction);
      performSigning(selectedAddress, message, password);
    }
  }, [isHardwareWallet, password, analytics, performSigning, selectedAddress, message]);

  const getActionButtonLabel = useCallback(() => {
    if (isSigningInProgress) return t('core.signMessage.signingInProgress');
    else if (isHardwareWallet) {
      return t('core.signMessage.signWithHardwareWalletButton');
    }
    return t('core.signMessage.signButton');
  }, [isSigningInProgress, isHardwareWallet, t]);

  return (
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
          onSelect={(address) => setSelectedAddress(address)}
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
            onChange={(event) => setPassword(event)}
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
      <Button
        onClick={handleSign}
        disabled={!selectedAddress || !message || isSigningInProgress || (!password && !isHardwareWallet)}
        className={styles.buttonContainer}
      >
        {getActionButtonLabel()}
      </Button>
    </>
  );
};
