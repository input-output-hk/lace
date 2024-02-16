import { MnemonicStage, WalletSetupMnemonicStep } from '@lace/core';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { wordlists } from 'bip39';
import { WarningModal } from '@src/views/browser-view/components';
import { useCreateWallet } from '../context';
import { walletRoutePaths } from '@routes';

const noop = (): void => void 0;

const wordList = wordlists.english;

interface State {
  isResetMnemonicModalOpen: boolean;
  resetMnemonicStage: MnemonicStage;
}

export const NewRecoveryPhrase = (): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();
  const { generatedMnemonic, data } = useCreateWallet();
  const [state, setState] = useState<State>(() => ({
    isResetMnemonicModalOpen: false,
    resetMnemonicStage: 'writedown'
  }));

  const walletSetupMnemonicStepTranslations = {
    writePassphrase: t('core.walletSetupMnemonicStep.writePassphrase'),
    enterPassphrase: t('core.walletSetupMnemonicStep.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStep.enterPassphraseDescription'),
    passphraseInfo1: t('core.walletSetupMnemonicStep.passphraseInfo1'),
    passphraseInfo2: t('core.walletSetupMnemonicStep.passphraseInfo2'),
    passphraseInfo3: t('core.walletSetupMnemonicStep.passphraseInfo3'),
    passphraseError: t('core.walletSetupMnemonicStep.passphraseError')
  };

  return (
    <>
      <WalletSetupMnemonicStep
        mnemonic={data.mnemonic}
        onReset={(resetStage) =>
          setState((s) => ({ ...s, isResetMnemonicModalOpen: true, resetMnemonicStage: resetStage }))
        }
        onNext={() => history.push(walletRoutePaths.assets)}
        onStepNext={noop}
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
