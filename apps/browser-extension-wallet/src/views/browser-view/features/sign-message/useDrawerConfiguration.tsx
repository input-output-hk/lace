import React, { useEffect, useCallback } from 'react';
import { useDrawer } from '@views/browser/stores';
import { useTranslation } from 'react-i18next';
import { DrawerContent } from '@views/browser/components/Drawer';
import { DrawerNavigation, Button } from '@lace/common';
import styles from './SignMessageDrawer.module.scss';
import { Password } from '@input-output-hk/lace-ui-toolkit';

interface UseDrawerConfigurationProps {
  selectedAddress: string;
  message: string;
  password: Partial<Password>;
  isSigningInProgress: boolean;
  isHardwareWallet: boolean;
  handleSign: () => void;
  clearSecrets: () => void;
}

export const useDrawerConfiguration = ({
  selectedAddress,
  message,
  password,
  isSigningInProgress,
  isHardwareWallet,
  handleSign,
  clearSecrets
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

  const renderFooter = useCallback(
    () => (
      <div className={styles.buttonContainer}>
        <Button
          onClick={() => {
            handleSign();
          }}
          disabled={!selectedAddress || !message || isSigningInProgress || (!password.value && !isHardwareWallet)}
        >
          {getActionButtonLabel()}
        </Button>
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
    [
      selectedAddress,
      message,
      isSigningInProgress,
      password,
      isHardwareWallet,
      handleSign,
      getActionButtonLabel,
      closeDrawer,
      clearSecrets,
      t
    ]
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
