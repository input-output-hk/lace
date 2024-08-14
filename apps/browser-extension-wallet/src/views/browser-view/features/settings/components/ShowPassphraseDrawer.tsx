/* eslint-disable unicorn/no-nested-ternary */
import React, { ReactElement, useCallback, useState } from 'react';
import { Button, Drawer, DrawerHeader, DrawerNavigation, Banner, useKeyboardShortcut } from '@lace/common';
import { Password, OnPasswordChange, MnemonicWordsWritedown, useSecrets } from '@lace/core';
import { useTranslation } from 'react-i18next';
import styles from './SettingsLayout.module.scss';
import { Typography } from 'antd';
import { useWalletManager } from '@hooks';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { Text } = Typography;

const showPassphraseButtonLabel = 'browserView.settings.security.showPassphraseDrawer.showPassphrase';

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: string[];
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

type ProcessingStateType = {
  isProcessing?: boolean;
  isPasswordValid?: boolean;
};

export const ShowPassphraseDrawer = ({
  visible,
  onClose,
  popupView = false,
  defaultPassphraseVisible = false,
  defaultMnemonic = [],
  sendAnalyticsEvent
}: GeneralSettingsDrawerProps): ReactElement => {
  const { t } = useTranslation();
  const [blurWords, setBlurWords] = useState<boolean>(false);
  const [passphrase, setPassphrase] = useState<string[]>(defaultMnemonic);
  const [isPassphraseVisible, setIsPassphraseVisible] = useState<boolean>(defaultPassphraseVisible);
  const [{ isProcessing, isPasswordValid }, setProcessingState] = useState<ProcessingStateType>({
    isProcessing: false,
    isPasswordValid: true
  });
  const { password, setPassword, clearSecrets: removePassword } = useSecrets();
  const { unlockWallet: validatePassword, getMnemonic } = useWalletManager();

  const isConfirmButtonDisabled = isPassphraseVisible ? false : !password.value || isProcessing;

  const handleChange: OnPasswordChange = (target) => setPassword(target);
  const toggleBlurWords = () => {
    setBlurWords(!blurWords);
    if (!blurWords) {
      sendAnalyticsEvent(PostHogAction.SettingsShowRecoveryPhraseYourRecoveryPhraseHidePassphraseClick);
    }
  };

  const getPassphrase = useCallback(
    async (userPassword) => {
      const mnemonic = await getMnemonic(Buffer.from(userPassword));

      setPassphrase(mnemonic);
    },
    [getMnemonic]
  );

  const handleVerifyPass = useCallback(async () => {
    if (isProcessing) return;

    setProcessingState({ isPasswordValid: true, isProcessing: true });
    try {
      await validatePassword();
      await getPassphrase(password.value);
      setIsPassphraseVisible(true);
      setProcessingState({ isPasswordValid: true, isProcessing: false });
      removePassword();
      sendAnalyticsEvent(PostHogAction.SettingsShowRecoveryPhraseEnterYourPasswordShowRecoveryPhraseClick);
    } catch {
      removePassword();
      setIsPassphraseVisible(false);
      setProcessingState({ isPasswordValid: false, isProcessing: false });
    }
  }, [isProcessing, validatePassword, password.value, getPassphrase, sendAnalyticsEvent, removePassword]);

  const handleShowPassphrase = async () => {
    if (isPassphraseVisible) {
      toggleBlurWords();
    } else {
      await handleVerifyPass();
    }
  };

  const getButtonLabel = () => {
    if (isPassphraseVisible) {
      return blurWords
        ? t(showPassphraseButtonLabel)
        : t('browserView.settings.security.showPassphraseDrawer.hidePassphrase');
    }

    return t(showPassphraseButtonLabel);
  };

  const handleOnClose = () => {
    onClose();
    setProcessingState({ isPasswordValid: true, isProcessing: false });
    setBlurWords(false);
    setPassphrase([]);
    removePassword();
    setIsPassphraseVisible(false);
  };

  useKeyboardShortcut(['Escape'], () => handleOnClose());

  return (
    <Drawer
      visible={visible}
      onClose={handleOnClose}
      title={
        <DrawerHeader
          popupView={popupView}
          title={
            isPassphraseVisible
              ? t('browserView.settings.security.showPassphraseDrawer.YourRecoveryPhrase')
              : t('browserView.settings.security.showPassphraseDrawer.title')
          }
        />
      }
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? handleOnClose : undefined}
          onArrowIconClick={popupView ? handleOnClose : undefined}
        />
      }
      popupView={popupView}
      footer={
        <>
          <Button
            size="large"
            block
            loading={isProcessing}
            disabled={isConfirmButtonDisabled}
            onClick={handleShowPassphrase}
            data-testid={
              getButtonLabel() === t(showPassphraseButtonLabel) ? 'show-passphrase-button' : 'hide-passphrase-button'
            }
          >
            {getButtonLabel()}
          </Button>
        </>
      }
    >
      <div>
        {!isPassphraseVisible && (
          <Text className={styles.drawerDescription} data-testid="passphrase-drawer-description">
            {t('browserView.settings.security.showPassphraseDrawer.description')}
          </Text>
        )}
        {!isPassphraseVisible && (
          <>
            <div className={styles.warningBanner}>
              <Banner withIcon message={t('browserView.settings.security.showPassphraseDrawer.warning')} />
            </div>
            <div className={styles.passwordContainer}>
              <div className={styles.password}>
                <Password
                  className={styles.passwordInput}
                  onChange={handleChange}
                  error={!isPasswordValid}
                  errorMessage={t('browserView.transaction.send.error.invalidPassword')}
                  label={t('browserView.transaction.send.password.placeholder')}
                  autoFocus
                />
              </div>
            </div>
          </>
        )}
        {isPassphraseVisible && (
          <div className={styles.passphraseContainer}>
            <MnemonicWordsWritedown firstWordNumber={1} words={passphrase} fourColumnView blurWords={blurWords} />
          </div>
        )}
      </div>
    </Drawer>
  );
};
