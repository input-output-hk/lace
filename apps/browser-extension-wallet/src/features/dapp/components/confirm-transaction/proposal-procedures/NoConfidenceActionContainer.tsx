import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { NoConfidenceAction, getNoConfidenceActionViewData } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  governanceAction: Wallet.Cardano.NoConfidence;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const NoConfidenceActionContainer = ({
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
      getNoConfidenceActionViewData({
        anchor,
        cardanoCoin,
        deposit,
        explorerBaseUrl,
        governanceAction,
        rewardAccount
      }),
    [anchor, cardanoCoin, deposit, explorerBaseUrl, governanceAction, rewardAccount]
  );

  return <NoConfidenceAction data={data} />;
};
