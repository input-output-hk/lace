/* eslint-disable complexity, sonarjs/cognitive-complexity, max-statements, sonarjs/no-duplicate-string, unicorn/no-nested-ternary */
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordlists } from 'bip39';
import { useLocalStorage, useTimeSpentOnPage, useWalletManager } from '@hooks';
import {
  MnemonicStage,
  WalletSetupCreationStep,
  MnemonicVideoPopupContent,
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
  const [walletName, setWalletName] = useState(getValueFromLocalStorage<ILocalStorage, 'wallet'>('wallet')?.name);
  const [password, setPassword] = useState('');
  const [walletInstance, setWalletInstance] = useState<Wallet.CardanoWallet | undefined>();
  const [mnemonicLength, setMnemonicLength] = useState<number>(DEFAULT_MNEMONIC_LENGTH);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletIsCreating, setWalletIsCreating] = useState(false);
  const [resetMnemonicStage, setResetMnemonicStage] = useState<MnemonicStage | ''>('');
  const [isResetMnemonicModalOpen, setIsResetMnemonicModalOpen] = useState(false);

  const { createWallet } = useWalletManager();
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

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
    body: t('core.walletSetupMnemonicStepRevamp.body'),
    enterPassphrase: t('core.walletSetupMnemonicStepRevamp.enterPassphrase'),
    enterPassphraseDescription: t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription'),
    writePassphraseSubtitle1: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1'),
    writePassphraseSubtitle2: t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'),
    passphraseError: t('core.walletSetupMnemonicStepRevamp.passphraseError'),
    enterWallet: t('core.walletSetupMnemonicStepRevamp.enterWallet'),
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

  const walletSetupCreateStepTranslations = {
    title: t('core.walletSetupCreateStep.title'),
    description: t('core.walletSetupCreateStep.description')
  };

  const walletSetupRecoveryPhraseLengthStepTranslations = {
    title: t('core.walletSetupRecoveryPhraseLengthStep.title'),
    description: t('core.walletSetupRecoveryPhraseLengthStep.description'),
    wordPassphrase: t('core.walletSetupRecoveryPhraseLengthStep.wordPassphrase')
  };

  const mnemonicVideoPopupContentTranslations = {
    title: t('core.mnemonicVideoPopupContent.title'),
    description: t('core.mnemonicVideoPopupContent.description'),
    linkText: t('core.mnemonicVideoPopupContent.link'),
    closeButton: t('core.mnemonicVideoPopupContent.closeButton')
  };

  /* const moveForward = useCallback(() => {
    const nextStep = walletSetupWizard[currentStep].next;
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }, [currentStep, setCurrentStep]);*/

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

  /* const handleAnalyticsChoice = async (isAccepted: boolean) => {
    setIsAnalyticsAccepted(isAccepted);
    await analytics.setOptedInForEnhancedAnalytics(
      isAccepted ? EnhancedAnalyticsOptInStatus.OptedIn : EnhancedAnalyticsOptInStatus.OptedOut
    );

    const postHogAnalyticsAgreeAction = postHogOnboardingActions[setupType]?.ANALYTICS_AGREE_CLICK;
    const postHogAnalyticcSkipAction = postHogOnboardingActions[setupType]?.ANALYTICS_SKIP_CLICK;

    const postHogAction = isAccepted ? postHogAnalyticsAgreeAction : postHogAnalyticcSkipAction;
    const postHogProperties = {
      // eslint-disable-next-line camelcase
      $set: { user_tracking_type: isAccepted ? UserTrackingType.Enhanced : UserTrackingType.Basic }
    };
    await sendAnalytics(postHogAction, postHogProperties);
    moveForward();
  };*/

  const goToMyWallet = useCallback(
    async (cardanoWallet: Wallet.CardanoWallet = walletInstance) => {
      if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn) {
        analytics.sendAliasEvent();
        const addresses = await firstValueFrom(cardanoWallet.wallet.addresses$.pipe(filter((a) => a.length > 0)));
        const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
        if (hdWalletDiscovered) {
          analytics.sendEventToPostHog(PostHogAction.OnboardingRestoreHdWallet);
        }
      }
    },
    [analytics, enhancedAnalyticsStatus, walletInstance]
  );

  const moveForward = useCallback(() => {
    const nextStep = walletSetupWizard[currentStep].next;
    if (nextStep) {
      setCurrentStep(nextStep);
    } else if (currentStep === WalletSetupSteps.Create) {
      goToMyWallet();
    }
  }, [currentStep, setCurrentStep, goToMyWallet]);

  const handleCompleteCreation = useCallback(async () => {
    try {
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
  }, [createWallet, walletName, mnemonic, password, analytics, setupType, goToMyWallet, moveForward]);

  const handleNamePasswordStepNextButtonClick = (result: { password: string; walletName: string }) => {
    setWalletName(result.walletName);
    setPassword(result.password);
    sendAnalytics(postHogOnboardingActions[setupType]?.WALLET_NAME_PASSWORD_NEXT_CLICK);
    skipTo(WalletSetupSteps.Mnemonic);
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
        <WalletSetupMnemonicVerificationStepRevamp
          mnemonic={mnemonic}
          onChange={setMnemonic}
          /* onCancel={() =>
            useDifferentMnemonicLengths
              ? skipTo(WalletSetupSteps.RecoveryPhraseLength)
              : skipTo(WalletSetupSteps.Register)
          }*/
          onCancel={moveBack}
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
          defaultMnemonicLength={DEFAULT_MNEMONIC_LENGTH}
          onSetMnemonicLength={(value: number) => setMnemonicLength(value)}
        />
      );
    }

    return (
      <WalletSetupMnemonicStepRevamp
        mnemonic={mnemonic}
        onReset={(resetStage) => {
          setResetMnemonicStage(resetStage);
          resetStage === 'input' ? setIsResetMnemonicModalOpen(true) : skipTo(WalletSetupSteps.Register);
        }}
        renderVideoPopupContent={({ onClose }) => (
          <MnemonicVideoPopupContent
            translations={mnemonicVideoPopupContentTranslations}
            onClickVideo={() => {
              // TODO: https://input-output.atlassian.net/browse/LW-9761 handle analytics here based on the stage argument
            }}
            videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
            onClose={onClose}
          />
        )}
        onNext={moveForward}
        onStepNext={() => {
          // TODO: https://input-output.atlassian.net/browse/LW-9761 handle analytics here based on the stage argument
        }}
        translations={walletSetupMnemonicStepTranslations}
        suggestionList={wordList}
        passphraseInfoLink={`${process.env.FAQ_URL}?question=what-happens-if-i-lose-my-recovery-phrase`}
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
