import { MnemonicStage, MnemonicVideoPopupContent, WalletSetupMnemonicStepRevamp } from '@lace/core';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { wordlists } from 'bip39';
import { WarningModal } from '@src/views/browser-view/components';
import { useCreateWallet } from '../context';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks/useWalletManager';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { PostHogAction } from '@lace/common';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';
import { postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';

const wordList = wordlists.english;

interface State {
  isResetMnemonicModalOpen: boolean;
  resetMnemonicStage: MnemonicStage;
}

export const NewRecoveryPhrase = (): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();
  const { generatedMnemonic, data } = useCreateWallet();
  const { createWallet, walletRepository } = useWalletManager();
  const analytics = useAnalyticsContext();
  const [state, setState] = useState<State>(() => ({
    isResetMnemonicModalOpen: false,
    resetMnemonicStage: 'writedown'
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

  const clearSecrets = useCallback(() => {
    for (let i = 0; i < data.mnemonic.length; i++) {
      data.mnemonic[i] = '';
    }
    data.password = '';
  }, [data]);

  const saveWallet = useCallback(async () => {
    const { source } = await createWallet(data);
    await analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateAdded, {
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
        onReset={(resetStage) => {
          setState((s) => ({ ...s, isResetMnemonicModalOpen: true, resetMnemonicStage: resetStage }));
          resetStage === 'input' && setIsBackFromNextStep(false);
        }}
        renderVideoPopupContent={({ onClose }) => (
          <MnemonicVideoPopupContent
            translations={mnemonicVideoPopupContentTranslations}
            videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
            onClose={() => {
              onClose();
              void analytics.sendEventToPostHog(
                postHogOnboardingActions.create.RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK
              );
            }}
          />
        )}
        onNext={saveWallet}
        onStepNext={(mnemonicStage: MnemonicStage) => {
          mnemonicStage === 'writedown'
            ? analytics.sendEventToPostHog(postHogOnboardingActions.create.SAVE_RECOVERY_PHRASE_NEXT_CLICK)
            : analytics.sendEventToPostHog(postHogOnboardingActions.create.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
        onWatchVideoClick={() =>
          analytics.sendEventToPostHog(postHogOnboardingActions.create.RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK)
        }
        onCopyToClipboard={() =>
          analytics.sendEventToPostHog(postHogOnboardingActions.create.RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK)
        }
        onPasteFromClipboard={() =>
          analytics.sendEventToPostHog(postHogOnboardingActions.create.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
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
            if (state.resetMnemonicStage === 'writedown') {
              history.goBack();
              return;
            }

            setState({
              resetMnemonicStage: 'writedown',
              isResetMnemonicModalOpen: false
            });

            generatedMnemonic();
          }}
        />
      )}
    </>
  );
};
