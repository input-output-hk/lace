/* eslint-disable unicorn/no-nested-ternary */
import React, { ReactElement, useCallback, useState } from 'react';
import { Wallet } from '@lace/cardano';
import {
  Button,
  Drawer,
  DrawerHeader,
  DrawerNavigation,
  inputProps,
  Password,
  Banner,
  useKeyboardShortcut
} from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './SettingsLayout.module.scss';
import { Typography } from 'antd';
import { MnemonicWordsWritedown } from '@lace/core';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useWalletManager } from '@hooks';

const { Text } = Typography;

const showPassphraseButtonLabel = 'browserView.settings.security.showPassphraseDrawer.showPassphrase';

const {
  KeyManagement: { util, emip3decrypt }
} = Wallet;

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: string[];
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
  defaultMnemonic = []
}: GeneralSettingsDrawerProps): ReactElement => {
  const { t } = useTranslation();
  const [blurWords, setBlurWords] = useState<boolean>(false);
  const [passphrase, setPassphrase] = useState<string[]>(defaultMnemonic);
  const [isPassphraseVisible, setIsPassphraseVisible] = useState<boolean>(defaultPassphraseVisible);
  const [{ isProcessing, isPasswordValid }, setProcessingState] = useState<ProcessingStateType>({
    isProcessing: false,
    isPasswordValid: true
  });
  const [password, setPassword] = useState<string>('');
  const { unlockWallet: validatePassword } = useWalletManager();

  const backgroundService = useBackgroundServiceAPIContext();

  const isConfirmButtonDisabled = isPassphraseVisible ? false : !password || isProcessing;

  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);
  const toggleBlurWords = () => setBlurWords(!blurWords);
  const removePassword = () => setPassword('');

  const getPassphrase = useCallback(
    async (userPassword) => {
      const { mnemonic } = await backgroundService.getBackgroundStorage();
      const parsedMnemonic = JSON.parse(mnemonic).data;
      const decryptedMnemonic = await emip3decrypt(Buffer.from(parsedMnemonic), Buffer.from(userPassword));
      setPassphrase(util.mnemonicToWords(decryptedMnemonic.toString()));
    },
    [backgroundService]
  );

  const handleVerifyPass = useCallback(async () => {
    if (isProcessing) return;

    setProcessingState({ isPasswordValid: true, isProcessing: true });
    try {
      await validatePassword(password);
      await getPassphrase(password);
      setIsPassphraseVisible(true);
      setProcessingState({ isPasswordValid: true, isProcessing: false });
      removePassword();
    } catch {
      removePassword();
      setIsPassphraseVisible(false);
      setProcessingState({ isPasswordValid: false, isProcessing: false });
    }
  }, [isProcessing, setProcessingState, validatePassword, password, getPassphrase, setIsPassphraseVisible]);

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
    setPassword('');
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
                  value={password}
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
