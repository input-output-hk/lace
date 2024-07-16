/* eslint-disable unicorn/no-array-reduce */
import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { ParameterChangeAction, getParameterChangeActionViewData } from '@lace/core';
import { useWalletStore } from '@src/stores';

import { useCexplorerBaseUrl } from '../../hooks';

interface Props {
  governanceAction: Wallet.Cardano.ParameterChangeAction;
  deposit: Wallet.Cardano.ProposalProcedure['deposit'];
  rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const ParameterChangeActionContainer = ({
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
      getParameterChangeActionViewData({
        governanceAction,
        deposit,
        rewardAccount,
        anchor,
        cardanoCoin,
        explorerBaseUrl
      }),
    [anchor, cardanoCoin, deposit, explorerBaseUrl, governanceAction, rewardAccount]
  );

  return <ParameterChangeAction data={data} />;
};
