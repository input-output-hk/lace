/* eslint-disable complexity, sonarjs/cognitive-complexity, max-statements, sonarjs/no-duplicate-string, unicorn/no-nested-ternary */
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { useTimeSpentOnPage, useWalletManager } from '@hooks';
import {
  MnemonicStage,
  MnemonicVideoPopupContent,
  WalletSetupNamePasswordStepRevamp,
  WalletSetupSteps,
  walletSetupWizard
} from '@lace/core';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { WarningModal } from '@src/views/browser-view/components/WarningModal';
import { PostHogAction, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';
import { Fallback } from './Fallback';
import { deleteFromLocalStorage } from '@src/utils/local-storage';
import { useAnalyticsContext } from '@providers';
import * as process from 'process';
import { SendOnboardingAnalyticsEvent, SetupType } from '../types';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';

const WalletSetupModeStep = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupModeStep }))
);

const WalletSetupMnemonicStepRevamp = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupMnemonicStepRevamp }))
);

const WalletSetupMnemonicVerificationStepRevamp = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupMnemonicVerificationStepRevamp }))
);

const wordList = wordlists.english;
const { CHAIN } = config();
const {
  KeyManagement: { util },
  Cardano: { ChainIds }
} = Wallet;
const DEFAULT_CHAIN_ID = ChainIds[CHAIN];

export interface WalletSetupWizardProps {
  setupType: SetupType;
  onCancel: () => void;
  sendAnalytics: SendOnboardingAnalyticsEvent;
  initialStep?: WalletSetupSteps;
}

const DEFAULT_MNEMONIC_LENGTH = 24;

export const WalletSetupWizard = ({
  onCancel,
  setupType,
  sendAnalytics,
  initialStep = WalletSetupSteps.Register
}: WalletSetupWizardProps): React.ReactElement => {
  const [currentStep, setCurrentStep] = useState<WalletSetupSteps>(initialStep);
  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [resetMnemonicStage, setResetMnemonicStage] = useState<MnemonicStage | ''>('');
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);
  const [isBackFromNextStep, setIsBackFromNextStep] = useState(false);
  const walletName = getWalletFromStorage()?.name;
  const { createWallet } = useWalletManager();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const { updateEnteredAtTime } = useTimeSpentOnPage();

  useEffect(() => {
    updateEnteredAtTime();
  }, [currentStep, updateEnteredAtTime]);

  useEffect(() => {
    setMnemonic(
      [SetupType.RESTORE, SetupType.FORGOT_PASSWORD].includes(setupType)
        ? () => Array.from({ length: mnemonicLength }).map(() => '')
        : util.generateMnemonicWords()
    );
  }, [mnemonicLength, setupType]);

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

  const walletSetupModeStepTranslations = {
    title: t('core.walletSetupWalletModeStep.title'),
    modes: t('core.walletSetupWalletModeStep.modes'),
    instructions: t('core.walletSetupWalletModeStep.instructions'),
    lightWalletOption: t('core.walletSetupWalletModeStep.lightWalletOption'),
    fullNodeOption: t('core.walletSetupWalletModeStep.fullNodeOption'),
    lightWalletDescription: t('core.walletSetupWalletModeStep.lightWalletDescription'),
    fullNodeWalletDescription: t('core.walletSetupWalletModeStep.fullNodeWalletDescription')
  };

  const mnemonicVideoPopupContentTranslations = {
    title: t('core.mnemonicVideoPopupContent.title'),
    description: t('core.mnemonicVideoPopupContent.description'),
    linkText: t('core.mnemonicVideoPopupContent.link'),
    closeButton: t('core.mnemonicVideoPopupContent.closeButton')
  };

  const walletSetupNamePasswordStepTranslations = {
    title:
      setupType === SetupType.FORGOT_PASSWORD
        ? t('core.walletNameAndPasswordSetupStep.forgotPasswordTitle')
        : t('core.walletNameAndPasswordSetupStep.title'),
    description:
      setupType === SetupType.FORGOT_PASSWORD
        ? t('core.walletNameAndPasswordSetupStep.forgotPasswordSubtitle')
        : t('core.walletNameAndPasswordSetupStep.description'),
    nameInputLabel: t('core.walletNameAndPasswordSetupStep.nameInputLabel'),
    nameMaxLength: t('core.walletNameAndPasswordSetupStep.nameMaxLength'),
    passwordInputLabel: t('core.walletNameAndPasswordSetupStep.passwordInputLabel'),
    confirmPasswordInputLabel: t('core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel'),
    nameRequiredMessage: t('core.walletNameAndPasswordSetupStep.nameRequiredMessage'),
    noMatchPassword: t('core.walletNameAndPasswordSetupStep.noMatchPassword'),
    confirmButton: t('core.walletNameAndPasswordSetupStep.enterWallet'),
    secondLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback'),
    firstLevelPasswordStrengthFeedback: t('core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback')
  };

  const moveBack = () => {
    const prevStep = walletSetupWizard[currentStep].prev;

    if (prevStep) {
      setCurrentStep(prevStep);
    } else {
      onCancel();
    }
  };

  const moveForward = useCallback(() => {
    const nextStep = walletSetupWizard[currentStep].next;
    setCurrentStep(nextStep);
  }, [currentStep]);

  const handleCompleteCreation = useCallback(
    async (name, password) => {
      try {
        const wallet = await createWallet({
          name,
          mnemonic,
          password,
          chainId: DEFAULT_CHAIN_ID
        });

        wallet.wallet.addresses$.subscribe((addresses) => {
          if (addresses.length === 0) return;
          const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
          if (setupType === SetupType.RESTORE && hdWalletDiscovered) {
            analytics.sendEventToPostHog(PostHogAction.OnboardingRestoreHdWallet);
          }
        });

        if (setupType === SetupType.FORGOT_PASSWORD) {
          deleteFromLocalStorage('isForgotPasswordFlow');
        } else {
          moveForward();
        }
      } catch (error) {
        console.error('Error completing wallet creation', error);
        throw new Error(error);
      }
    },
    [createWallet, mnemonic, analytics, setupType, moveForward]
  );

  const handleSubmit = async (result: { password: string; walletName: string }) => {
    void sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_WALLET);
    await handleCompleteCreation(result.walletName, result.password);
    void analytics.sendAliasEvent();
  };

  const handleMnemonicVerification = () => {
    sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
    moveForward();
  };

  const handleCloseMnemonicResetModal = () => {
    setIsResetMnemonicModalOpen(false);
    setResetMnemonicStage('');
    setIsBackFromNextStep(false);
  };

  const renderedMnemonicStep = () => {
    if ([SetupType.RESTORE, SetupType.FORGOT_PASSWORD].includes(setupType)) {
      const isMnemonicSubmitEnabled = util.validateMnemonic(util.joinMnemonicWords(mnemonic));
      return (
        <WalletSetupMnemonicVerificationStepRevamp
          mnemonic={mnemonic}
          onChange={setMnemonic}
          onCancel={setupType !== SetupType.FORGOT_PASSWORD && moveBack}
          onSubmit={handleMnemonicVerification}
          isSubmitEnabled={isMnemonicSubmitEnabled}
          translations={walletSetupMnemonicStepTranslations}
          suggestionList={wordList}
          defaultMnemonicLength={DEFAULT_MNEMONIC_LENGTH}
          onSetMnemonicLength={(value: number) => setMnemonicLength(value)}
          onPasteFromClipboard={() =>
            sendAnalytics(postHogOnboardingActions[setupType]?.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
          }
        />
      );
    }

    return (
      <WalletSetupMnemonicStepRevamp
        mnemonic={mnemonic}
        onReset={(resetStage) => {
          setResetMnemonicStage(resetStage);
          resetStage === 'input' ? setIsResetMnemonicModalOpen(true) : onCancel();
        }}
        renderVideoPopupContent={({ onClose }) => (
          <MnemonicVideoPopupContent
            translations={mnemonicVideoPopupContentTranslations}
            videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
            onClose={() => {
              onClose();
              void sendAnalytics(postHogOnboardingActions.create.RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK);
            }}
          />
        )}
        onNext={moveForward}
        onStepNext={(mnemonicStage) => {
          mnemonicStage === 'writedown'
            ? sendAnalytics(postHogOnboardingActions.create.SAVE_RECOVERY_PHRASE_NEXT_CLICK)
            : sendAnalytics(postHogOnboardingActions.create.ENTER_RECOVERY_PHRASE_NEXT_CLICK);
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
        onWatchVideoClick={() => sendAnalytics(postHogOnboardingActions.create.RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK)}
        onCopyToClipboard={() => sendAnalytics(postHogOnboardingActions.create.RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK)}
        onPasteFromClipboard={() =>
          sendAnalytics(postHogOnboardingActions.create.RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK)
        }
        isBackFromNextStep={isBackFromNextStep}
      />
    );
  };

  return (
    <WalletSetupLayout>
      {currentStep === WalletSetupSteps.Mnemonic && (
        <Suspense fallback={<Fallback />}>{renderedMnemonicStep()}</Suspense>
      )}
      {currentStep === WalletSetupSteps.Mode && (
        <Suspense fallback={<Fallback />}>
          <WalletSetupModeStep onBack={moveBack} onNext={moveForward} translations={walletSetupModeStepTranslations} />
        </Suspense>
      )}
      {currentStep === WalletSetupSteps.Register && (
        <WalletSetupNamePasswordStepRevamp
          onBack={() => {
            setIsBackFromNextStep(true);
            moveBack();
          }}
          onNext={handleSubmit}
          initialWalletName={walletName}
          translations={walletSetupNamePasswordStepTranslations}
        />
      )}
      {setupType === SetupType.CREATE && isResetMnemonicModalOpen && (
        <WarningModal
          header={t('browserView.walletSetup.mnemonicResetModal.header')}
          content={t('browserView.walletSetup.mnemonicResetModal.content')}
          visible={isResetMnemonicModalOpen}
          cancelLabel={t('browserView.walletSetup.mnemonicResetModal.cancel')}
          confirmLabel={t('browserView.walletSetup.mnemonicResetModal.confirm')}
          onCancel={handleCloseMnemonicResetModal}
          onConfirm={() => {
            handleCloseMnemonicResetModal();
            setMnemonic(util.generateMnemonicWords());
            if (resetMnemonicStage === 'writedown') {
              moveBack();
            }
          }}
        />
      )}
    </WalletSetupLayout>
  );
};
