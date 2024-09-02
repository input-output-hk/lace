import React, { useEffect, useState } from 'react';
import styles from './SignMessage.module.scss';
import { useTranslation } from 'react-i18next';
import { WalletOwnAddressDropdown, AddressSchema } from '@lace/core';
import { Drawer, DrawerNavigation, TextArea, Button } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { SignMessagePassword } from '@views/browser/features/sing-message/SignMessagePassword';
import { Password } from '@input-output-hk/lace-ui-toolkit/dist/design-system/password-box/uncontrolled-password-box-input.component';

export type SignMessageProps = {
  addresses: AddressSchema[];
  visible?: boolean;
  onClose: () => void;
  onSign: (address: string, message: string, password: string) => void;
  isSigningInProgress: boolean;
  signedMessage: Cip30DataSignature | null;
  error: string | null;
  hardwareWalletError: string | null;
  isHardwareWallet: boolean;
};

export const SignMessage = ({
  addresses = [],
  visible = true,
  onClose,
  onSign,
  isSigningInProgress,
  signedMessage,
  error,
  hardwareWalletError,
  isHardwareWallet
}: SignMessageProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [shouldShowPasswordPrompt, setShouldShowPasswordPrompt] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (message) {
      setShouldShowPasswordPrompt(true);
    }
  }, [message]);

  const handleSign = () => {
    if (!isHardwareWallet && !password) {
      setShouldShowPasswordPrompt(true);
    } else {
      onSign(selectedAddress, message, password);
    }
  };

  const handlePasswordChange = (event: Readonly<Password>) => {
    setPassword(event.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const footerButtons = (
    <div className={styles.buttonContainer}>
      <Button
        onClick={handleSign}
        disabled={!selectedAddress || !message || isSigningInProgress || (!password && !isHardwareWallet)}
      >
        {isSigningInProgress ? t('core.signMessage.signingInProgress') : t('core.signMessage.signButton')}
      </Button>
      <Button color="secondary" onClick={onClose}>
        {t('core.signMessage.cancelButton')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      popupView={false}
      navigation={
        <DrawerNavigation title={t('core.signMessage.title')} onCloseIconClick={onClose} onArrowIconClick={onClose} />
      }
      footer={!signedMessage && footerButtons}
    >
      <div data-testid="sign-message" className={styles.container}>
        <Text.Body.Large weight="$bold">{t('core.signMessage.instructions')}</Text.Body.Large>
        <Text.Body.Normal className={styles.subtitle}>{t('core.signMessage.subtitle')}</Text.Body.Normal>
        {isHardwareWallet && hardwareWalletError && (
          <div className={styles.hardwareWalletError}>
            <Text.Body.Normal color="error">{hardwareWalletError}</Text.Body.Normal>
          </div>
        )}
        <div className={styles.inputGroup}>
          <Text.Body.Normal weight="$medium">{t('core.signMessage.addressLabel')}</Text.Body.Normal>
          <WalletOwnAddressDropdown
            addresses={addresses}
            onSelect={setSelectedAddress}
            placeholder={t('core.signMessage.selectAddress')}
          />
        </div>
        <div className={styles.inputGroup}>
          {(signedMessage && (
            <div className={styles.signatureContainer}>
              <Text.Body.Normal weight="$medium">{t('core.signMessage.signatureLabel')}</Text.Body.Normal>
              <div className={styles.signatureWrapper}>
                <pre className={styles.signatureContent}>{signedMessage.signature}</pre>
              </div>
            </div>
          )) || (
            <>
              <Text.Body.Normal weight="$medium">{t('core.signMessage.messageLabel')}</Text.Body.Normal>
              <TextArea
                placeholder={t('core.signMessage.messagePlaceholder')}
                value={message}
                onChange={handleMessageChange}
                dataTestId="sign-message-input"
                rows={4}
                className={styles.customTextArea}
              />
              {shouldShowPasswordPrompt && (
                <SignMessagePassword
                  isSigningInProgress={isSigningInProgress}
                  error={error}
                  handlePasswordChange={handlePasswordChange}
                  closeDrawer={() => setShouldShowPasswordPrompt(false)}
                />
              )}
            </>
          )}
        </div>
        {error && (
          <div className={styles.errorMessage}>
            <Text.Body.Normal color="error">{error}</Text.Body.Normal>
          </div>
        )}
      </div>
    </Drawer>
  );
};
