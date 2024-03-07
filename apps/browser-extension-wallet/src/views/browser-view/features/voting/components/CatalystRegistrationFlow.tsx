/* eslint-disable sonarjs/no-duplicate-string */
import { Steps, useObservable } from '@lace/common';
import React, { useState } from 'react';
import styles from './CatalystRegistrationFlow.module.scss';
import {
  CatalystConfirmationStep,
  CatalystConfirmationStepProps,
  CatalystPinStep,
  CatalystRegisterStep,
  CatalystScanStep,
  DownloadCatalystStep,
  Wallet
} from '@lace/cardano';
import { WalletBasicInfo } from '@lace/core';
import { useWalletStore } from '@stores';
import { DEFAULT_WALLET_BALANCE } from '@utils/constants';
import { useTranslation } from 'react-i18next';

export const walletRegistrationSteps = ['download', 'register', 'pin', 'confirm', 'scan'] as const;

export type WalletRegistrationStep = typeof walletRegistrationSteps[number];

export interface CatalystRegistrationFlowProps {
  onCloseRequest: () => void;
  currentStep: WalletRegistrationStep;
  onCurrentStepChange: (step: WalletRegistrationStep) => void;
}

export const CatalystRegistrationFlow = ({
  onCloseRequest,
  currentStep,
  onCurrentStepChange
}: CatalystRegistrationFlowProps): React.ReactElement => {
  const [confirmationStage, setConfirmationStage] = useState<CatalystConfirmationStepProps['stage']>('unlock');
  const {
    walletInfo,
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const { t } = useTranslation();
  const totalBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);

  const confirmationStepTranslations = {
    confirmHeader: t('cardano.catalystConfirmationStep.confirmHeader'),
    confirmBody: t('cardano.catalystConfirmationStep.confirmBody'),
    register: t('cardano.catalystConfirmationStep.register'),
    totalFee: t('cardano.catalystConfirmationStep.totalFee'),
    cancelButton: t('cardano.general.cancelButton'),
    confirmButton: t('cardano.general.confirmButton')
  };

  const pinStepTranslations = {
    confirmPin: t('cardano.catalystPinStep.confirmPin'),
    setPin: t('cardano.catalystPinStep.setPin'),
    resetPin: t('cardano.catalystPinStep.resetPin'),
    pinNotMatching: t('cardano.catalystPinStep.pinNotMatching'),
    cancelButton: t('cardano.general.cancelButton'),
    confirmButton: t('cardano.general.confirmButton')
  };

  const registerStepTranslations = {
    registerNow: t('cardano.catalystRegistrationStep.activeStake'),
    cancelButton: t('cardano.general.cancelButton'),
    nextButton: t('cardano.general.nextButton')
  };

  const scanStepTranslations = {
    header: t('cardano.catalystScanStep.header'),
    body1: t('cardano.catalystScanStep.body1'),
    body2: t('cardano.catalystScanStep.body2'),
    downloadButton: t('cardano.catalystScanStep.downloadButton'),
    doneButton: t('cardano.catalystScanStep.doneButton')
  };

  const downloadStepTranslations = {
    cancelButton: t('cardano.general.cancelButton'),
    nextButton: t('cardano.general.nextButton')
  };

  const walletBasicInfoTranslations = {
    balance: t('core.walletBasicInfo.balance')
  };

  return (
    <div className={styles.catalystRegistration}>
      <Steps total={walletRegistrationSteps.length} current={walletRegistrationSteps.indexOf(currentStep)} />
      <div className={styles.content}>
        {currentStep === 'download' && (
          <DownloadCatalystStep
            googlePlayUrl={process.env.CATALYST_GOOGLE_PLAY_URL}
            appStoreUrl={process.env.CATALYST_APP_STORE_URL}
            onCancel={onCloseRequest}
            onNext={() => onCurrentStepChange('register')}
            translations={downloadStepTranslations}
          />
        )}
        {currentStep === 'register' && (
          <CatalystRegisterStep
            onCancel={onCloseRequest}
            onNext={() => onCurrentStepChange('pin')}
            translations={registerStepTranslations}
          />
        )}
        {currentStep === 'pin' && (
          <CatalystPinStep
            onCancel={onCloseRequest}
            onSubmit={() => onCurrentStepChange('confirm')}
            translations={pinStepTranslations}
          />
        )}
        {currentStep === 'confirm' && (
          <CatalystConfirmationStep
            walletPreview={
              <WalletBasicInfo
                walletAddress={walletInfo.addresses[0].address.toString()}
                walletName={walletInfo.name}
                balance={Wallet.util.getFormattedAmount({
                  amount: totalBalance.coins.toString(),
                  cardanoCoin
                })}
                translations={walletBasicInfoTranslations}
              />
            }
            // TODO: add password authorization form
            passwordForm={<div>Password form here</div>}
            fundNumber={8}
            fee="1.16 ₳"
            onConfirm={() => setConfirmationStage('confirm')}
            stage={confirmationStage}
            onCancel={onCloseRequest}
            translations={confirmationStepTranslations}
          />
        )}
        {currentStep === 'scan' && (
          <CatalystScanStep onSubmit={onCloseRequest} certificate="certificate" translations={scanStepTranslations} />
        )}
      </div>
    </div>
  );
};
