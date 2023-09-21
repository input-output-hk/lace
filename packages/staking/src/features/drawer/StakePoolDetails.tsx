import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import React, { useMemo } from 'react';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DrawerDefaultStep,
  DrawerManagementStep,
  DrawerStep,
  Flow,
  MAX_POOLS_COUNT,
  useDelegationPortfolioStore,
} from '../store';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { StakePoolConfirmation, StakePoolConfirmationFooter } from './StakePoolConfirmation';
import { StakePoolDetail, StakePoolDetailFooter, StakePoolDetailFooterProps } from './StakePoolDetail';
import { StakePoolDetailsDrawer } from './StakePoolDetailsDrawer';
import { StakePoolPreferences, StakePoolPreferencesFooter } from './StakePoolPreferences';
import { TransactionFail, TransactionFailFooter } from './TransactionFail';
import { TransactionSuccess, TransactionSuccessFooter } from './TransactionSuccess';

type stakePoolDetailsProps = StakePoolDetailFooterProps & {
  popupView?: boolean;
  showBackIcon?: boolean | ((step: DrawerStep) => boolean);
  showCloseIcon?: boolean | ((step: DrawerStep) => boolean);
  showExitConfirmation?: (step: DrawerStep) => boolean;
};

export const StakePoolDetails = ({
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: stakePoolDetailsProps): React.ReactElement => {
  const { walletStoreInMemoryWallet } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const { activeDrawerStep, activeFlow, selectionsFull, openPoolIsSelected } = useDelegationPortfolioStore((store) => ({
    activeDrawerStep: store.activeDrawerStep,
    activeFlow: store.activeFlow,
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

  const contentsMap = useMemo(
    (): Record<DrawerStep, React.ReactElement> => ({
      [DrawerDefaultStep.PoolDetails]: <StakePoolDetail popupView={popupView} />,
      [DrawerManagementStep.Preferences]: <StakePoolPreferences />,
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmation />,
      [DrawerManagementStep.Sign]: <SignConfirmation />,
      [DrawerManagementStep.Success]: <TransactionSuccess />,
      [DrawerManagementStep.Failure]: <TransactionFail />,
    }),
    [popupView]
  );

  const footersMap = useMemo(
    (): Record<DrawerStep, React.ReactElement> => ({
      [DrawerDefaultStep.PoolDetails]: <StakePoolDetailFooter popupView={popupView} />,
      [DrawerManagementStep.Preferences]: <StakePoolPreferencesFooter />,
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmationFooter />,
      [DrawerManagementStep.Sign]: <SignConfirmationFooter />,
      [DrawerManagementStep.Success]: <TransactionSuccessFooter />,
      [DrawerManagementStep.Failure]: <TransactionFailFooter />,
    }),
    [popupView]
  );

  const selectionActionsAllowed = !selectionsFull || openPoolIsSelected;
  const drawerNotOnDetails = activeDrawerStep !== DrawerDefaultStep.PoolDetails;
  const footerVisible =
    drawerNotOnDetails || (activeFlow === Flow.PoolDetails && !delegationPending && selectionActionsAllowed);

  const section = useMemo(() => activeDrawerStep && contentsMap[activeDrawerStep], [activeDrawerStep, contentsMap]);
  const footer = footerVisible && activeDrawerStep ? footersMap[activeDrawerStep] : undefined;

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
