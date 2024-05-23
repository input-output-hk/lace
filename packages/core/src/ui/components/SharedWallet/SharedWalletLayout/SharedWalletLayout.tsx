/* eslint-disable sonarjs/no-identical-functions */
import React, { useRef } from 'react';
import cn from 'classnames';
import { Timeline } from '@lace/common';
import { Box, Button, Flex, ScrollArea, Text } from '@lace/ui';
import styles from './SharedWalletLayout.module.scss';
import { i18n } from '@lace/translation';
import { useTranslation } from 'react-i18next';

export enum SharedWalletTimelineSteps {
  WALLET_NAME,
  ADD_COSIGNERS,
  DEFINE_QUORUM,
  WALLET_DETAILS
}

export interface SharedWalletStepLayoutRevampProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  description?: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  customAction?: React.ReactNode;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  isNextEnabled?: boolean;
  toolTipText?: string;
  currentTimelineStep?: SharedWalletTimelineSteps;
}

const getTimelineSteps = (currentStep: SharedWalletTimelineSteps) => {
  const walletSteps = [
    { key: SharedWalletTimelineSteps.WALLET_NAME, name: i18n.t('core.sharedWalletStep.walletName') },
    { key: SharedWalletTimelineSteps.ADD_COSIGNERS, name: i18n.t('core.sharedWalletStep.addCosigners') },
    { key: SharedWalletTimelineSteps.DEFINE_QUORUM, name: i18n.t('core.sharedWalletStep.defineQuorum') },
    { key: SharedWalletTimelineSteps.WALLET_DETAILS, name: i18n.t('core.sharedWalletStep.walletDetails') }
  ];

  if (typeof currentStep !== 'undefined') {
    const currentStepIndex = walletSteps.findIndex((step) => step.key === currentStep);
    return walletSteps.map((step, index) => ({ ...step, active: index <= currentStepIndex }));
  }

  return walletSteps.map((step) => ({ ...step, active: false }));
};

export const SharedWalletStepLayout = ({
  children,
  title,
  description,
  onNext,
  onBack,
  customAction,
  nextLabel,
  backLabel,
  isNextEnabled = true,
  currentTimelineStep
}: SharedWalletStepLayoutRevampProps): React.ReactElement => {
  const nextButtonContainerRef = useRef(null);
  const { t } = useTranslation();

  const defaultLabel = {
    next: t('core.walletSetupStep.next'),
    back: t('core.walletSetupStep.back'),
    skip: t('core.walletSetupStep.skip')
  };

  const timelineSteps = getTimelineSteps(currentTimelineStep);

  return (
    <Flex h="$fill" w="$fill" className={styles.root}>
      <Timeline className={styles.timeline}>
        {timelineSteps.map(({ name, key, active }) => (
          <Timeline.Item key={key} active={active}>
            <Box className={cn({ [styles.activeText]: currentTimelineStep === key })}>{name}</Box>
          </Timeline.Item>
        ))}
      </Timeline>
      <Flex h="$fill" w="$fill" flexDirection="column" p="$40">
        <Flex data-testid="shared-wallet-step-header" flexDirection="column" justifyContent="center">
          <Text.Heading data-testid="shared-wallet-step-title">{title}</Text.Heading>
          {description && (
            <Box data-testid="shared-wallet-step-subtitle" mt="$40" mb="$20">
              <Text.Body.Normal weight="$semibold">{description}</Text.Body.Normal>
            </Box>
          )}
        </Flex>

        <ScrollArea
          data-testid="shared-wallet-step-content"
          classNames={{
            root: styles.scrollArea,
            viewport: styles.scrollAreaViewport,
            bar: styles.scrollBar
          }}
        >
          {children}
        </ScrollArea>

        <Flex data-testid="shared-wallet-step-footer" justifyContent="space-between" w="$fill" alignItems="center">
          {onBack && (
            <Button.Secondary
              label={backLabel || defaultLabel.back}
              onClick={onBack}
              data-testid="shared-wallet-step-btn-back"
            />
          )}
          {customAction}
          {onNext && (
            <span ref={nextButtonContainerRef}>
              <Button.CallToAction
                label={nextLabel || defaultLabel.next}
                onClick={onNext}
                disabled={!isNextEnabled}
                data-testid="shared-wallet-step-btn-next"
              />
            </span>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
