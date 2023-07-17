/* eslint-disable complexity, sonarjs/cognitive-complexity, max-statements, sonarjs/no-duplicate-string, unicorn/no-nested-ternary */
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { CreateWalletData, useLocalStorage, useTimeSpentOnPage, useWalletManager } from '@hooks';
import {
  MnemonicStage,
  WalletSetupAnalyticsStep,
  WalletSetupCreationStep,
  WalletSetupFinalStep,
  WalletSetupLegalStep,
  WalletSetupMnemonicIntroStep,
  WalletSetupPasswordStep,
  WalletSetupRecoveryPhraseLengthStep,
  WalletSetupRegisterStep,
  WalletSetupSteps,
  walletSetupWizard
} from '@lace/core';
import { Wallet } from '@lace/cardano';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { WarningModal } from '@src/views/browser-view/components/WarningModal';
import { AnalyticsConsentStatus, AnalyticsEventNames } from '@providers/AnalyticsProvider/analyticsTracker';
import { config } from '@src/config';

import { PinExtension } from './PinExtension';
import { Fallback } from './Fallback';

import { passwordTranslationMap } from '../constants';
import { deleteFromLocalStorage, getValueFromLocalStorage } from '@src/utils/local-storage';
import { ILocalStorage } from '@src/types';
import { useAnalyticsContext } from '@providers';
import { ANALYTICS_ACCEPTANCE_LS_KEY } from '@providers/AnalyticsProvider/analyticsTracker/config';
import * as process from 'process';

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

const { WalletSetup: Events } = AnalyticsEventNames;

export interface WalletSetupWizardProps {
  setupType: 'create' | 'restore' | 'forgot_password';
  onCancel: () => void;
  sendAnalytics: (eventName: string, value?: number) => void;
  initialStep?: WalletSetupSteps;
}

const DEFAULT_MNEMONIC_LENGTH = 24;

export const WalletSetupWizard = ({
  onCancel,
  setupType,
  sendAnalytics,
  initialStep = WalletSetupSteps.Legal
}: WalletSetupWizardProps): React.ReactElement => {
  const [currentStep, setCurrentStep] = useState<WalletSetupSteps>(
    setupType === 'forgot_password' ? WalletSetupSteps.Password : initialStep
  );
  const [walletName, setWalletName] = useState(getValueFromLocalStorage<ILocalStorage, 'wallet'>('wallet')?.name);
  const [password, setPassword] = useState('');
  const [walletInstance, setWalletInstance] = useState<CreateWalletData | undefined>();
  const [isAnalyticsAccepted, setSsAnalyticsAccepted] = useState(false);
  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletIsCreating, setWalletIsCreating] = useState(false);
  const [resetMnemonicStage, setResetMnemonicStage] = useState<MnemonicStage | ''>('');
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);

  const { createWallet, setWallet } = useWalletManager();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();

  const { calculateTimeSpentOnPage, updateEnteredAtTime } = useTimeSpentOnPage();

  const useDifferentMnemonicLengths = process.env.USE_DIFFERENT_MNEMONIC_LENGTHS === 'true';

  useEffect(() => {
    updateEnteredAtTime();
  }, [currentStep, updateEnteredAtTime]);

  useEffect(() => {
    setMnemonic(
      ['restore', 'forgot_password'].includes(setupType)
        ? () => Array.from({ length: mnemonicLength }).map(() => '')
        : util.generateMnemonicWords()
    );
  }, [mnemonicLength, setupType]);

  const walletSetupLegalStepTranslations = {
    title: t('core.walletSetupLegalStep.title'),
    toolTipText: t('core.walletSetupLegalStep.toolTipText')
  };

  const walletSetupAnalyticsStepTranslations = {
    back: t('core.walletSetupAnalyticsStep.back'),
    agree: t('core.walletSetupAnalyticsStep.agree'),
    title: t('core.walletSetupAnalyticsStep.title'),
    description: t('core.walletSetupAnalyticsStep.description'),
    optionsTitle: t('core.walletSetupAnalyticsStep.optionsTitle'),
    privacyPolicy: t('core.walletSetupAnalyticsStep.privacyPolicy'),
    allowOptout: t('core.walletSetupAnalyticsStep.allowOptout'),
    collectPrivateKeys: t('core.walletSetupAnalyticsStep.collectPrivateKeys'),
    collectIp: t('core.walletSetupAnalyticsStep.collectIp'),
    personalData: t('core.walletSetupAnalyticsStep.personalData')
  };

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

  const walletSetupMnemonicIntroStepTranslations = {
    title: t('core.walletSetupMnemonicIntroStep.title'),
    description: t('core.walletSetupMnemonicIntroStep.description'),
    linkText: t('core.walletSetupMnemonicIntroStep.link')
  };

  const walletSetupRegisterStepTranslations = {
    title: t('core.walletSetupRegisterStep.title'),
    description: t('core.walletSetupRegisterStep.description'),
    walletName: t('core.walletSetupRegisterStep.walletName'),
    nameRequired: t('core.walletSetupRegisterStep.nameRequired'),
    nameMaxLength: t('core.walletSetupRegisterStep.nameMaxLength')
  };

  const walletSetupPasswordStepTranslations = {
    title: t('core.walletSetupRegisterStep.titlePassword'),
    description: t('core.walletSetupRegisterStep.passwordDescription'),
    password: t('core.walletSetupRegisterStep.password'),
    confirmPassword: t('core.walletSetupRegisterStep.confirmPassword'),
    noMatchPassword: t('core.walletSetupRegisterStep.noMatchPassword'),
    validationMessage: t('core.walletSetupRegisterStep.validationMessage')
  };

  const walletSetupRecoveryPhraseLengthStepTranslations = {
    title: t('core.walletSetupRecoveryPhraseLengthStep.title'),
    description: t('core.walletSetupRecoveryPhraseLengthStep.description'),
    wordPassphrase: t('core.walletSetupRecoveryPhraseLengthStep.wordPassphrase')
  };

  const passwordFeedbackTranslation = (translationKeys: string[]) => {
    const translations = [];

    for (const key of translationKeys) {
      if (passwordTranslationMap[key]) {
        translations.push(t(passwordTranslationMap[key]));
      }
    }

    return translations;
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

  const [, { updateLocalStorage: setDoesUserAllowAnalytics }] = useLocalStorage(
    ANALYTICS_ACCEPTANCE_LS_KEY,
    AnalyticsConsentStatus.REJECTED
  );

  const handleAnalyticsChoice = (isAccepted: boolean) => {
    setSsAnalyticsAccepted(isAccepted);
    analytics.toogleCookies(isAccepted);
    sendAnalytics(isAccepted ? Events.ANALYTICS_AGREE : Events.ANALYTICS_SKIP);
    moveForward();
  };

  const goToMyWallet = useCallback(
    (wallet?: CreateWalletData) => {
      setWallet({ walletInstance: wallet || walletInstance, chainName: CHAIN });
    },
    [setWallet, walletInstance]
  );

  const handleCompleteCreation = useCallback(async () => {
    try {
      const wallet = await createWallet({
        name: walletName,
        mnemonic,
        password,
        chainId: DEFAULT_CHAIN_ID
      });
      setWalletInstance(wallet);
      setDoesUserAllowAnalytics(
        isAnalyticsAccepted ? AnalyticsConsentStatus.ACCEPTED : AnalyticsConsentStatus.REJECTED
      );
      if (setupType === 'forgot_password') {
        deleteFromLocalStorage('isForgotPasswordFlow');
        goToMyWallet(wallet);
      } else {
        moveForward();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error completing wallet creation', error);
      throw new Error(error);
    }
  }, [
    createWallet,
    mnemonic,
    moveForward,
    password,
    walletName,
    goToMyWallet,
    isAnalyticsAccepted,
    setDoesUserAllowAnalytics,
    setupType
  ]);

  useEffect(() => {
    if (password && currentStep === WalletSetupSteps.Create && !walletIsCreating) {
      setWalletIsCreating(true);
      handleCompleteCreation();
    }
  }, [password, currentStep, handleCompleteCreation, walletIsCreating]);

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const renderedMnemonicStep = () => {
    if (['restore', 'forgot_password'].includes(setupType)) {
      const isMnemonicSubmitEnabled = util.validateMnemonic(util.joinMnemonicWords(mnemonic));

      return (
        <WalletSetupMnemonicVerificationStep
          mnemonic={mnemonic}
          onChange={setMnemonic}
          onCancel={() =>
            useDifferentMnemonicLengths
              ? skipTo(WalletSetupSteps.RecoveryPhraseLength)
              : skipTo(WalletSetupSteps.Password)
          }
          onSubmit={moveForward}
          onStepNext={(step: number) => {
            /* eslint-disable no-magic-numbers */
            switch (step) {
              case 0:
                sendAnalytics(Events.MNEMONICS_INPUT_0_NEXT);
                break;
              case 1:
                sendAnalytics(Events.MNEMONICS_INPUT_1_NEXT);
                break;
              case 2:
                sendAnalytics(Events.MNEMONICS_INPUT_2_NEXT);
            }
            /* eslint-enable no-magic-numbers */
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
          setIsResetMnemonicModalOpen(true);
        }}
        onNext={moveForward}
        onStepNext={(stage: MnemonicStage, step: number) => {
          /* eslint-disable no-magic-numbers */
          switch (step) {
            case 0:
              stage === 'input'
                ? sendAnalytics(Events.MNEMONICS_INPUT_0_NEXT)
                : sendAnalytics(Events.MNEMONICS_WRITEDOWN_0_NEXT);
              break;
            case 1:
              stage === 'input'
                ? sendAnalytics(Events.MNEMONICS_INPUT_1_NEXT)
                : sendAnalytics(Events.MNEMONICS_WRITEDOWN_1_NEXT);
              break;
            case 2:
              stage === 'input'
                ? sendAnalytics(Events.MNEMONICS_INPUT_2_NEXT)
                : sendAnalytics(Events.MNEMONICS_WRITEDOWN_2_NEXT);
          }
          /* eslint-enable no-magic-numbers */
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
      />
    );
  };

  return (
    <WalletSetupLayout prompt={currentStep === WalletSetupSteps.Finish ? <PinExtension /> : undefined}>
      {currentStep === WalletSetupSteps.Legal && (
        <WalletSetupLegalStep
          onBack={moveBack}
          onNext={() => {
            sendAnalytics(Events.LEGAL_STUFF_NEXT, calculateTimeSpentOnPage());
            moveForward();
          }}
          translations={walletSetupLegalStepTranslations}
        />
      )}
      {currentStep === WalletSetupSteps.Analytics && (
        <WalletSetupAnalyticsStep
          onDeny={() => handleAnalyticsChoice(false)}
          onAccept={() => handleAnalyticsChoice(true)}
          onBack={moveBack}
          translations={walletSetupAnalyticsStepTranslations}
        />
      )}
      {currentStep === WalletSetupSteps.PreMnemonic && (
        <WalletSetupMnemonicIntroStep
          onBack={moveBack}
          onNext={moveForward}
          translations={walletSetupMnemonicIntroStepTranslations}
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
        <WalletSetupRegisterStep
          onBack={moveBack}
          onNext={(result) => {
            sendAnalytics(Events.WALLET_NAME_NEXT);
            setWalletName(result.walletName);
            moveForward();
          }}
          initialWalletName={walletName}
          translations={walletSetupRegisterStepTranslations}
        />
      )}
      {currentStep === WalletSetupSteps.Password && (
        <WalletSetupPasswordStep
          onBack={setupType !== 'forgot_password' ? moveBack : undefined}
          onNext={(result) => {
            sendAnalytics(Events.WALLET_PASSWORD_NEXT);
            setPassword(result.password);
            setupType === 'create'
              ? skipTo(WalletSetupSteps.PreMnemonic)
              : useDifferentMnemonicLengths
              ? skipTo(WalletSetupSteps.RecoveryPhraseLength)
              : skipTo(WalletSetupSteps.Mnemonic);
          }}
          translations={walletSetupPasswordStepTranslations}
          getFeedbackTranslations={passwordFeedbackTranslation}
        />
      )}
      {currentStep === WalletSetupSteps.RecoveryPhraseLength && (
        <WalletSetupRecoveryPhraseLengthStep
          onBack={moveBack}
          onNext={(result) => {
            setMnemonicLength(result.recoveryPhraseLength);
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
            sendAnalytics(Events.SETUP_FINISHED_NEXT);
            goToMyWallet();
          }}
          translations={walletSetupFinalStepTranslations}
        />
      )}
      {setupType === 'create' && isResetMnemonicModalOpen && (
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
