/* eslint-disable complexity, sonarjs/cognitive-complexity, max-statements, sonarjs/no-duplicate-string, unicorn/no-nested-ternary */
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { useLocalStorage, useTimeSpentOnPage, useWalletManager } from '@hooks';
import {
  MnemonicStage,
  WalletSetupCreationStep,
  WalletSetupFinalStep,
  WalletSetupMnemonicIntroStep,
  WalletSetupNamePasswordStep,
  WalletSetupRecoveryPhraseLengthStep,
  WalletSetupSteps,
  walletSetupWizard
} from '@lace/core';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { WarningModal } from '@src/views/browser-view/components/WarningModal';
import {
  EnhancedAnalyticsOptInStatus,
  PostHogAction,
  postHogOnboardingActions
} from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';

import { Fallback } from './Fallback';

import { deleteFromLocalStorage, getValueFromLocalStorage } from '@src/utils/local-storage';
import { ILocalStorage } from '@src/types';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import * as process from 'process';
import { SendOnboardingAnalyticsEvent, SetupType } from '../types';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { filter, firstValueFrom } from 'rxjs';
import { useWalletStore } from '@src/stores';
// import { walletSetupWizardRevamp } from '@lace/core/dist/ui/components/WalletSetupRevamp/wallet-steps-revamp';

const WalletSetupModeStep = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupModeStep }))
);

const WalletSetupMnemonicStep = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupMnemonicStep }))
);

const WalletSetupMnemonicVerificationStep = React.lazy(() =>
  import('@lace/core').then((module) => ({ default: module.WalletSetupMnemonicVerificationStep }))
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
  const [walletName, setWalletName] = useState(getValueFromLocalStorage<ILocalStorage, 'wallet'>('wallet')?.name);
  const [password, setPassword] = useState('');
  const [walletInstance, setWalletInstance] = useState<Wallet.CardanoWallet | undefined>();
  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletIsCreating, setWalletIsCreating] = useState(false);
  const [resetMnemonicStage, setResetMnemonicStage] = useState<MnemonicStage | ''>('');
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const { createWallet } = useWalletManager();
  const { setStayOnAllDonePage } = useWalletStore();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const { updateEnteredAtTime } = useTimeSpentOnPage();

  const useDifferentMnemonicLengths = process.env.USE_DIFFERENT_MNEMONIC_LENGTHS === 'true';
  const isAnalyticsAccepted = enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn;

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
    writePassphrase: t('core.walletSetupMnemonicStep.writePassphrase'),
    body: t('core.walletSetupMnemonicStep.body'),
    enterPassphrase: t('core.walletSetupMnemonicStep.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStep.enterPassphraseDescription'),
    passphraseInfo1: t('core.walletSetupMnemonicStep.passphraseInfo1'),
    passphraseInfo2: t('core.walletSetupMnemonicStep.passphraseInfo2'),
    passphraseInfo3: t('core.walletSetupMnemonicStep.passphraseInfo3'),
    passphraseError: t('core.walletSetupMnemonicStep.passphraseError')
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

  const walletSetupCreateStepTranslations = {
    title: t('core.walletSetupCreateStep.title'),
    description: t('core.walletSetupCreateStep.description')
  };

  const walletSetupFinalStepTranslations = {
    title: t('core.walletSetupFinalStep.title'),
    description: t('core.walletSetupFinalStep.description'),
    close: t('core.walletSetupFinalStep.close'),
    followTwitter: t('core.walletSetupFinalStep.followTwitter'),
    followYoutube: t('core.walletSetupFinalStep.followYoutube'),
    followDiscord: t('core.walletSetupFinalStep.followDiscord')
  };

  const walletSetupRecoveryPhraseLengthStepTranslations = {
    title: t('core.walletSetupRecoveryPhraseLengthStep.title'),
    description: t('core.walletSetupRecoveryPhraseLengthStep.description'),
    wordPassphrase: t('core.walletSetupRecoveryPhraseLengthStep.wordPassphrase')
  };

  const moveForward = useCallback(() => {
    const nextStep = walletSetupWizard[currentStep].next;
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }, [currentStep, setCurrentStep]);

  const moveBack = () => {
    const prevStep = walletSetupWizard[currentStep].prev;

    if (prevStep) {
      setCurrentStep(prevStep);
    } else {
      onCancel();
    }
  };

  const skipTo = (walletStep: WalletSetupSteps) => {
    setCurrentStep(walletStep);
  };

  const goToMyWallet = useCallback(
    async (cardanoWallet: Wallet.CardanoWallet = walletInstance) => {
      setStayOnAllDonePage(false);
      if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn) {
        analytics.sendAliasEvent();
        const addresses = await firstValueFrom(cardanoWallet.wallet.addresses$.pipe(filter((a) => a.length > 0)));
        const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
        if (hdWalletDiscovered) {
          analytics.sendEventToPostHog(PostHogAction.OnboardingRestoreHdWallet);
        }
      }
    },
    [analytics, enhancedAnalyticsStatus, setStayOnAllDonePage, walletInstance]
  );

  const handleCompleteCreation = useCallback(async () => {
    try {
      setStayOnAllDonePage(true);

      const wallet = await createWallet({
        name: walletName,
        mnemonic,
        password,
        chainId: DEFAULT_CHAIN_ID
      });
      setWalletInstance(wallet);

      wallet.wallet.addresses$.subscribe((addresses) => {
        if (addresses.length === 0) return;
        const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
        if (setupType === SetupType.RESTORE && hdWalletDiscovered) {
          analytics.sendEventToPostHog(PostHogAction.OnboardingRestoreHdWallet);
        }
      });

      if (setupType === SetupType.FORGOT_PASSWORD) {
        deleteFromLocalStorage('isForgotPasswordFlow');
        goToMyWallet(wallet);
      } else {
        moveForward();
      }
    } catch (error) {
      console.error('Error completing wallet creation', error);
      throw new Error(error);
    }
  }, [
    createWallet,
    setStayOnAllDonePage,
    walletName,
    mnemonic,
    password,
    analytics,
    setupType,
    goToMyWallet,
    moveForward
  ]);

  const createFlowPasswordNextStep = () => {
    setupType === SetupType.CREATE
      ? skipTo(WalletSetupSteps.Mnemonic)
      : useDifferentMnemonicLengths
      ? skipTo(WalletSetupSteps.RecoveryPhraseLength)
      : skipTo(WalletSetupSteps.Mnemonic);
  };

  const handleNamePasswordStepNextButtonClick = (result: { password: string; walletName: string }) => {
    setPassword(result.password);
    setWalletName(result.walletName);
    sendAnalytics(postHogOnboardingActions[setupType]?.WALLET_NAME_PASSWORD_NEXT_CLICK);
    createFlowPasswordNextStep();
  };

  useEffect(() => {
    if (password && currentStep === WalletSetupSteps.Create && !walletIsCreating) {
      setWalletIsCreating(true);
      handleCompleteCreation();
    }
  }, [password, currentStep, handleCompleteCreation, walletIsCreating]);

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const renderedMnemonicStep = () => {
    if ([SetupType.RESTORE, SetupType.FORGOT_PASSWORD].includes(setupType)) {
      const isMnemonicSubmitEnabled = util.validateMnemonic(util.joinMnemonicWords(mnemonic));

      return (
        <WalletSetupMnemonicVerificationStep
          mnemonic={mnemonic}
          onChange={setMnemonic}
          onCancel={() =>
            useDifferentMnemonicLengths
              ? skipTo(WalletSetupSteps.RecoveryPhraseLength)
              : skipTo(WalletSetupSteps.Register)
          }
          onSubmit={moveForward}
          onStepNext={(step: number) => {
            /* eslint-disable no-magic-numbers */
            switch (step) {
              case 0:
                sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_01_NEXT_CLICK);
                break;
              case 1:
                sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_09_NEXT_CLICK);
                break;
              case 2:
                sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_17_NEXT_CLICK);
            }
          }}
          isSubmitEnabled={isMnemonicSubmitEnabled}
          translations={walletSetupMnemonicStepTranslations}
          suggestionList={wordList}
        />
      );
    }

    return (
      <WalletSetupMnemonicStep
        mnemonic={mnemonic}
        onReset={(resetStage) => {
          setResetMnemonicStage(resetStage);
          resetStage === 'input' ? setIsResetMnemonicModalOpen(true) : skipTo(WalletSetupSteps.Register);
        }}
        onNext={moveForward}
        onStepNext={(stage: MnemonicStage, step: number) => {
          /* eslint-disable no-magic-numbers */
          switch (step) {
            case 0:
              stage === 'input'
                ? sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_01_NEXT_CLICK)
                : sendAnalytics(postHogOnboardingActions[setupType]?.WRITE_PASSPHRASE_01_NEXT_CLICK);
              break;
            case 1:
              stage === 'input'
                ? sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_09_NEXT_CLICK)
                : sendAnalytics(postHogOnboardingActions[setupType]?.WRITE_PASSPHRASE_09_NEXT_CLICK);
              break;
            case 2:
              stage === 'input'
                ? sendAnalytics(postHogOnboardingActions[setupType]?.ENTER_PASSPHRASE_17_NEXT_CLICK)
                : sendAnalytics(postHogOnboardingActions[setupType]?.WRITE_PASSPHRASE_17_NEXT_CLICK);
          }
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
      />
    );
  };

  return (
    <WalletSetupLayout>
      {currentStep === WalletSetupSteps.PreMnemonic && (
        <WalletSetupMnemonicIntroStep
          onBack={moveBack}
          onNext={() => {
            analytics.sendEventToPostHog(postHogOnboardingActions[setupType]?.PASSPHRASE_INTRO_NEXT_CLICK);
            moveForward();
          }}
          translations={walletSetupMnemonicIntroStepTranslations}
          onClickVideo={() =>
            analytics.sendEventToPostHog(postHogOnboardingActions[setupType]?.PASSPHRASE_INTRO_PLAY_VIDEO_CLICK)
          }
          videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
        />
      )}
      {currentStep === WalletSetupSteps.Mnemonic && (
        <Suspense fallback={<Fallback />}>{renderedMnemonicStep()}</Suspense>
      )}
      {currentStep === WalletSetupSteps.Mode && (
        <Suspense fallback={<Fallback />}>
          <WalletSetupModeStep onBack={moveBack} onNext={moveForward} translations={walletSetupModeStepTranslations} />
        </Suspense>
      )}
      {currentStep === WalletSetupSteps.Register && (
        <WalletSetupNamePasswordStep onBack={moveBack} onNext={handleNamePasswordStepNextButtonClick} />
      )}
      {currentStep === WalletSetupSteps.RecoveryPhraseLength && (
        <WalletSetupRecoveryPhraseLengthStep
          onBack={moveBack}
          onNext={(result) => {
            setMnemonicLength(result.recoveryPhraseLength);
            analytics.sendEventToPostHog(postHogOnboardingActions[setupType]?.RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK);
            moveForward();
          }}
          translations={walletSetupRecoveryPhraseLengthStepTranslations}
        />
      )}
      {currentStep === WalletSetupSteps.Create && (
        <WalletSetupCreationStep translations={walletSetupCreateStepTranslations} />
      )}
      {currentStep === WalletSetupSteps.Finish && (
        <WalletSetupFinalStep
          onFinish={() => {
            sendAnalytics(postHogOnboardingActions[setupType]?.DONE_GO_TO_WALLET);
            goToMyWallet();
          }}
          translations={walletSetupFinalStepTranslations}
        />
      )}
      {setupType === SetupType.CREATE && isResetMnemonicModalOpen && (
        <WarningModal
          header={t('browserView.walletSetup.mnemonicResetModal.header')}
          content={t('browserView.walletSetup.mnemonicResetModal.content')}
          visible={isResetMnemonicModalOpen}
          cancelLabel={t('browserView.walletSetup.mnemonicResetModal.cancel')}
          confirmLabel={t('browserView.walletSetup.mnemonicResetModal.confirm')}
          onCancel={() => {
            setIsResetMnemonicModalOpen(false);
            setResetMnemonicStage('');
          }}
          onConfirm={() => {
            setMnemonic(util.generateMnemonicWords());
            setIsResetMnemonicModalOpen(false);
            if (resetMnemonicStage === 'writedown') {
              moveBack();
            }
            setResetMnemonicStage('');
          }}
        />
      )}
    </WalletSetupLayout>
  );
};
