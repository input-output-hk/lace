import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { HardForkInitiationAction, getHardForkInitiationActionViewData } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  governanceAction: Wallet.Cardano.HardForkInitiationAction;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const HardForkInitiationActionContainer = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor
}: Props): React.ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const explorerBaseUrl = useCexplorerBaseUrl();

  const data = useMemo(
    () =>
      getHardForkInitiationActionViewData({
        anchor,
        cardanoCoin,
        deposit,
        explorerBaseUrl,
        governanceAction,
        rewardAccount
      }),
    [anchor, cardanoCoin, deposit, explorerBaseUrl, governanceAction, rewardAccount]
  );

  return <HardForkInitiationAction data={data} />;
};
