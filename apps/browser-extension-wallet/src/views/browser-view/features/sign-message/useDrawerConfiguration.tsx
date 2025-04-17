import React, { useEffect, useCallback } from 'react';
import { useDrawer } from '@views/browser/stores';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, Button, useKeyboardShortcut } from '@lace/common';
import styles from './SignMessageDrawer.module.scss';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';

interface UseDrawerConfigurationProps {
  selectedAddress: string;
  message: string;
  isSigningInProgress: boolean;
  isHardwareWallet: boolean;
  error: string;
  handleSign: () => void;
  clearSecrets: () => void;
  signatureObject: Cip30DataSignature | undefined;
  goBack: () => void;
  signAnotherMessage: () => void;
}

export const useDrawerConfiguration = ({
  selectedAddress,
  message,
  isSigningInProgress,
  isHardwareWallet,
  handleSign,
  error,
  clearSecrets,
  signatureObject,
  goBack,
  signAnotherMessage
}: UseDrawerConfigurationProps): void => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();
  const [, closeDrawer] = useDrawer();

  const getActionButtonLabel = useCallback(() => {
    if (isSigningInProgress) return t('core.signMessage.signingInProgress');
    else if (isHardwareWallet) {
      return error ? t('core.signMessage.back') : t('core.signMessage.signWithHardwareWalletButton');
    }
    return t('core.signMessage.signButton');
  }, [isSigningInProgress, t, isHardwareWallet, error]);

  const manageSign = useCallback(() => {
    isHardwareWallet && error ? goBack() : handleSign();
  }, [isHardwareWallet, error, goBack, handleSign]);

  const getActionButton = useCallback(() => {
    if (signatureObject?.signature && !error) {
      return (
        <Button onClick={signAnotherMessage} data-testid={'copy-button'}>
          {t('core.signMessage.signAnotherMessage')}
        </Button>
      );
    }
    return (
      <Button
        onClick={manageSign}
        disabled={!selectedAddress || !message || isSigningInProgress}
        data-testid={'sign-message-button'}
      >
        {getActionButtonLabel()}
      </Button>
    );
  }, [
    signatureObject?.signature,
    error,
    manageSign,
    selectedAddress,
    message,
    isSigningInProgress,
    getActionButtonLabel,
    signAnotherMessage,
    t
  ]);

  useKeyboardShortcut(['Escape'], () => closeDrawer());
  useKeyboardShortcut(['Enter'], () => handleSign());

  const renderFooter = useCallback(
    () => (
      <div className={styles.buttonContainer}>
        {getActionButton()}
        <Button
          color="secondary"
          onClick={() => {
            closeDrawer();
            clearSecrets();
          }}
          data-testid={'close-button'}
        >
          {error && isHardwareWallet ? t('core.signMessage.cancelButton') : t('core.signMessage.closeButton')}
        </Button>
      </div>
    ),
    [getActionButton, error, isHardwareWallet, t, closeDrawer, clearSecrets]
  );

  useEffect(() => {
    setDrawerConfig({
      content: DrawerContent.SIGN_MESSAGE,
      renderHeader: () => (
        <DrawerNavigation
          title={t('core.signMessage.title')}
          onCloseIconClick={() => {
            closeDrawer();
            clearSecrets();
          }}
        />
      ),
      renderFooter
    });
  }, [setDrawerConfig, closeDrawer, t, renderFooter, clearSecrets]);
};
