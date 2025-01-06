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
import { PasswordObj, useSecrets } from '@lace/core';

const INCORRECT_STAGE_ERROR = 'incorrect stage supplied';
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

const INITIAL_PDF_STATE: PaperWalletPDF = {
  blob: null,
  loading: true,
  url: null,
  error: null
};

export const PaperWalletSettingsDrawer = ({ isOpen, onClose, popupView = false }: Props): React.ReactElement => {
  const [stage, setStage] = useState<PaperWalletExportStages>('secure');
  const [pgpInfo, setPgpInfo] = useState<PublicPgpKeyData>(DEFAULT_PGP_STATE);
  const [{ isProcessing, isPasswordValid }, setProcessingState] = useState<ProcessingStateType>({
    isProcessing: false,
    isPasswordValid: true
  });
  const [pdfInstance, setPdfInstance] = useState<PaperWalletPDF>(INITIAL_PDF_STATE);
  const { password, setPassword, clearSecrets } = useSecrets();
  const { unlockWallet: validatePassword, getMnemonic } = useWalletManager();
  const { walletInfo } = useWalletStore();
  const { CHAIN } = config();
  const [passphrase, setPassphrase] = useState<string[]>([]);

  const analytics = useAnalyticsContext();

  const handleClose = useCallback(() => {
    setStage('secure');
    setPgpInfo(DEFAULT_PGP_STATE);
    clearSecrets();
    setPassphrase([]);
    onClose();
  }, [setStage, setPgpInfo, clearSecrets, setPassphrase, onClose]);

  const handleVerifyPass = useCallback(
    async (userPassphrase: Partial<PasswordObj>) => {
      if (isProcessing) return;
      setProcessingState({ isPasswordValid: true, isProcessing: true });
      try {
        await validatePassword();
        const mnemonic = await getMnemonic(Buffer.from(userPassphrase.value));
        setPassphrase(mnemonic);
        analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletPasswordNextClick);
        setStage('save');
        setProcessingState({ isPasswordValid: true, isProcessing: false });
        clearSecrets();
      } catch {
        clearSecrets();
        setProcessingState({ isPasswordValid: false, isProcessing: false });
      }
    },
    [isProcessing, validatePassword, getMnemonic, clearSecrets, analytics]
  );

  useEffect(() => {
    if (walletInfo.addresses[0].address && passphrase && pgpInfo.pgpPublicKey)
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

    return () => {
      setPdfInstance(INITIAL_PDF_STATE);
    };
  }, [passphrase, pgpInfo, walletInfo, CHAIN, setPdfInstance]);

  const formattedWalletName = i18n.t('core.paperWallet.savePaperWallet.walletName', {
    walletName: replaceWhitespace(walletInfo.name, '_').trim()
  });

  const visibleStage: React.ReactElement = useMemo(() => {
    switch (stage) {
      case 'secure':
        return <SecureStage setPgpInfo={setPgpInfo} pgpInfo={pgpInfo} />;
      case 'passphrase':
        return <PassphraseStage setPassword={setPassword} isPasswordValid={isPasswordValid} />;
      case 'save':
        return <SaveStage walletName={formattedWalletName} />;
      default:
        throw new Error(INCORRECT_STAGE_ERROR);
    }
  }, [stage, isPasswordValid, setPgpInfo, pgpInfo, setPassword, formattedWalletName]);

  const footer = () => {
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
            data-testid="next-button"
          />
        );
      }
      case 'passphrase': {
        return (
          <Button.CallToAction
            w="$fill"
            disabled={!password.value}
            label={i18n.t('browserView.settings.generatePaperWallet.title')}
            onClick={() => handleVerifyPass(password)}
            data-testid="generate-paper-wallet-button"
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
              }}
            >
              <Button.Primary
                disabled={pdfInstance.loading || !!pdfInstance.error}
                w="$fill"
                label={i18n.t('paperWallet.savePaperWallet.downloadBtnLabel')}
                icon={<DownloadIcon />}
                data-testid="download-button"
              />
            </a>
            <Button.Secondary
              onClick={() => {
                analytics.sendEventToPostHog(PostHogAction.SettingsPaperWalletPrintClick);
                const printWindow = window.open(URL.createObjectURL(pdfInstance.blob));
                printWindow.print();
              }}
              w="$fill"
              disabled={pdfInstance.loading || !!pdfInstance.error}
              icon={<PrinterIcon />}
              label={i18n.t('paperWallet.savePaperWallet.printBtnLabel')}
              data-testid="print-button"
            />
          </Flex>
        );
      }
      default:
        throw new Error(INCORRECT_STAGE_ERROR);
    }
  };

  const drawerHeader = useMemo(() => {
    switch (stage) {
      case 'secure':
        return (
          <DrawerHeader
            popupView={popupView}
            title={i18n.t('paperWallet.securePaperWallet.title')}
            subtitle={i18n.t('paperWallet.securePaperWallet.description')}
          />
        );
      case 'passphrase':
        return (
          <DrawerHeader
            popupView={popupView}
            title={i18n.t('paperWallet.SettingsDrawer.passphraseStage.title')}
            subtitle={i18n.t('paperWallet.SettingsDrawer.passphraseStage.subtitle')}
          />
        );
      case 'save':
        return (
          <DrawerHeader
            popupView={popupView}
            title={i18n.t('paperWallet.savePaperWallet.title')}
            subtitle={i18n.t('paperWallet.savePaperWallet.description')}
          />
        );
      default:
        throw new Error(INCORRECT_STAGE_ERROR);
    }
  }, [stage, popupView]);

  return (
    <>
      <Drawer
        open={isOpen}
        dataTestId="paper-wallet-settings-drawer"
        onClose={handleClose}
        popupView={popupView}
        title={drawerHeader}
        navigation={
          <DrawerNavigation
            title={i18n.t('browserView.settings.heading')}
            onCloseIconClick={!popupView ? handleClose : undefined}
            onArrowIconClick={popupView ? handleClose : undefined}
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
