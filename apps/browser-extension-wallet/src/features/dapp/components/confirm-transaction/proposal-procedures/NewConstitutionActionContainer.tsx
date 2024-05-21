import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { NewConstitutionAction, getNewConstitutionActionViewData } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  governanceAction: Wallet.Cardano.NewConstitution;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const NewConstitutionActionContainer = ({
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
      getNewConstitutionActionViewData({
        anchor,
        cardanoCoin,
        deposit,
        explorerBaseUrl,
        governanceAction,
        rewardAccount
      }),
    [anchor, cardanoCoin, deposit, explorerBaseUrl, governanceAction, rewardAccount]
  );

  return <NewConstitutionAction data={data} />;
};
