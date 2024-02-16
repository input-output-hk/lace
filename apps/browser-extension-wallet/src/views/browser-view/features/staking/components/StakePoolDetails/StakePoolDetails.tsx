import React, { useMemo, useState } from 'react';
import { StakePoolDetailsDrawer } from './StakePoolDetailsDrawer';
import { useStakePoolDetails } from '../../store';
import { Sections } from '../../types';
import { StakePoolDetail, StakePoolDetailFooter } from './StakePoolDetail';
import { StakePoolConfirmation, StakePoolConfirmationFooter } from './StakePoolConfirmation';
import { SignConfirmation, SignConfirmationFooter } from './SignConfirmation';
import { TransactionSuccess, TransactionSuccessFooter } from './TransactionSuccess';
import { TransactionFail, TransactionFailFooter } from './TransactionFail';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';

type stakePoolDetailsProps = {
  onStake: () => void;
  canDelegate?: boolean;
  popupView?: boolean;
  showBackIcon?: boolean | ((section: Sections) => boolean);
  showCloseIcon?: boolean | ((section: Sections) => boolean);
  showExitConfirmation?: (section: Sections) => boolean;
};

export const StakePoolDetails = ({
  onStake,
  canDelegate,
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation
}: stakePoolDetailsProps): React.ReactElement => {
  const { inMemoryWallet } = useWalletStore();
  const inFlightTx: Wallet.TxInFlight[] = useObservable(inMemoryWallet.transactions.outgoing.inFlight$);
  const { simpleSendConfig } = useStakePoolDetails();
  const [isStaking, setIsStaking] = useState<boolean>();
  const isTherePendingDelegation = inFlightTx?.some(({ body }) => body?.certificates?.length > 0);

  const sectionsMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetail setIsStaking={(staking) => setIsStaking(staking)} popupView={popupView} />,
      [Sections.CONFIRMATION]: <StakePoolConfirmation popupView={popupView} />,
      [Sections.SIGN]: <SignConfirmation popupView={popupView} />,
      [Sections.SUCCESS_TX]: <TransactionSuccess popupView={popupView} />,
      [Sections.FAIL_TX]: <TransactionFail popupView={popupView} />
    }),
    [popupView]
  );

  const footersMap = useMemo(
    (): Record<Sections, React.ReactElement> => ({
      [Sections.DETAIL]: <StakePoolDetailFooter popupView={popupView} canDelegate={canDelegate} onStake={onStake} />,
      [Sections.CONFIRMATION]: <StakePoolConfirmationFooter popupView={popupView} />,
      [Sections.SIGN]: <SignConfirmationFooter />,
      [Sections.SUCCESS_TX]: <TransactionSuccessFooter />,
      [Sections.FAIL_TX]: <TransactionFailFooter popupView={popupView} />
    }),
    [onStake, canDelegate, popupView]
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
      popupView={popupView}
      footer={footer}
    >
      {section}
    </StakePoolDetailsDrawer>
  );
};
