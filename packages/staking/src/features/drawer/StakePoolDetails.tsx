import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { isPortfolioDrifted } from 'features/overview/helpers';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DelegationPortfolioStore,
  DrawerDefaultStep,
  DrawerManagementStep,
  DrawerStep,
  Flow,
  MAX_POOLS_COUNT,
  PERCENTAGE_SCALE_MAX,
  useDelegationPortfolioStore,
} from '../store';
import { StepPreferencesContent, StepPreferencesFooter } from './preferences';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { StakePoolConfirmation, StakePoolConfirmationFooter } from './StakePoolConfirmation';
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
  if (!store.draftPortfolio || store.draftPortfolio.length === 0) return { valid: true }; // throw new Error('Draft portfolio is not defined');
  const percentageSum = store.draftPortfolio.reduce((acc, pool) => acc + pool.sliderIntegerPercentage, 0);
  if (percentageSum !== PERCENTAGE_SCALE_MAX) {
    return { reason: 'invalid-allocation', valid: false };
  }
  if (store.draftPortfolio.some((pool) => pool.sliderIntegerPercentage === 0)) {
    return { reason: 'slider-zero', valid: false };
  }
  return { valid: true };
};

export const StakePoolDetails = ({
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: stakePoolDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { walletStoreInMemoryWallet } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const {
    activeDrawerStep,
    activeFlow,
    currentPortfolioDrifted,
    currentPortfolioDraftModified,
    selectionsFull,
    openPoolIsSelected,
    draftPortfolioValidity,
  } = useDelegationPortfolioStore((store) => ({
    activeDrawerStep: store.activeDrawerStep,
    activeFlow: store.activeFlow,
    currentPortfolioDraftModified: store.draftPortfolio?.some((pool) => !pool.basedOnCurrentPortfolio) || false,
    currentPortfolioDrifted: isPortfolioDrifted(store.currentPortfolio),
    draftPortfolioValidity: getDraftPortfolioValidity(store),
    openPoolIsSelected: store.selectedPortfolio.some(
      (pool) => store.viewedStakePool && pool.id === store.viewedStakePool.hexId
    ),
    selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
  }));
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
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmation />,
      [DrawerManagementStep.Sign]: <SignConfirmation />,
      [DrawerManagementStep.Success]: <TransactionSuccess />,
      [DrawerManagementStep.Failure]: <TransactionFail />,
    }),
    [popupView]
  );

  const footersMap = useMemo(
    (): Record<DrawerStep, React.ReactElement | null> => ({
      [DrawerDefaultStep.PoolDetails]: (() => {
        if (activeFlow === Flow.PoolDetails && !delegationPending && selectionActionsAllowed) {
          return <StakePoolDetailFooter popupView={popupView} />;
        }
        return null;
      })(),
      [DrawerManagementStep.Preferences]: (() => {
        if (activeFlow === Flow.PortfolioManagement && !currentPortfolioDraftModified && !currentPortfolioDrifted) {
          return null;
        }
        const tooltipTranslationMap: Record<DraftPortfolioInvalidReason, string> = {
          'invalid-allocation': t('drawer.preferences.ctaButtonTooltip.invalidAllocation'),
          'slider-zero': t('drawer.preferences.ctaButtonTooltip.zeroPercentageSliderError'),
        };
        return (
          <StepPreferencesFooter
            buttonTitle={
              activeFlow === Flow.PortfolioManagement && !currentPortfolioDraftModified && currentPortfolioDrifted
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
    }),
    [
      activeFlow,
      delegationPending,
      selectionActionsAllowed,
      popupView,
      currentPortfolioDraftModified,
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
    >
      {section}
    </StakePoolDetailsDrawer>
  );
};
