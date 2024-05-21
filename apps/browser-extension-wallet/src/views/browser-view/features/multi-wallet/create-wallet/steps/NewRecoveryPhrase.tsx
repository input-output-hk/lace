import { MnemonicVideoPopupContent, WalletSetupMnemonicStage, WalletSetupMnemonicStepRevamp } from '@lace/core';
import React, { useState, VFC } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { WarningModal } from '@src/views/browser-view/components';
import { useCreateWallet } from '../context';
import { WalletCreateStep } from '../types';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { toast } from '@lace/common';
import Copy from '@assets/icons/copy.component.svg';
import Paste from '@assets/icons/paste.component.svg';
import { useWalletOnboarding } from '../../walletOnboardingContext';

const wordList = wordlists.english;
const COPY_PASTE_TOOLTIP_URL = `${process.env.FAQ_URL}?question=best-practices-for-using-the-copy-to-clipboard-paste-from-clipboard-recovery-phrase-features`;
const twoSecondsToastDuration = 1.5;

const getMnemonicStage = (step: WalletCreateStep): WalletSetupMnemonicStage => {
  if (step === WalletCreateStep.RecoveryPhraseWriteDown) return 'writedown';
  if (step === WalletCreateStep.RecoveryPhraseInput) return 'input';
  throw new Error('Invalid wallet crate step');
};

export const NewRecoveryPhrase: VFC = () => {
  const { t } = useTranslation();
  const { postHogActions } = useWalletOnboarding();
  const { back, createWalletData, next, step } = useCreateWallet();
  const analytics = useAnalyticsContext();
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);

  const handleReadMoreOnClick = () => {
    step === WalletCreateStep.RecoveryPhraseWriteDown
      ? analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_COPY_READ_MORE_CLICK)
      : analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_PASTE_READ_MORE_CLICK);
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

  return (
    <>
      <WalletSetupMnemonicStepRevamp
        mnemonic={createWalletData.mnemonic}
        mnemonicStage={getMnemonicStage(step)}
        onStageChange={(nextStage) => {
          if (nextStage === 'input') {
            void next();
            void analytics.sendEventToPostHog(postHogActions.create.SAVE_RECOVERY_PHRASE_NEXT_CLICK);
          } else {
            setIsResetMnemonicModalOpen(true);
          }
        }}
        onBack={back}
        onNext={() => {
          void analytics.sendEventToPostHog(postHogActions.create.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
          void next();
        }}
        renderVideoPopupContent={({ onClose }) => (
          <MnemonicVideoPopupContent
            translations={mnemonicVideoPopupContentTranslations}
            videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
            onClose={() => {
              onClose();
              void analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK);
            }}
          />
        )}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
        onWatchVideoClick={() =>
          void analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK)
        }
        onCopyToClipboard={() => {
          void analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK);
          toast.notify({
            duration: twoSecondsToastDuration,
            text: t('core.walletSetupMnemonicStepRevamp.recoveryPhraseCopied'),
            icon: Copy
          });
        }}
        onPasteFromClipboard={() => {
          void analytics.sendEventToPostHog(postHogActions.create.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK);
          toast.notify({
            duration: twoSecondsToastDuration,
            text: t('core.walletSetupMnemonicStepRevamp.recoveryPhrasePasted'),
            icon: Paste
          });
        }}
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
            back();
          }}
        />
      )}
    </>
  );
};
