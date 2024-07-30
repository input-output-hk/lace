import React, { useRef } from 'react';
import styles from './WalletSetupStepLayoutRevamp.module.scss';
import cn from 'classnames';
import { Button, Timeline } from '@lace/common';
import { Tooltip } from 'antd';
import { urls } from '@ui/utils/constants';
import { i18n } from '@lace/translation';
import { WalletTimelineSteps } from '../WalletSetup';
import { useTranslation } from 'react-i18next';

export interface WalletSetupStepLayoutRevampProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  belowContentText?: React.ReactNode;
  description?: React.ReactNode;
  linkText?: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  customAction?: React.ReactNode;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  isNextEnabled?: boolean;
  isNextLoading?: boolean;
  toolTipText?: string;
  currentTimelineStep?: WalletTimelineSteps;
  isHardwareWallet?: boolean;
  paperWalletEnabled?: boolean;
}

const getTimelineSteps = (currentStep: WalletTimelineSteps, isHardwareWallet: boolean, paperWalletEnabled: boolean) => {
  const inMemoryWalletSteps = [
    ...(paperWalletEnabled
      ? [
          { key: WalletTimelineSteps.CHOOSE_RECOVERY_METHOD, name: i18n.t('core.walletSetup.recoveryMethod') },
          { key: WalletTimelineSteps.RECOVERY_DETAILS, name: i18n.t('core.walletSetup.recoveryDetails') }
        ]
      : [{ key: WalletTimelineSteps.RECOVERY_PHRASE, name: i18n.t('core.walletSetupStep.recoveryPhrase') }]),
    { key: WalletTimelineSteps.WALLET_SETUP, name: i18n.t('core.walletSetupStep.walletSetup') },
    { key: WalletTimelineSteps.ALL_DONE, name: i18n.t('core.walletSetupStep.enterWallet') }
  ];

  const hardwareWalletSteps = [
    { key: WalletTimelineSteps.CONNECT_WALLET, name: i18n.t('core.walletSetupStep.connectWallet') },
    { key: WalletTimelineSteps.WALLET_SETUP, name: i18n.t('core.walletSetupStep.walletSetup') },
    { key: WalletTimelineSteps.ALL_DONE, name: i18n.t('core.walletSetupStep.enterWallet') }
  ];

  const walletSteps = isHardwareWallet ? hardwareWalletSteps : inMemoryWalletSteps;

  if (typeof currentStep !== 'undefined') {
    const currentStepIndex = walletSteps.findIndex((step) => step.key === currentStep);
    return walletSteps.map((step, index) => ({ ...step, active: index <= currentStepIndex }));
  }

  return walletSteps.map((step) => ({ ...step, active: false }));
};

export const WalletSetupStepLayoutRevamp = ({
  children,
  title,
  description,
  linkText,
  belowContentText,
  onNext,
  onBack,
  customAction,
  nextLabel,
  backLabel,
  isNextEnabled = true,
  isNextLoading = false,
  toolTipText,
  currentTimelineStep,
  isHardwareWallet = false,
  paperWalletEnabled
}: WalletSetupStepLayoutRevampProps): React.ReactElement => {
  const { t } = useTranslation();
  const nextButtonContainerRef = useRef(null);

  const defaultLabel = {
    next: t('core.walletSetupStep.next'),
    back: t('core.walletSetupStep.back'),
    skip: t('core.walletSetupStep.skip')
  };

  const timelineSteps = getTimelineSteps(currentTimelineStep, isHardwareWallet, paperWalletEnabled);

  return (
    <div className={styles.walletSetupStepLayout} data-testid="wallet-setup-step-layout">
      <div className={styles.sideTimelineContainer}>
        <Timeline>
          {timelineSteps.map(({ name, key, active }) => (
            <Timeline.Item
              key={key}
              active={active}
              data-testid={`${currentTimelineStep === key ? 'active' : 'inactive'}-onboarding-step`}
            >
              <div className={cn({ [styles.activeText]: currentTimelineStep === key })}>{name}</div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
      <div className={styles.container}>
        <div className={styles.header} data-testid="wallet-setup-step-header">
          <h1 data-testid="wallet-setup-step-title" className={styles.title}>
            {title}
          </h1>
          {description && (
            <div data-testid="wallet-setup-step-subtitle" className={styles.subtitle}>
              {description}{' '}
              <a href={urls.faq.secretPassphrase} target="_blank" data-testid="faq-secret-passphrase-url">
                {linkText}
              </a>
            </div>
          )}
        </div>
        <div className={styles.content} data-testid="wallet-setup-step-content">
          {children}
        </div>
        {belowContentText}
        {(onBack || customAction || onNext) && (
          <div className={styles.footer} data-testid="wallet-setup-step-footer">
            {onBack && (
              <Button color="secondary" onClick={onBack} data-testid="wallet-setup-step-btn-back">
                {backLabel || defaultLabel.back}
              </Button>
            )}
            {customAction}
            {onNext && (
              <span ref={nextButtonContainerRef}>
                <Tooltip
                  open={!isNextEnabled && !!toolTipText}
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
        )}
      </div>
    </div>
  );
};
