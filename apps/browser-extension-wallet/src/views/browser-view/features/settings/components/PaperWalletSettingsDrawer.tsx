/* eslint-disable unicorn/no-null */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWalletManager } from '@hooks';
import { Drawer, DrawerHeader, DrawerNavigation, PostHogAction } from '@lace/common';
import { i18n } from '@lace/translation';
import {
  Button,
  DownloadComponent as DownloadIcon,
  Flex,
  PrinterComponent as PrinterIcon
} from '@input-output-hk/lace-ui-toolkit';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';
import { generatePaperWalletPdf } from '@src/utils/PaperWallet';
import type { PublicPgpKeyData, PaperWalletPDF } from '@src/types';
import { replaceWhitespace } from '@src/utils/format-string';
import styles from './SettingsLayout.module.scss';
import { useAnalyticsContext } from '@providers';
import { PassphraseStage, SaveStage, SecureStage } from './PaperWallet';
import { WarningModal } from '@src/views/browser-view/components';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  popupView?: boolean;
}

const DEFAULT_PGP_STATE: PublicPgpKeyData = {
  pgpPublicKey: null,
  pgpKeyReference: null
};

type PaperWalletExportStages = 'secure' | 'passphrase' | 'save';

type ProcessingStateType = {
  isProcessing?: boolean;
  isPasswordValid?: boolean;
};

export const PaperWalletSettingsDrawer = ({ isOpen, onClose, popupView = false }: Props): React.ReactElement => {
  const [stage, setStage] = useState<PaperWalletExportStages>('secure');
  const [pgpInfo, setPgpInfo] = useState<PublicPgpKeyData>(DEFAULT_PGP_STATE);
  const [{ isProcessing, isPasswordValid }, setProcessingState] = useState<ProcessingStateType>({
    isProcessing: false,
    isPasswordValid: true
  });
  const [pdfInstance, setPdfInstance] = useState<PaperWalletPDF>({
    blob: null,
    loading: true,
    url: null,
    error: null
  });
  const [password, setPassword] = useState<string>('');
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  const { unlockWallet: validatePassword, getMnemonic } = useWalletManager();
  const { walletInfo } = useWalletStore();
  const { CHAIN } = config();
  const [passphrase, setPassphrase] = useState<string[]>([]);
  const removePassword = useCallback(() => setPassword(''), []);
  const getPassphrase = useCallback(
    async (userPassword) => {
      await validatePassword(userPassword);
      const mnemonic = await getMnemonic(Buffer.from(userPassword));

      setPassphrase(mnemonic);
    },
    [getMnemonic, validatePassword]
  );
  const analytics = useAnalyticsContext();

  const handleClose = useCallback(() => {
    setStage('secure');
    setPgpInfo(DEFAULT_PGP_STATE);
    removePassword();
    setPassphrase([]);
    onClose();
  }, [setStage, setPgpInfo, removePassword, setPassphrase, onClose]);

  const warnBeforeClose = useCallback(() => {
    if (pdfInstance.url) {
      setWarningModalVisible(true);
    }
  }, [setWarningModalVisible, pdfInstance]);

  const handleVerifyPass = useCallback(async () => {
    if (isProcessing) return;
    setProcessingState({ isPasswordValid: true, isProcessing: true });
    try {
      await validatePassword(password);
      await getPassphrase(password);
      analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletPasswordNextClick);
      setStage('save');
      setProcessingState({ isPasswordValid: true, isProcessing: false });
      removePassword();
    } catch {
      removePassword();
      setProcessingState({ isPasswordValid: false, isProcessing: false });
    }
  }, [isProcessing, validatePassword, password, getPassphrase, removePassword, analytics]);

  useEffect(() => {
    generatePaperWalletPdf({
      walletAddress: walletInfo.addresses[0].address,
      walletName: walletInfo.name,
      pgpInfo,
      mnemonic: passphrase,
      chain: CHAIN
    })
      .then((response) => setPdfInstance(response))
      .catch((error) => {
        setPdfInstance({ error, loading: false });
      });
  }, [passphrase, pgpInfo, walletInfo, CHAIN, setPdfInstance]);

  const formattedWalletName = i18n.t('core.paperWallet.savePaperWallet.walletName', {
    walletName: replaceWhitespace(walletInfo.name, '_').trim()
  });

  const visibleStage: React.ReactElement = useMemo(() => {
    switch (stage) {
      case 'secure':
        return <SecureStage setPgpInfo={setPgpInfo} pgpInfo={pgpInfo} />;
      case 'passphrase':
        return <PassphraseStage password={password} setPassword={setPassword} isPasswordValid={isPasswordValid} />;
      case 'save':
        return <SaveStage walletName={formattedWalletName} />;
      default:
        throw new Error('incorrect stage supplied');
    }
  }, [stage, isPasswordValid, setPgpInfo, pgpInfo, password, setPassword, formattedWalletName]);

  const footer = useMemo(() => {
    switch (stage) {
      case 'secure': {
        return (
          <Button.CallToAction
            disabled={!pgpInfo.pgpPublicKey}
            label={i18n.t('send.form.next')}
            onClick={() => {
              analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletPublicKeyNextClick);
              setStage('passphrase');
            }}
            w="$fill"
          />
        );
      }
      case 'passphrase': {
        return (
          <Button.CallToAction
            w="$fill"
            disabled={!password}
            label={i18n.t('browserView.settings.generatePaperWallet.title')}
            onClick={handleVerifyPass}
          />
        );
      }
      case 'save': {
        return (
          <Flex flexDirection="column" gap="$8" className={styles.actionButtonContainer}>
            <a
              href={pdfInstance.url}
              download={formattedWalletName}
              target="_blank"
              className={styles.fullWidth}
              aria-disabled={pdfInstance.loading || !!pdfInstance.error}
              onClick={() => {
                analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletDownloadClick);
                handleClose();
              }}
            >
              <Button.Primary
                disabled={pdfInstance.loading || !!pdfInstance.error}
                w="$fill"
                label={i18n.t('paperWallet.savePaperWallet.downloadBtnLabel')}
                icon={<DownloadIcon />}
              />
            </a>
            <Button.Secondary
              onClick={() => {
                analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletPrintClick);
                const printWindow = window.open(URL.createObjectURL(pdfInstance.blob));
                printWindow.print();
                handleClose();
              }}
              w="$fill"
              disabled={pdfInstance.loading || !!pdfInstance.error}
              icon={<PrinterIcon />}
              label={i18n.t('paperWallet.savePaperWallet.printBtnLabel')}
            />
          </Flex>
        );
      }
      default:
        throw new Error('incorrect stage supplied');
    }
  }, [stage, pgpInfo, setStage, handleVerifyPass, password, pdfInstance, formattedWalletName, handleClose, analytics]);

  return (
    <>
      <WarningModal
        header={i18n.t('paperWallet.SettingsDrawer.ExitWarningTitle')}
        content={
          <span className={styles.removeWalletContent}>
            {i18n.t('paperWallet.SettingsDrawer.ExitWarningDescription')}
          </span>
        }
        visible={warningModalVisible}
        onCancel={() => setWarningModalVisible(false)}
        onConfirm={handleClose}
        cancelLabel={i18n.t('browserView.settings.wallet.general.removeWalletAlert.cancel')}
        confirmLabel={i18n.t('paperWallet.SettingsDrawer.ExitButton')}
        confirmCustomClassName={styles.settingsExitButton}
        isPopupView={popupView}
      />
      <Drawer
        open={isOpen}
        dataTestId="paper-wallet-settings-drawer"
        onClose={warnBeforeClose}
        popupView={popupView}
        title={<DrawerHeader popupView={popupView} title={i18n.t('paperWallet.securePaperWallet.title')} />}
        navigation={
          <DrawerNavigation
            title={i18n.t('browserView.settings.heading')}
            onCloseIconClick={!popupView ? warnBeforeClose : undefined}
            onArrowIconClick={popupView ? warnBeforeClose : undefined}
          />
        }
        footer={footer}
        destroyOnClose
      >
        {visibleStage}
      </Drawer>
    </>
  );
};
