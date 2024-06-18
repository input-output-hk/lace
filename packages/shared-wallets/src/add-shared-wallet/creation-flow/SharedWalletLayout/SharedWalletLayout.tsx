import { Timeline } from '@lace/common';
import { Box, Button, Flex, ScrollArea, Text } from '@lace/ui';
import cn from 'classnames';
import { TFunction } from 'i18next';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SharedWalletLayout.module.scss';
import { LayoutNavigationProps } from './type';

export enum SharedWalletTimelineSteps {
  WALLET_NAME,
  ADD_COSIGNERS,
  DEFINE_QUORUM,
  WALLET_DETAILS,
}

export interface SharedWalletLayoutProps {
  children: React.ReactNode;
  currentTimelineStep: SharedWalletTimelineSteps;
  customBackLabel?: string;
  customNextLabel?: string;
  description: React.ReactNode;
  isNextEnabled?: boolean;
  title: React.ReactNode;
}

const getTimelineSteps = (currentStep: SharedWalletTimelineSteps, t: TFunction) => {
  const walletSteps = [
    {
      key: SharedWalletTimelineSteps.WALLET_NAME,
      name: t('sharedWallets.addSharedWallet.layout.timelineStep.walletName'),
    },
    {
      key: SharedWalletTimelineSteps.ADD_COSIGNERS,
      name: t('sharedWallets.addSharedWallet.layout.timelineStep.addCosigners'),
    },
    {
      key: SharedWalletTimelineSteps.DEFINE_QUORUM,
      name: t('sharedWallets.addSharedWallet.layout.timelineStep.defineQuorum'),
    },
    {
      key: SharedWalletTimelineSteps.WALLET_DETAILS,
      name: t('sharedWallets.addSharedWallet.layout.timelineStep.walletDetails'),
    },
  ];

  const indexOfCurrentStep = walletSteps.findIndex(({ key }) => key === currentStep);
  return walletSteps.map((step, index) => ({
    ...step,
    active: index <= indexOfCurrentStep,
  }));
};

export const SharedWalletLayout = ({
  children,
  title,
  description,
  onNext,
  onBack,
  customNextLabel,
  customBackLabel,
  isNextEnabled = true,
  currentTimelineStep,
}: SharedWalletLayoutProps & LayoutNavigationProps): React.ReactElement => {
  const { t } = useTranslation();

  const defaultLabel = {
    back: t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel'),
    next: t('sharedWallets.addSharedWallet.layout.defaultNextButtonLabel'),
  };

  const timelineSteps = getTimelineSteps(currentTimelineStep, t);

  return (
    <Flex h="$fill" w="$fill" className={styles.root}>
      <Timeline className={styles.timeline}>
        {timelineSteps.map(({ name, key, active }) => (
          <Timeline.Item key={key} active={active}>
            <Box className={cn({ [`${styles.activeText}`]: currentTimelineStep === key })}>{name}</Box>
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
            bar: styles.scrollBar,
            root: styles.scrollArea,
            viewport: styles.scrollAreaViewport,
          }}
        >
          {children}
        </ScrollArea>

        <Flex
          data-testid="shared-wallet-step-footer"
          justifyContent={onBack ? 'space-between' : 'flex-end'}
          w="$fill"
          alignItems="center"
        >
          {onBack && (
            <Button.Secondary
              label={customBackLabel || defaultLabel.back}
              onClick={onBack}
              data-testid="shared-wallet-step-btn-back"
            />
          )}
          {onNext && (
            <Button.CallToAction
              label={customNextLabel || defaultLabel.next}
              onClick={onNext}
              disabled={!isNextEnabled}
              data-testid="shared-wallet-step-btn-next"
            />
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
