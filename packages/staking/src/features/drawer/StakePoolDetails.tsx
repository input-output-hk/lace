import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import React, { useMemo, useState } from 'react';
import { useOutsideHandles } from '../outside-handles-provider';
import { Sections, useStakePoolDetails } from '../store';
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
  const { walletStoreInMemoryWallet } = useOutsideHandles();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(walletStoreInMemoryWallet.transactions.outgoing.inFlight$);
  const { simpleSendConfig } = useStakePoolDetails();
  const [isStaking, setIsStaking] = useState<boolean>();
  const isTherePendingDelegation = inFlightTx?.some(({ body }) => (body?.certificates?.length || 0) > 0);

  const sectionsMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetail setIsStaking={(staking) => setIsStaking(staking)} />,
      [Sections.CONFIRMATION]: <div />,
      [Sections.SIGN]: <div />,
      [Sections.SUCCESS_TX]: <div />,
      [Sections.FAIL_TX]: <div />,
    }),
    []
  );

  const footersMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetailFooter canDelegate={canDelegate} onStake={onStake} />,
      [Sections.CONFIRMATION]: <div />,
      [Sections.SIGN]: <div />,
      [Sections.SUCCESS_TX]: <div />,
      [Sections.FAIL_TX]: <div />,
    }),
    [onStake, canDelegate]
  );

  const section = useMemo(() => sectionsMap[simpleSendConfig.currentSection], [simpleSendConfig, sectionsMap]);
  const footer =
    isStaking || (isTherePendingDelegation && simpleSendConfig.currentSection === Sections.DETAIL)
      ? undefined
      : footersMap[simpleSendConfig.currentSection];

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
