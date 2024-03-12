import { MnemonicStage, WalletSetupMnemonicStep } from '@lace/core';
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

const wordList = wordlists.english;

const PASSPHRASE_STEP_1 = 0;
const PASSPHRASE_STEP_2 = 1;
const PASSPHRASE_STEP_3 = 2;

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

  const walletSetupMnemonicStepTranslations = {
    writePassphrase: t('core.walletSetupMnemonicStep.writePassphrase'),
    body: t('core.walletSetupMnemonicStep.body'),
    enterPassphrase: t('core.walletSetupMnemonicStep.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStep.enterPassphraseDescription'),
    passphraseInfo1: t('core.walletSetupMnemonicStep.passphraseInfo1'),
    passphraseInfo2: t('core.walletSetupMnemonicStep.passphraseInfo2'),
    passphraseInfo3: t('core.walletSetupMnemonicStep.passphraseInfo3'),
    passphraseError: t('core.walletSetupMnemonicStep.passphraseError')
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
      $set: { walletAccountsQty: await getWalletAccountsQtyString(walletRepository) }
    });
    await analytics.sendMergeEvent(source.account.extendedAccountPublicKey);
    clearSecrets();
    history.push(walletRoutePaths.assets);
  }, [data, createWallet, history, clearSecrets, analytics, walletRepository]);

  return (
    <>
      <WalletSetupMnemonicStep
        mnemonic={data.mnemonic}
        onReset={(resetStage) =>
          setState((s) => ({ ...s, isResetMnemonicModalOpen: true, resetMnemonicStage: resetStage }))
        }
        onNext={saveWallet}
        onStepNext={(stage: MnemonicStage, step: number) => {
          switch (step) {
            case PASSPHRASE_STEP_1:
              stage === 'input'
                ? analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateEnterPassphrase01NextClick)
                : analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateWritePassphrase01NextClick);
              break;
            case PASSPHRASE_STEP_2:
              stage === 'input'
                ? analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateEnterPassphrase09NextClick)
                : analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateWritePassphrase09NextClick);
              break;
            case PASSPHRASE_STEP_3:
              stage === 'input'
                ? analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateEnterPassphrase17NextClick)
                : analytics.sendEventToPostHog(PostHogAction.MultiwalletCreateWritePassphrase17NextClick);
          }
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
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
