import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { isPortfolioDrifted } from 'features/overview/helpers';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { walletStoreInMemoryWallet } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const { activeDrawerStep, activeFlow, portfolioDrifted, portfolioModified, selectionsFull, openPoolIsSelected } =
    useDelegationPortfolioStore((store) => ({
      activeDrawerStep: store.activeDrawerStep,
      activeFlow: store.activeFlow,
      openPoolIsSelected: store.selectedPortfolio.some(
        (pool) => store.viewedStakePool && pool.id === store.viewedStakePool.hexId
      ),
      portfolioDrifted: isPortfolioDrifted(store.currentPortfolio),
      portfolioModified: (store.draftPortfolio || []).some(({ basedOnCurrentPortfolio }) => !basedOnCurrentPortfolio),
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
      [DrawerManagementStep.Preferences]: <StakePoolPreferences />,
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
        if (activeFlow === Flow.CurrentPoolDetails || (activeFlow === Flow.PoolDetails && !delegationPending && selectionActionsAllowed) {
          return <StakePoolDetailFooter popupView={popupView} />;
        }
        return null;
      })(),
      [DrawerManagementStep.Preferences]: (() => {
        if (!portfolioModified && !portfolioDrifted) {
          return null;
        }
        return <StakePoolPreferencesFooter buttonTitle={!portfolioModified && portfolioDrifted ? t('drawer.preferences.rebalanceButton') : t('drawer.preferences.confirmButton')} />;
      })(),
      [DrawerManagementStep.Confirmation]: <StakePoolConfirmationFooter />,
      [DrawerManagementStep.Sign]: <SignConfirmationFooter />,
      [DrawerManagementStep.Success]: <TransactionSuccessFooter />,
      [DrawerManagementStep.Failure]: <TransactionFailFooter />,
    }),
    [activeFlow, delegationPending, selectionActionsAllowed, popupView, portfolioModified, portfolioDrifted, t]
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
