import { useCallback } from 'react';

import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import isUndefined from 'lodash/isUndefined';

export const LAST_STABLE_EPOCH = 2;

interface Props {
  inMemoryWallet: Wallet.ObservableWallet;
  buildDelegation: (
    hexId?: Readonly<Wallet.Cardano.PoolIdHex>,
  ) => Promise<void>;
  setSelectedStakePool: (
    pool?: Readonly<Wallet.Cardano.StakePool | undefined>,
  ) => void;
}

export interface TransformedDelegation {
  poolId: string;
  ticker: string;
  homepage: string;
  description: string;
  rewards: string;
}

export interface Delegation {
  delegation?: TransformedDelegation | undefined;
  initDelegation: (pool?: Readonly<Wallet.Cardano.StakePool>) => Promise<void>;
  stakeRegistration: string;
}

export const useDelegation = ({
  inMemoryWallet,
  buildDelegation,
  setSelectedStakePool,
}: Readonly<Props>): Delegation => {
  const delegationDistribution = useObservable(
    inMemoryWallet.delegation.distribution$,
  );
  const delegationRewardsHistory = useObservable(
    inMemoryWallet.delegation.rewardsHistory$,
  );
  const currentEpoch = useObservable(inMemoryWallet.currentEpoch$);
  const addresses = useObservable(inMemoryWallet.addresses$);
  const rewards = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccount = rewards?.find(
    ({ address }) => address === addresses[0].rewardAccount,
  );
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const stakeRegistration = protocolParameters?.stakeKeyDeposit.toString();

  const initDelegation = useCallback(
    async (pool?: Readonly<Wallet.Cardano.StakePool>) => {
      try {
        setSelectedStakePool(pool);
        await buildDelegation(pool?.hexId);
      } catch (error) {
        throw error;
      }
    },
    [buildDelegation, setSelectedStakePool],
  );

  if (
    [delegationDistribution, delegationRewardsHistory, currentEpoch].some(val =>
      isUndefined(val),
    )
  ) {
    return { initDelegation, stakeRegistration };
  }

  const delegation = [...(delegationDistribution?.values() || [])]?.[0];

  if (!delegation) return { initDelegation, stakeRegistration };

  const {
    pool: { metadata, id: poolId },
  } = delegation;
  const transformedDelegation = {
    poolId,
    ticker: metadata?.ticker ?? '',
    homepage: metadata?.homepage ?? '',
    description: metadata?.description ?? '',
    rewards:
      rewardAccount?.credentialStatus ===
      Wallet.Cardano.StakeCredentialStatus.Registered
        ? rewardAccount?.rewardBalance.toString()
        : '0',
  };

  return {
    delegation: transformedDelegation,
    initDelegation,
    stakeRegistration,
  };
};
