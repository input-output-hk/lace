import { Box, Button, Flex, LoadingComponent, ScrollArea, Text } from '@input-output-hk/lace-ui-toolkit';
import { Timeline } from '@lace/common';
import cn from 'classnames';
import React, { ReactNode } from 'react';
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

type MakeButtonsParams = {
  defaultLabel: {
    back: string;
    next: string;
  };
  props: SharedWalletLayoutProps<string>;
};

const makeButtons = ({ props, defaultLabel }: MakeButtonsParams) => {
  let leftButton = 'customBackButton' in props ? props.customBackButton : undefined;
  if (!leftButton && 'onBack' in props) {
    leftButton = (
      <Button.Secondary
        label={props.customBackLabel ?? defaultLabel.back}
        onClick={props.onBack}
        data-testid="shared-wallet-step-btn-back"
      />
    );
  }

  let rightButton = 'customNextButton' in props ? props.customNextButton : undefined;
  if (!rightButton && 'onNext' in props) {
    rightButton = (
      <Button.CallToAction
        icon={props.isLoading ? <LoadingComponent className={styles.loadingIcon} /> : undefined}
        label={props.customNextLabel ?? defaultLabel.next}
        onClick={props.onNext}
        disabled={!props.isNextEnabled || props.isLoading}
        data-testid="shared-wallet-step-btn-next"
      />
    );
  }

  return {
    leftButton,
    rightButton,
  };
};

export type SharedWalletLayoutProps<Key extends string> = {
  children: ReactNode;
  description: ReactNode;
  timelineCurrentStep: Key;
  timelineSteps: TimelineStep<Key>[];
  title: ReactNode;
} & (
  | {
      customBackButton?: ReactNode;
      customNextButton?: ReactNode;
    }
  | (LayoutNavigationProps & {
      customBackLabel?: string;
      customNextLabel?: string;
      isLoading?: boolean;
      isNextEnabled?: boolean;
    })
);

export const SharedWalletLayout = <Key extends string>(props: SharedWalletLayoutProps<Key>): React.ReactElement => {
  const { children, description, timelineCurrentStep, timelineSteps, title } = props;
  const { t } = useTranslation();
  const defaultLabel = {
    back: t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel'),
    next: t('sharedWallets.addSharedWallet.layout.defaultNextButtonLabel'),
  };
  const { leftButton, rightButton } = makeButtons({ defaultLabel, props });

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
        <Flex testId="shared-wallet-step-header" flexDirection="column" justifyContent="center" gap="$32" mb="$32">
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
          testId="shared-wallet-step-footer"
          justifyContent={leftButton ? 'space-between' : 'flex-end'}
          w="$fill"
          alignItems="center"
          mt="$16"
        >
          {leftButton}
          {rightButton}
        </Flex>
      </Flex>
    </Flex>
  );
};
