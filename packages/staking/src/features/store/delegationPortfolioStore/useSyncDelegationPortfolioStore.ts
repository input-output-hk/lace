import { useObservable } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect } from 'react';

export const useSyncDelegationPortfolioStore = () => {
  const { walletStoreInMemoryWallet, currentChain } = useOutsideHandles();
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const delegationDistribution = useObservable(walletStoreInMemoryWallet.delegation.distribution$);
  const currentEpoch = useObservable(walletStoreInMemoryWallet.currentEpoch$);
  const delegationRewardsHistory = useObservable(walletStoreInMemoryWallet.delegation.rewardsHistory$);
  const delegationPortfolio = useObservable(walletStoreInMemoryWallet.delegation.portfolio$);

  useEffect(() => {
    if (![delegationDistribution, delegationRewardsHistory, currentEpoch].every(Boolean)) return;
    portfolioMutators.setCardanoCoinSymbol(currentChain);
    portfolioMutators.setCurrentPortfolio({
      currentEpoch,
      delegationDistribution: [...delegationDistribution.values()],
      delegationPortfolio,
      delegationRewardsHistory,
    });
  }, [
    currentChain,
    currentEpoch,
    delegationDistribution,
    delegationPortfolio,
    delegationRewardsHistory,
    portfolioMutators,
  ]);

  useEffect(() => {
    if (!currentChain) return;
    portfolioMutators.forceAbortFlows();
  }, [currentChain, portfolioMutators]);
};
