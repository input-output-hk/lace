import React, { useRef } from 'react';
import styles from './WalletSetupStepLayout.module.scss';
import cn from 'classnames';
import { Button, Timeline } from '@lace/common';
import { Tooltip } from 'antd';
import { urls } from '../../utils/constants';
import { useTranslate } from '@ui/hooks/useTranslate';
import i18n from '@ui/lib/i18n';
import { WalletSetupFlow, useWalletSetupFlow } from './WalletSetupFlowProvider';

export enum WalletTimelineSteps {
  LEGAL_AND_ANALYTICS,
  WALLET_SETUP,
  RECOVERY_PHRASE,
  ALL_DONE,
  CONNECT_WALLET,
  NAME_WALLET
}
export interface WalletSetupStepLayoutProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  belowContentText?: React.ReactNode;
  description?: React.ReactNode;
  linkText?: React.ReactNode;
  stepInfoText?: string;
  onNext?: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  isNextEnabled?: boolean;
  isNextLoading?: boolean;
  toolTipText?: string;
  currentTimelineStep?: WalletTimelineSteps;
  isHardwareWallet?: boolean;
}

const removeLegalAndAnalyticsStep = (
  steps: {
    key: WalletTimelineSteps;
    name: string;
  }[]
) => {
  steps.shift();
};

const getTimelineSteps = (currentStep: WalletTimelineSteps, isHardwareWallet: boolean, flow: WalletSetupFlow) => {
  const inMemoryWalletSteps = [
    { key: WalletTimelineSteps.LEGAL_AND_ANALYTICS, name: i18n.t('core.walletSetupStep.legalAndAnalytics') },
    { key: WalletTimelineSteps.WALLET_SETUP, name: i18n.t('core.walletSetupStep.walletSetup') },
    { key: WalletTimelineSteps.RECOVERY_PHRASE, name: i18n.t('core.walletSetupStep.recoveryPhrase') },
    { key: WalletTimelineSteps.ALL_DONE, name: i18n.t('core.walletSetupStep.allDone') }
  ];

  const hardwareWalletSteps = [
    { key: WalletTimelineSteps.LEGAL_AND_ANALYTICS, name: i18n.t('core.walletSetupStep.legalAndAnalytics') },
    { key: WalletTimelineSteps.CONNECT_WALLET, name: i18n.t('core.walletSetupStep.connectWallet') },
    { key: WalletTimelineSteps.NAME_WALLET, name: i18n.t('core.walletSetupStep.nameWallet') },
    { key: WalletTimelineSteps.ALL_DONE, name: i18n.t('core.walletSetupStep.allDone') }
  ];

  const walletSteps = isHardwareWallet ? hardwareWalletSteps : inMemoryWalletSteps;

  if (flow === WalletSetupFlow.ADD_WALLET) {
    // remove legal and analytics step
    removeLegalAndAnalyticsStep(walletSteps);
  }

  if (typeof currentStep !== 'undefined') {
    const currentStepIndex = walletSteps.findIndex((step) => step.key === currentStep);
    return walletSteps.map((step, index) => ({ ...step, active: index <= currentStepIndex }));
  }

  return walletSteps.map((step) => ({ ...step, active: false }));
};

export const WalletSetupStepLayout = ({
  children,
  title,
  description,
  linkText,
  stepInfoText,
  belowContentText,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  backLabel,
  skipLabel,
  isNextEnabled = true,
  isNextLoading = false,
  toolTipText,
  currentTimelineStep,
  isHardwareWallet = false
}: WalletSetupStepLayoutProps): React.ReactElement => {
  const { t } = useTranslate();
  const nextButtonContainerRef = useRef(null);
  const flow = useWalletSetupFlow();

  const defaultLabel = {
    next: t('core.walletSetupStep.next'),
    back: t('core.walletSetupStep.back'),
    skip: t('core.walletSetupStep.skip')
  };

  const timelineSteps = getTimelineSteps(currentTimelineStep, isHardwareWallet, flow);

  return (
    <div className={styles.walletSetupStepLayout} data-testid="wallet-setup-step-layout">
      <div className={styles.sideTimelineContainer}>
        <Timeline>
          {timelineSteps.map(({ name, key, active }) => (
            <Timeline.Item key={key} active={active}>
              <div className={cn({ [styles.activeText]: currentTimelineStep === key })}>{name}</div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
      <div className={styles.container}>
        <div className={styles.header} data-testid="wallet-setup-step-header">
          <h1 data-testid="wallet-setup-step-title">{title}</h1>
          {description && (
            <p data-testid="wallet-setup-step-subtitle">
              {description}{' '}
              <a href={urls.faq.secretPassphrase} target="_blank" data-testid="faq-secret-passphrase-url">
                {linkText}
              </a>
            </p>
          )}
        </div>
        <div className={styles.content} data-testid="wallet-setup-step-content">
          {children}
        </div>
        {belowContentText}
        <div className={styles.footer} data-testid="wallet-setup-step-footer">
          {onBack ? (
            <Button color="secondary" onClick={onBack} data-testid="wallet-setup-step-btn-back">
              {backLabel || defaultLabel.back}
            </Button>
          ) : (
            <div />
          )}
          {stepInfoText && <p data-testid="step-info-text">{stepInfoText}</p>}
          {onSkip && (
            <Button variant="text" onClick={onSkip} data-testid="wallet-setup-step-btn-skip">
              {skipLabel || defaultLabel.skip}
            </Button>
          )}
          {onNext && (
            <span ref={nextButtonContainerRef}>
              <Tooltip
                visible={!isNextEnabled && !!toolTipText}
                title={!isNextEnabled && toolTipText}
                getPopupContainer={() => nextButtonContainerRef.current}
                autoAdjustOverflow={false}
              >
                <Button
                  disabled={!isNextEnabled}
                  onClick={onNext}
                  loading={isNextLoading}
                  data-testid="wallet-setup-step-btn-next"
                >
                  {nextLabel || defaultLabel.next}
                </Button>
              </Tooltip>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
