import React from 'react';
import { Wallet } from '@lace/cardano';
import { UpdateCommitteeAction, getUpdateCommitteeActionViewData } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  governanceAction: Wallet.Cardano.UpdateCommittee;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const UpdateCommitteeActionContainer = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor
}: Props): React.ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  const explorerBaseUrl = useCexplorerBaseUrl();
  const data = getUpdateCommitteeActionViewData({
    anchor,
    cardanoCoin,
    deposit,
    explorerBaseUrl,
    governanceAction,
    rewardAccount
  });

  return <UpdateCommitteeAction data={data} />;
};
