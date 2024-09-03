import React, { useEffect, useState } from 'react';
import styles from './SignMessage.module.scss';
import { useTranslation } from 'react-i18next';
import { WalletOwnAddressDropdown, AddressSchema } from '@lace/core';
import { Drawer, DrawerNavigation, TextArea, Button, toast, PostHogAction } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { SignMessagePassword } from '@views/browser/features/sing-message/SignMessagePassword';
import { Password } from '@input-output-hk/lace-ui-toolkit/dist/design-system/password-box/uncontrolled-password-box-input.component';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useAnalyticsContext } from '@providers';

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
  const analytics = useAnalyticsContext();

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
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
      setShouldShowPasswordPrompt(true);
    } else {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction);
      onSign(selectedAddress, message, password);
    }
  };

  const handlePasswordChange = (event: Readonly<Password>) => {
    setPassword(event.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const getActionButton = () =>
    signedMessage?.signature ? (
      <CopyToClipboard text={signedMessage?.signature}>
        <Button
          onClick={(e: React.MouseEvent<HTMLOrSVGElement>) => {
            e.stopPropagation();
            toast.notify({
              text: t('general.clipboard.copiedToClipboard'),
              withProgressBar: true
            });
            analytics.sendEventToPostHog(PostHogAction.SignMessageCopySignatureClick);
          }}
          disabled={!selectedAddress || !message || isSigningInProgress || (!password && !isHardwareWallet)}
        >
          {t('core.signMessage.copyToClipboard')}
        </Button>
      </CopyToClipboard>
    ) : (
      <Button
        onClick={handleSign}
        disabled={!selectedAddress || !message || isSigningInProgress || (!password && !isHardwareWallet)}
      >
        {isSigningInProgress ? t('core.signMessage.signingInProgress') : t('core.signMessage.signButton')}
      </Button>
    );

  const getHeader = () => {
    if (signedMessage?.signature) {
      return (
        <>
          <Text.Body.Large weight="$bold">{t('core.signMessage.successTitle')}</Text.Body.Large>
          <Text.Body.Small className={styles.subtitle}>{t('core.signMessage.successDescription')}</Text.Body.Small>
        </>
      );
    }
    return (
      <>
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
      </>
    );
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      popupView={false}
      navigation={
        <DrawerNavigation title={t('core.signMessage.title')} onCloseIconClick={onClose} onArrowIconClick={onClose} />
      }
    >
      <div data-testid="sign-message" className={styles.container}>
        {getHeader()}
        <div className={styles.inputGroup}>
          <Text.Body.Normal weight="$medium">
            {signedMessage ? t('core.signMessage.signatureLabel') : t('core.signMessage.messageLabel')}
          </Text.Body.Normal>
          <TextArea
            placeholder={t('core.signMessage.messagePlaceholder')}
            value={signedMessage?.signature || message}
            onChange={handleMessageChange}
            dataTestId="sign-message-input"
            rows={4}
            className={styles.customTextArea}
          />
          {shouldShowPasswordPrompt && !signedMessage && (
            <SignMessagePassword
              isSigningInProgress={isSigningInProgress}
              error={error}
              handlePasswordChange={handlePasswordChange}
              closeDrawer={() => setShouldShowPasswordPrompt(false)}
            />
          )}
        </div>
        {error && (
          <div className={styles.errorMessage}>
            <Text.Body.Normal color="error">{error}</Text.Body.Normal>
          </div>
        )}

        <div className={styles.buttonContainer}>
          {getActionButton()}
          <Button color="secondary" onClick={onClose}>
            {t('core.signMessage.closeButton')}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
