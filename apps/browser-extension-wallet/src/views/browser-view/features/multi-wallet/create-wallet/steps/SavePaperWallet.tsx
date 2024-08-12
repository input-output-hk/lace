/* eslint-disable unicorn/no-null */
import React, { useEffect, useState, VFC } from 'react';
import { CreateWalletParams } from '@hooks';
import {
  Button,
  DownloadComponent as DownloadIcon,
  Flex,
  Text,
  PrinterComponent as PrinterIcon
} from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { PaperWalletInfoCard, WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { i18n } from '@lace/translation';
import { logger } from '@lib/wallet-api-ui';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { config } from '@src/config';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useCreateWallet } from '../context';
import { generatePaperWalletPdf } from '@src/utils/PaperWallet';
import { PaperWalletPDF } from '@src/types';
import { replaceWhitespace } from '@src/utils/format-string';
import styles from './SavePaperWallet.module.scss';

const deriveAccountFromMnemonic = async (
  createWalletData: CreateWalletParams,
  chain: keyof typeof Wallet.Cardano.ChainIds
): Promise<Wallet.KeyManagement.GroupedAddress> => {
  const keyAgentChainId = createWalletData.chainId || Wallet.Cardano.ChainIds[chain];
  const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      chainId: keyAgentChainId,
      getPassphrase: async () => Buffer.from(''),
      mnemonicWords: createWalletData.mnemonic,
      accountIndex: 0
    },
    {
      bip32Ed25519: Wallet.bip32Ed25519,
      logger
    }
  );

  return await keyAgent.deriveAddress(
    {
      index: 0, // paper wallets always default to index 0
      type: 0 // 0 = external
    },
    0
  );
};

export const SavePaperWallet: VFC = () => {
  const { postHogActions } = useWalletOnboarding();
  const { createWalletData, next, pgpInfo, setPgpInfo } = useCreateWallet();
  const { CHAIN } = config();
  const analytics = useAnalyticsContext();
  const [hasStoredPaperWallet, setHasStoredPaperWallet] = useState(false);
  const [pdfInstance, setPdfInstance] = useState<PaperWalletPDF>({
    blob: null,
    loading: true,
    url: null,
    error: null
  });

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.create.PAPER_WALLET_COMPLETE_CLICK);
    setPgpInfo(null);
    next();
  };

  useEffect(() => {
    deriveAccountFromMnemonic(createWalletData, CHAIN)
      .then((account) =>
        generatePaperWalletPdf({
          walletAddress: account.address,
          walletName: createWalletData.name,
          pgpInfo,
          mnemonic: createWalletData.mnemonic,
          chain: CHAIN
        })
      )
      .then((response) => setPdfInstance(response))
      .catch((error) => {
        setPdfInstance({ error, loading: false });
      });
  }, [pgpInfo, createWalletData, CHAIN, setPdfInstance]);

  const formattedWalletName = i18n.t('core.paperWallet.savePaperWallet.walletName', {
    walletName: replaceWhitespace(createWalletData.name, '_').trim()
  });

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.savePaperWallet.title')}
        description={i18n.t('paperWallet.savePaperWallet.description')}
        currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
      >
        <Flex w="$fill" h="$fill" gap="$20">
          <PaperWalletInfoCard walletName={formattedWalletName} />
          <Flex
            className={styles.ctaColumn}
            flexDirection="column"
            h="$fill"
            justifyContent="space-between"
            p="$0"
            m="$0"
          >
            <Flex h="$fill" flexDirection="column" w="$fill" gap="$8" px="$0" className={styles.actionButtonContainer}>
              <a
                href={pdfInstance.url}
                onClick={() => {
                  void analytics.sendEventToPostHog(postHogActions.create.DOWNLOAD_PAPER_WALLET_CLICK);
                  setHasStoredPaperWallet(true);
                }}
                download={formattedWalletName}
                target="_blank"
                className={styles.fullWidth}
                aria-disabled={pdfInstance.loading || !!pdfInstance.error}
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
                  void analytics.sendEventToPostHog(postHogActions.create.PRINT_PAPER_WALLET_CLICK);
                  const printWindow = window.open(URL.createObjectURL(pdfInstance.blob));
                  printWindow.print();
                  setHasStoredPaperWallet(true);
                }}
                w={'$fill'}
                disabled={pdfInstance.loading || !!pdfInstance.error}
                icon={<PrinterIcon />}
                label={i18n.t('paperWallet.savePaperWallet.printBtnLabel')}
              />
            </Flex>
            <Flex flexDirection="column" w="$fill" gap="$8">
              {!hasStoredPaperWallet && (
                <Text.Label color="secondary" className={styles.centerAlign}>
                  {i18n.t('paperWallet.savePaperWallet.pleaseSaveOrPrintLabel')}
                </Text.Label>
              )}
              <Button.CallToAction
                onClick={handleNext}
                disabled={!hasStoredPaperWallet}
                w="$fill"
                label={i18n.t('core.walletSetupStep.enterWallet')}
              />
            </Flex>
          </Flex>
        </Flex>
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
