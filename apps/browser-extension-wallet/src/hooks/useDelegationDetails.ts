import { useMemo } from 'react';
import isEmpty from 'lodash/isEmpty';
import { Wallet } from '@lace/cardano';

import { useObservable } from '@lace/common';
import { useWalletStore } from '../stores';

export const useDelegationDetails = (): Wallet.Cardano.StakePool => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet?.delegation?.rewardAccounts$);

  return useMemo(() => {
    const rewardAccount = !isEmpty(rewardAccounts) ? rewardAccounts[0] : undefined;

    return !rewardAccounts
      ? undefined
      : rewardAccount?.delegatee?.nextNextEpoch ||
          rewardAccount?.delegatee?.nextEpoch ||
          rewardAccount?.delegatee?.currentEpoch ||
          // eslint-disable-next-line unicorn/no-null
          null;
  }, [rewardAccounts]);
};
