import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import React, { useMemo } from 'react';
import { useOutsideHandles } from '../outside-handles-provider';
import { MAX_POOLS_COUNT, Page, Sections, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { StakePoolConfirmation, StakePoolConfirmationFooter } from './StakePoolConfirmation';
import { StakePoolDetail, StakePoolDetailFooter, StakePoolDetailFooterProps } from './StakePoolDetail';
import { StakePoolDetailsDrawer } from './StakePoolDetailsDrawer';
import { StakePoolPreferences, StakePoolPreferencesFooter } from './StakePoolPreferences';
import { TransactionFail, TransactionFailFooter } from './TransactionFail';
import { TransactionSuccess, TransactionSuccessFooter } from './TransactionSuccess';

type stakePoolDetailsProps = StakePoolDetailFooterProps & {
  popupView?: boolean;
  showBackIcon?: boolean | ((section: Sections) => boolean);
  showCloseIcon?: boolean | ((section: Sections) => boolean);
  showExitConfirmation?: (section: Sections) => boolean;
};

export const StakePoolDetails = ({
  onStakeOnThisPool,
  onUnselect,
  onSelect,
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: stakePoolDetailsProps): React.ReactElement => {
  const { walletStoreInMemoryWallet, delegationStoreSelectedStakePoolDetails: openPool } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const { activePage, simpleSendConfig } = useStakePoolDetails();
  const { selectionsFull, openPoolIsSelected } = useDelegationPortfolioStore(({ selections }) => ({
    openPoolIsSelected: openPool && selections.some((pool) => pool.id === Wallet.Cardano.PoolIdHex(openPool.hexId)),
    selectionsFull: selections.length === MAX_POOLS_COUNT,
  }));
  const delegationPending = inFlightTx
    ?.map(({ body: { certificates } }) =>
      (certificates ?? []).filter((c) => c.__typename === Wallet.Cardano.CertificateType.StakeDelegation)
    )
    .some((certificates) => certificates?.length > 0);

  const sectionsMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetail popupView={popupView} />,
      [Sections.PREFERENCES]: <StakePoolPreferences />,
      [Sections.CONFIRMATION]: <StakePoolConfirmation />,
      [Sections.SIGN]: <SignConfirmation />,
      [Sections.SUCCESS_TX]: <TransactionSuccess />,
      [Sections.FAIL_TX]: <TransactionFail />,
    }),
    [popupView]
  );

  const footersMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: (
        <StakePoolDetailFooter
          onSelect={onSelect}
          onStakeOnThisPool={onStakeOnThisPool}
          onUnselect={onUnselect}
          popupView={popupView}
        />
      ),
      [Sections.PREFERENCES]: <StakePoolPreferencesFooter />,
      [Sections.CONFIRMATION]: <StakePoolConfirmationFooter />,
      [Sections.SIGN]: <SignConfirmationFooter />,
      [Sections.SUCCESS_TX]: <TransactionSuccessFooter />,
      [Sections.FAIL_TX]: <TransactionFailFooter />,
    }),
    [onSelect, onStakeOnThisPool, onUnselect, popupView]
  );

  const selectionActionsAllowed = !selectionsFull || openPoolIsSelected;
  const drawerNotOnDetails = simpleSendConfig.currentSection !== Sections.DETAIL;
  const footerVisible =
    drawerNotOnDetails || (activePage === Page.browsePools && !delegationPending && selectionActionsAllowed);

  const section = useMemo(() => sectionsMap[simpleSendConfig.currentSection], [simpleSendConfig, sectionsMap]);
  const footer = footerVisible ? footersMap[simpleSendConfig.currentSection] : undefined;

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
