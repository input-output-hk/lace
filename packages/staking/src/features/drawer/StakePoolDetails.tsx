import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import React, { useMemo } from 'react';
import { useOutsideHandles } from '../outside-handles-provider';
import { MAX_POOLS_COUNT, Sections, useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { StakePoolConfirmation, StakePoolConfirmationFooter } from './StakePoolConfirmation';
import { StakePoolDetail, StakePoolDetailFooter } from './StakePoolDetail';
import { StakePoolDetailsDrawer } from './StakePoolDetailsDrawer';

type stakePoolDetailsProps = {
  onStake: () => void;
  canDelegate?: boolean;
  showBackIcon?: boolean | ((section: Sections) => boolean);
  showCloseIcon?: boolean | ((section: Sections) => boolean);
  showExitConfirmation?: (section: Sections) => boolean;
};

export const StakePoolDetails = ({
  onStake,
  canDelegate,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: stakePoolDetailsProps): React.ReactElement => {
  const { walletStoreInMemoryWallet, delegationStoreSelectedStakePoolDetails: openPool } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const { simpleSendConfig } = useStakePoolDetails();
  const { draftFull, openPoolSelectedInDraft } = useDelegationPortfolioStore(({ draftPortfolio }) => ({
    draftFull: draftPortfolio.length === MAX_POOLS_COUNT,
    openPoolSelectedInDraft:
      openPool && draftPortfolio.some((pool) => pool.id === Wallet.Cardano.PoolIdHex(openPool.hexId)),
  }));
  const isTherePendingDelegation = inFlightTx?.some(({ body }) => (body?.certificates?.length || 0) > 0);

  const sectionsMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetail />,
      [Sections.CONFIRMATION]: <StakePoolConfirmation />,
      [Sections.SIGN]: <SignConfirmation />,
      [Sections.SUCCESS_TX]: <div />,
      [Sections.FAIL_TX]: <div />,
    }),
    []
  );

  const footersMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetailFooter canDelegate={canDelegate} onStake={onStake} />,
      [Sections.CONFIRMATION]: <StakePoolConfirmationFooter />,
      [Sections.SIGN]: <SignConfirmationFooter />,
      [Sections.SUCCESS_TX]: <div />,
      [Sections.FAIL_TX]: <div />,
    }),
    [onStake, canDelegate]
  );

  const pendingDelegationAndAnyDetailsAreShown =
    isTherePendingDelegation && simpleSendConfig.currentSection === Sections.DETAIL;
  const cannotAddAnotherPoolToDraft = draftFull && !openPoolSelectedInDraft;
  const footerHidden = cannotAddAnotherPoolToDraft || pendingDelegationAndAnyDetailsAreShown;

  const section = useMemo(() => sectionsMap[simpleSendConfig.currentSection], [simpleSendConfig, sectionsMap]);
  const footer = footerHidden ? undefined : footersMap[simpleSendConfig.currentSection];

  return (
    <StakePoolDetailsDrawer
      showExitConfirmation={showExitConfirmation}
      showCloseIcon={showCloseIcon}
      showBackIcon={showBackIcon}
      footer={footer}
    >
      {section}
    </StakePoolDetailsDrawer>
  );
};
