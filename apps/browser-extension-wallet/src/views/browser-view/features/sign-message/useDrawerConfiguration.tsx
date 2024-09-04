import React, { useEffect, useCallback } from 'react';
import { useDrawer } from '@views/browser/stores';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, Button } from '@lace/common';
import CopyToClipboard from 'react-copy-to-clipboard';
import styles from './SignMessageDrawer.module.scss';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import CopyToClipboardImg from '@assets/icons/copy.component.svg';

interface UseDrawerConfigurationProps {
  selectedAddress: string;
  message: string;
  isSigningInProgress: boolean;
  isHardwareWallet: boolean;
  error: string;
  handleSign: () => void;
  handleCopy: () => void;
  clearSecrets: () => void;
  signatureObject: Cip30DataSignature | undefined;
}

export const useDrawerConfiguration = ({
  selectedAddress,
  message,
  isSigningInProgress,
  isHardwareWallet,
  handleSign,
  handleCopy,
  error,
  clearSecrets,
  signatureObject
}: UseDrawerConfigurationProps): void => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();
  const [, closeDrawer] = useDrawer();

  const getActionButtonLabel = useCallback(() => {
    if (isSigningInProgress) return t('core.signMessage.signingInProgress');
    else if (isHardwareWallet) {
      return t('core.signMessage.signWithHardwareWalletButton');
    }
    return t('core.signMessage.signButton');
  }, [isSigningInProgress, isHardwareWallet, t]);

  const getActionButton = useCallback(() => {
    if (signatureObject?.signature && !error) {
      return (
        <CopyToClipboard text={signatureObject.signature}>
          <Button onClick={handleCopy}>
            {t('core.signMessage.copyToClipboard')}
            <CopyToClipboardImg className={styles.newFolderIcon} />
          </Button>
        </CopyToClipboard>
      );
    }
    return (
      <Button onClick={handleSign} disabled={!selectedAddress || !message || isSigningInProgress}>
        {getActionButtonLabel()}
      </Button>
    );
  }, [
    signatureObject,
    handleCopy,
    handleSign,
    selectedAddress,
    message,
    error,
    isSigningInProgress,
    getActionButtonLabel,
    t
  ]);

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
        >
          {t('core.signMessage.closeButton')}
        </Button>
      </div>
    ),
    [getActionButton, closeDrawer, clearSecrets, t]
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
