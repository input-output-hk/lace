import { Timeline } from '@lace/common';
import { ReactComponent as LoadingIcon } from '@lace/icons/dist/LoadingComponent';
import { Box, Button, Flex, ScrollArea, Text } from '@lace/ui';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SharedWalletLayout.module.scss';
import { LayoutNavigationProps } from './type';

export type TimelineStep<Key extends string> = {
  key: Key;
  name: string;
};

const parseTimelineSteps = <Key extends string>(timelineSteps: TimelineStep<Key>[], timelineCurrentStep: Key) => {
  const indexOfCurrentStep = timelineSteps.findIndex(({ key }) => key === timelineCurrentStep);
  return timelineSteps.map(({ name }, index) => ({
    current: index === indexOfCurrentStep,
    marked: index <= indexOfCurrentStep,
    name,
  }));
};

export interface SharedWalletLayoutProps<Key extends string> extends LayoutNavigationProps {
  children: React.ReactNode;
  customBackLabel?: string;
  customNextLabel?: string;
  description: React.ReactNode;
  isNextEnabled?: boolean;
  loading?: boolean;
  timelineCurrentStep: Key;
  timelineSteps: TimelineStep<Key>[];
  title: React.ReactNode;
}

export const SharedWalletLayout = <Key extends string>({
  children,
  customBackLabel,
  customNextLabel,
  description,
  isNextEnabled,
  loading = false,
  onBack,
  onNext,
  timelineCurrentStep,
  timelineSteps,
  title,
}: SharedWalletLayoutProps<Key>): React.ReactElement => {
  const { t } = useTranslation();

  const defaultLabel = {
    back: t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel'),
    next: t('sharedWallets.addSharedWallet.layout.defaultNextButtonLabel'),
  };

  return (
    <Flex h="$fill" w="$fill" className={styles.root}>
      <Timeline className={styles.timeline}>
        {parseTimelineSteps(timelineSteps, timelineCurrentStep).map(({ current, marked, name }) => (
          <Timeline.Item key={name} active={marked}>
            <Box className={cn({ [`${styles.activeText}`]: current })}>{name}</Box>
          </Timeline.Item>
        ))}
      </Timeline>
      <Flex h="$fill" w="$fill" flexDirection="column" p="$40">
        <Flex data-testid="shared-wallet-step-header" flexDirection="column" justifyContent="center" gap="$32" mb="$32">
          <Text.Heading data-testid="shared-wallet-step-title">{title}</Text.Heading>
          {description && (
            <Text.Body.Normal weight="$semibold" data-testid="shared-wallet-step-subtitle">
              {description}
            </Text.Body.Normal>
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
          mt="$16"
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
              icon={loading ? <LoadingIcon className={styles.loadingIcon} /> : undefined}
              label={customNextLabel || defaultLabel.next}
              onClick={onNext}
              disabled={!isNextEnabled || loading}
              data-testid="shared-wallet-step-btn-next"
            />
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
