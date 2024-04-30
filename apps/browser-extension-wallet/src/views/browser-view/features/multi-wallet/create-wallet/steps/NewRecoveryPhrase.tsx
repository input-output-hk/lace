import { MnemonicStage, MnemonicVideoPopupContent, WalletSetupMnemonicStepRevamp } from '@lace/core';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { WarningModal } from '@src/views/browser-view/components';
import { useCreateWallet } from '../context';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';

const wordList = wordlists.english;

interface State {
  isResetMnemonicModalOpen: boolean;
  mnemonicStage: MnemonicStage;
}

export const NewRecoveryPhrase = (): JSX.Element => {
  const { t } = useTranslation();
  const { back, createWalletData, generateMnemonic, next, setFormDirty } = useCreateWallet();
  const analytics = useAnalyticsContext();
  const [state, setState] = useState<State>(() => ({
    isResetMnemonicModalOpen: false,
    mnemonicStage: 'writedown'
  }));

  const [isBackFromNextStep, setIsBackFromNextStep] = useState(false);

  const walletSetupMnemonicStepTranslations = {
    writePassphraseTitle: t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'),
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription'),
    writePassphraseSubtitle1: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1'),
    writePassphraseSubtitle2: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterPassphraseLength: t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength'),
    copyToClipboard: t('core.walletSetupMnemonicStepRevamp.copyToClipboard'),
    pasteFromClipboard: t('core.walletSetupMnemonicStepRevamp.pasteFromClipboard')
  };

  const mnemonicVideoPopupContentTranslations = {
    title: t('core.mnemonicVideoPopupContent.title'),
    description: t('core.mnemonicVideoPopupContent.description'),
    linkText: t('core.mnemonicVideoPopupContent.link'),
    closeButton: t('core.mnemonicVideoPopupContent.closeButton')
  };

  const onMnemonicReset = (mnemonicStage: MnemonicStage) => {
    if (mnemonicStage === 'writedown') {
      back();
    }
    setFormDirty(false);
    setState((prevState) => ({
      ...prevState,
      isResetMnemonicModalOpen: true,
      mnemonicStage
    }));
    setIsBackFromNextStep(false);
  };

  return (
    <>
      <WalletSetupMnemonicStepRevamp
        mnemonic={createWalletData.mnemonic}
        onReset={onMnemonicReset}
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
        onNext={next}
        onStepNext={(currentMnemonicStage: MnemonicStage) => {
          if (currentMnemonicStage === 'input') {
            void analytics.sendEventToPostHog(postHogMultiWalletActions.create.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
            return;
          }

          setFormDirty(true);
          void analytics.sendEventToPostHog(postHogMultiWalletActions.create.SAVE_RECOVERY_PHRASE_NEXT_CLICK);
        }}
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
        isBackFromNextStep={isBackFromNextStep}
      />
      {state.isResetMnemonicModalOpen && (
        <WarningModal
          header={t('browserView.walletSetup.mnemonicResetModal.header')}
          content={t('browserView.walletSetup.mnemonicResetModal.content')}
          visible={state.isResetMnemonicModalOpen}
          cancelLabel={t('browserView.walletSetup.mnemonicResetModal.cancel')}
          confirmLabel={t('browserView.walletSetup.mnemonicResetModal.confirm')}
          onCancel={() => {
            setState((s) => ({
              ...s,
              isResetMnemonicModalOpen: false
            }));
          }}
          onConfirm={() => {
            if (state.mnemonicStage === 'writedown') {
              back();
              return;
            }

            setState({
              mnemonicStage: 'writedown',
              isResetMnemonicModalOpen: false
            });

            generateMnemonic();
          }}
        />
      )}
    </>
  );
};
