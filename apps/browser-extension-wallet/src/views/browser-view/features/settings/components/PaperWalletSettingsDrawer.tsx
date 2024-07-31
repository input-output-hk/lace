/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-null */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useWalletManager } from '@hooks';
import { Banner, Drawer, DrawerHeader, DrawerNavigation, inputProps, Password } from '@lace/common';
import { PaperWalletInfoCard, PgpPublicKeyEntry } from '@lace/core';
import { i18n } from '@lace/translation';
import {
  Button,
  Text,
  DownloadComponent as DownloadIcon,
  Flex,
  PrinterComponent as PrinterIcon
} from '@input-output-hk/lace-ui-toolkit';
import { useWalletStore } from '@src/stores';
import { pgpPublicKeyVerification } from '@src/utils/pgp';
import { Typography } from 'antd';
import { config } from '@src/config';
import { generatePaperWalletPdf } from '@src/utils/PaperWallet';
import type { PublicPgpKeyData, PaperWalletPDF } from '@src/types';
import { replaceWhitespace } from '@src/utils/format-string';
import styles from './SettingsLayout.module.scss';

const { Text: AntdText } = Typography;

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

interface Validation {
  error?: string;
  success?: string;
}

const SecureStage = ({
  setPgpInfo,
  pgpInfo
}: {
  setPgpInfo: React.Dispatch<React.SetStateAction<PublicPgpKeyData>>;
  pgpInfo: PublicPgpKeyData;
}) => {
  const [validation, setValidation] = useState<Validation>({ error: null, success: null });

  const handlePgpPublicKeyBlockChange = pgpPublicKeyVerification(setPgpInfo, setValidation);

  const handlePgpReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPgpInfo({ ...pgpInfo, pgpKeyReference: e.target.value });
  };

  return (
    <Flex mt="$8">
      <PgpPublicKeyEntry
        handlePgpPublicKeyBlockChange={handlePgpPublicKeyBlockChange}
        handlePgpReferenceChange={handlePgpReferenceChange}
        validation={validation}
        pgpInfo={pgpInfo}
      />
    </Flex>
  );
};

type ProcessingStateType = {
  isProcessing?: boolean;
  isPasswordValid?: boolean;
};

const PassphraseStage = ({
  setPassword,
  password,
  isPasswordValid
}: {
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  isPasswordValid: boolean;
}) => {
  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);

  return (
    <Flex mt="$8" flexDirection="column" gap="$8">
      <AntdText className={styles.drawerDescription} data-testid="passphrase-drawer-description">
        {i18n.t('browserView.settings.security.showPassphraseDrawer.description')}
      </AntdText>
      <Flex gap="$32" flexDirection="column">
        <div className={styles.warningBanner}>
          <Banner withIcon message={i18n.t('browserView.settings.security.showPassphraseDrawer.warning')} />
        </div>
        <div className={styles.passwordContainer}>
          <div className={styles.password}>
            <Password
              className={styles.passwordInput}
              onChange={handleChange}
              value={password}
              error={!isPasswordValid}
              errorMessage={i18n.t('browserView.transaction.send.error.invalidPassword')}
              label={i18n.t('browserView.transaction.send.password.placeholder')}
              autoFocus
            />
          </div>
        </div>
      </Flex>
    </Flex>
  );
};

const SaveStage = ({ walletName }: { walletName: string }) => (
  <Flex gap="$16" mt="$8" flexDirection="column">
    <Text.Body.Normal color="secondary">{i18n.t('paperWallet.savePaperWallet.description')}</Text.Body.Normal>
    <PaperWalletInfoCard walletName={walletName} />
  </Flex>
);

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

  const handleClose = useCallback(() => {
    setStage('secure');
    setPgpInfo(DEFAULT_PGP_STATE);
    removePassword();
    setPassphrase([]);
    onClose();
  }, [setStage, setPgpInfo, removePassword, setPassphrase, onClose]);

  const handleVerifyPass = useCallback(async () => {
    if (isProcessing) return;
    setProcessingState({ isPasswordValid: true, isProcessing: true });
    try {
      await validatePassword(password);
      await getPassphrase(password);
      setStage('save');
      setProcessingState({ isPasswordValid: true, isProcessing: false });
      removePassword();
    } catch {
      removePassword();
      setProcessingState({ isPasswordValid: false, isProcessing: false });
    }
  }, [isProcessing, validatePassword, password, getPassphrase, removePassword]);

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

  const visibleStage: React.ReactElement = useMemo(() => {
    switch (stage) {
      case 'secure':
        return <SecureStage setPgpInfo={setPgpInfo} pgpInfo={pgpInfo} />;
      case 'passphrase':
        return <PassphraseStage password={password} setPassword={setPassword} isPasswordValid={isPasswordValid} />;
      case 'save':
        return <SaveStage walletName={walletInfo.name} />;
      default:
        throw new Error('incorrect stage supplied');
    }
  }, [stage, isPasswordValid, walletInfo, setPgpInfo, pgpInfo, password, setPassword]);

  const footer = useMemo(() => {
    switch (stage) {
      case 'secure': {
        return (
          <Button.CallToAction
            disabled={!pgpInfo.pgpPublicKey}
            label={i18n.t('send.form.next')}
            onClick={() => setStage('passphrase')}
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
          <Flex flexDirection="column" gap="$8">
            <a
              href={pdfInstance.url}
              download={`${replaceWhitespace(walletInfo.name, '_')}_PaperWallet.pdf`}
              target="_blank"
              style={{ width: '100%' }}
              aria-disabled={pdfInstance.loading || !!pdfInstance.error}
              onClick={handleClose}
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
  }, [stage, pgpInfo, setStage, handleVerifyPass, password, pdfInstance, walletInfo.name, handleClose]);

  return (
    <>
      <Drawer
        open={isOpen}
        dataTestId="paper-wallet-settings-drawer"
        onClose={handleClose}
        popupView={popupView}
        title={<DrawerHeader popupView={popupView} title={i18n.t('paperWallet.securePaperWallet.title')} />}
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
