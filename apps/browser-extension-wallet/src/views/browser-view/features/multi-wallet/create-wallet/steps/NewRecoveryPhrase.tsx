import { WalletSetupMnemonicStage, MnemonicVideoPopupContent, WalletSetupMnemonicStepRevamp } from '@lace/core';
import React, { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { wordlists } from 'bip39';
import { WarningModal } from '@src/views/browser-view/components';
import { useCreateWallet } from '../context';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks/useWalletManager';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { PostHogAction } from '@lace/common';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';

const wordList = wordlists.english;
const COPY_PASTE_TOOLTIP_URL = `${process.env.FAQ_URL}?question=best-practices-for-using-the-copy-to-clipboard-paste-from-clipboard-recovery-phrase-features`;

export const NewRecoveryPhrase = (): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();
  const { generatedMnemonic, data } = useCreateWallet();
  const { createWallet, walletRepository } = useWalletManager();
  const analytics = useAnalyticsContext();
  const [currentSetupMnemonicStage, setCurrentSetupMnemonicStage] = useState<WalletSetupMnemonicStage>('writedown');
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);

  const handleReadMoreOnClick = () => {
    currentSetupMnemonicStage === 'writedown'
      ? analytics.sendEventToPostHog(postHogMultiWalletActions.create.RECOVERY_PHRASE_COPY_READ_MORE_CLICK)
      : analytics.sendEventToPostHog(postHogMultiWalletActions.create.RECOVERY_PHRASE_PASTE_READ_MORE_CLICK);
  };

  const walletSetupMnemonicStepTranslations = {
    writePassphraseTitle: t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'),
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription'),
    writePassphraseSubtitle1: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1'),
    writePassphraseSubtitle2: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterPassphraseLength: t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength'),
    copyToClipboard: t('core.walletSetupMnemonicStepRevamp.copyToClipboard'),
    pasteFromClipboard: t('core.walletSetupMnemonicStepRevamp.pasteFromClipboard'),
    copyPasteTooltipText: (
      <Trans
        i18nKey="core.walletSetupMnemonicStepRevamp.copyPasteTooltipText"
        components={{
          a: (
            <a
              href={COPY_PASTE_TOOLTIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleReadMoreOnClick}
            />
          )
        }}
      />
    )
  };

  const mnemonicVideoPopupContentTranslations = {
    title: t('core.mnemonicVideoPopupContent.title'),
    description: t('core.mnemonicVideoPopupContent.description'),
    linkText: t('core.mnemonicVideoPopupContent.link'),
    closeButton: t('core.mnemonicVideoPopupContent.closeButton')
  };

  const clearSecrets = useCallback(() => {
    for (let i = 0; i < data.mnemonic.length; i++) {
      data.mnemonic[i] = '';
    }
    data.password = '';
  }, [data]);

  const saveWallet = useCallback(async () => {
    void analytics.sendEventToPostHog(postHogMultiWalletActions.create.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
    const { source } = await createWallet(data);
    await analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateEnterRecoveryPhraseNextClick);

    // move this to name-password setup submit handle after order changes
    await analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateEnterWalletClick, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
    });
    await analytics.sendMergeEvent(source.account.extendedAccountPublicKey);
    clearSecrets();
    history.push(walletRoutePaths.assets);
  }, [data, createWallet, history, clearSecrets, analytics, walletRepository]);

  return (
    <>
      <WalletSetupMnemonicStepRevamp
        mnemonic={data.mnemonic}
        mnemonicStage={currentSetupMnemonicStage}
        onStageChange={(nextStage) => {
          if (nextStage === 'input') {
            setCurrentSetupMnemonicStage(nextStage);
            void analytics.sendEventToPostHog(postHogMultiWalletActions.create.SAVE_RECOVERY_PHRASE_NEXT_CLICK);
          } else {
            setIsResetMnemonicModalOpen(true);
          }
        }}
        onBack={() => history.goBack()}
        onNext={saveWallet}
        renderVideoPopupContent={({ onClose }) => (
          <MnemonicVideoPopupContent
            translations={mnemonicVideoPopupContentTranslations}
            videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
            onClose={() => {
              onClose();
              void analytics.sendEventToPostHog(
                postHogMultiWalletActions.create.RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK
              );
            }}
          />
        )}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
        onWatchVideoClick={() =>
          analytics.sendEventToPostHog(postHogMultiWalletActions.create.RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK)
        }
        onCopyToClipboard={() =>
          analytics.sendEventToPostHog(postHogMultiWalletActions.create.RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK)
        }
        onPasteFromClipboard={() =>
          analytics.sendEventToPostHog(postHogMultiWalletActions.create.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
        }
      />
      {isResetMnemonicModalOpen && (
        <WarningModal
          header={t('browserView.walletSetup.mnemonicResetModal.header')}
          content={t('browserView.walletSetup.mnemonicResetModal.content')}
          visible={isResetMnemonicModalOpen}
          cancelLabel={t('browserView.walletSetup.mnemonicResetModal.cancel')}
          confirmLabel={t('browserView.walletSetup.mnemonicResetModal.confirm')}
          onCancel={() => {
            setIsResetMnemonicModalOpen(false);
          }}
          onConfirm={() => {
            setIsResetMnemonicModalOpen(false);
            setCurrentSetupMnemonicStage('writedown');
            generatedMnemonic();
          }}
        />
      )}
    </>
  );
};
