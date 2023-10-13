import { Wallet } from '@lace/cardano';
import { PostHogAction, useObservable } from '@lace/common';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DelegationFlow,
  DelegationPortfolioStore,
  DrawerDefaultStep,
  DrawerManagementStep,
  DrawerStep,
  MAX_POOLS_COUNT,
  PERCENTAGE_SCALE_MAX,
  isPortfolioDrifted,
  sumPercentagesSanitized,
  useDelegationPortfolioStore,
} from '../store';
import { StakePoolConfirmationContent, StakePoolConfirmationFooter } from './confirmation';
import { HwDeviceFail, HwDeviceFailFooter } from './HwDeviceFail';
import { StepPreferencesContent, StepPreferencesFooter } from './preferences';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { StakePoolDetail, StakePoolDetailFooter, StakePoolDetailFooterProps } from './StakePoolDetail';
import { StakePoolDetailsDrawer } from './StakePoolDetailsDrawer';
import { TransactionFail, TransactionFailFooter } from './TransactionFail';
import { TransactionSuccess, TransactionSuccessFooter } from './TransactionSuccess';

type stakePoolDetailsProps = StakePoolDetailFooterProps & {
  popupView?: boolean;
  showBackIcon?: boolean | ((step: DrawerStep) => boolean);
  showCloseIcon?: boolean | ((step: DrawerStep) => boolean);
  showExitConfirmation?: (step: DrawerStep) => boolean;
};

type DraftPortfolioInvalidReason = 'invalid-allocation' | 'slider-zero';
type DraftPortfolioValidity = { valid: true } | { valid: false; reason: DraftPortfolioInvalidReason };

const getDraftPortfolioValidity = (store: DelegationPortfolioStore): DraftPortfolioValidity => {
  if (!store.draftPortfolio?.length) return { valid: true };
  const percentageSum = sumPercentagesSanitized({ items: store.draftPortfolio, key: 'sliderIntegerPercentage' });
  if (percentageSum !== PERCENTAGE_SCALE_MAX) {
    return { reason: 'invalid-allocation', valid: false };
  }
  if (store.draftPortfolio.some((pool) => pool.sliderIntegerPercentage === 0)) {
    return { reason: 'slider-zero', valid: false };
  }
  return { valid: true };
};

export const Drawer = ({
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: stakePoolDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics, walletStoreInMemoryWallet } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);

  const {
    activeDelegationFlow,
    activeDrawerStep,
    currentPortfolioDrifted,
    draftPortfolioValidity,
    openPoolIsSelected,
    poolsInDraftMatchCurrentPortfolio,
    selectionsFull,
    slidersMatchSavedPercentages,
  } = useDelegationPortfolioStore((store) => {
    const currentPortfolioPoolHexIds = (store.currentPortfolio || []).map(({ id }) => id);
    return {
      activeDelegationFlow: store.activeDelegationFlow,
      activeDrawerStep: store.activeDrawerStep,
      currentPortfolioDrifted: isPortfolioDrifted(store.currentPortfolio),
      draftPortfolioValidity: getDraftPortfolioValidity(store),
      openPoolIsSelected: store.selectedPortfolio.some(
        (pool) => store.viewedStakePool && pool.id === store.viewedStakePool.hexId
      ),
      poolsInDraftMatchCurrentPortfolio:
        store.draftPortfolio?.length === currentPortfolioPoolHexIds.length &&
        store.draftPortfolio?.every(({ id }) => currentPortfolioPoolHexIds.includes(id)),
      selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
      slidersMatchSavedPercentages: (store.draftPortfolio || []).every(
        ({ sliderIntegerPercentage, savedIntegerPercentage }) =>
          !!savedIntegerPercentage && sliderIntegerPercentage === savedIntegerPercentage
      ),
    };
  });

  const delegationPending = inFlightTx
    ?.map(({ body: { certificates } }) =>
      (certificates ?? []).filter((c) => c.__typename === Wallet.Cardano.CertificateType.StakeDelegation)
    )
    .some((certificates) => certificates?.length > 0);

  const selectionActionsAllowed = !selectionsFull || openPoolIsSelected;

  const contentsMap = useMemo(
    (): Record<DrawerStep, React.ReactElement> => ({
      [DrawerDefaultStep.PoolDetails]: <StakePoolDetail popupView={popupView} />,
      [DrawerManagementStep.Preferences]: <StepPreferencesContent />,
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmationContent />,
      [DrawerManagementStep.Sign]: <SignConfirmation />,
      [DrawerManagementStep.Success]: <TransactionSuccess />,
      [DrawerManagementStep.Failure]: <TransactionFail />,
      [DrawerManagementStep.HwDeviceFailure]: <HwDeviceFail />,
    }),
    [popupView]
  );

  const footersMap = useMemo(
    (): Record<DrawerStep, React.ReactElement | null> => ({
      [DrawerDefaultStep.PoolDetails]: (() => {
        if (activeDelegationFlow === DelegationFlow.PoolDetails && !delegationPending && selectionActionsAllowed) {
          return <StakePoolDetailFooter popupView={popupView} />;
        }
        return null;
      })(),
      [DrawerManagementStep.Preferences]: (() => {
        const currentPortfolioManagementUntouched =
          activeDelegationFlow === DelegationFlow.PortfolioManagement &&
          poolsInDraftMatchCurrentPortfolio &&
          slidersMatchSavedPercentages;

        if (currentPortfolioManagementUntouched && !currentPortfolioDrifted) {
          return null;
        }
        const tooltipTranslationMap: Record<DraftPortfolioInvalidReason, string> = {
          'invalid-allocation': t('drawer.preferences.ctaButtonTooltip.invalidAllocation'),
          'slider-zero': t('drawer.preferences.ctaButtonTooltip.zeroPercentageSliderError'),
        };
        return (
          <StepPreferencesFooter
            buttonTitle={
              currentPortfolioManagementUntouched && currentPortfolioDrifted
                ? t('drawer.preferences.rebalanceButton')
                : t('drawer.preferences.confirmButton')
            }
            disabled={!draftPortfolioValidity.valid}
            tooltip={draftPortfolioValidity.valid ? undefined : tooltipTranslationMap[draftPortfolioValidity.reason]}
          />
        );
      })(),
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmationFooter />,
      [DrawerManagementStep.Sign]: <SignConfirmationFooter />,
      [DrawerManagementStep.Success]: <TransactionSuccessFooter />,
      [DrawerManagementStep.Failure]: <TransactionFailFooter />,
      [DrawerManagementStep.HwDeviceFailure]: <HwDeviceFailFooter />,
    }),
    [
      activeDelegationFlow,
      delegationPending,
      selectionActionsAllowed,
      popupView,
      poolsInDraftMatchCurrentPortfolio,
      slidersMatchSavedPercentages,
      currentPortfolioDrifted,
      t,
      draftPortfolioValidity,
    ]
  );

  const section = useMemo(() => activeDrawerStep && contentsMap[activeDrawerStep], [activeDrawerStep, contentsMap]);
  const footer = activeDrawerStep ? footersMap[activeDrawerStep] : null;

  return (
    <StakePoolDetailsDrawer
      showExitConfirmation={showExitConfirmation}
      showCloseIcon={showCloseIcon}
      showBackIcon={showBackIcon}
      popupView={popupView}
      footer={footer}
      onCloseIconClick={() => {
        if (activeDelegationFlow === DelegationFlow.PortfolioManagement) {
          if (activeDrawerStep === DrawerManagementStep.Success) {
            analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayXClick);
          }
          if (activeDrawerStep === DrawerManagementStep.Failure) {
            analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongXClick);
          }
        }
      }}
      onBackButtonClick={() => {
        if (
          activeDelegationFlow === DelegationFlow.PortfolioManagement &&
          activeDrawerStep === DrawerManagementStep.Failure
        ) {
          analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongBackClick);
        }
      }}
    >
      {section}
    </StakePoolDetailsDrawer>
  );
};
