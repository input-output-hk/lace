import { useObservable } from '@lace/common';
import { useBrowsePoolsPersistence } from 'features/BrowsePools';
import { initI18n } from 'features/i18n';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { useDelegationPortfolioStore } from 'features/store';
import { useEffect } from 'react';
import { StakingProps } from '../types';
import { SetupBase, SetupBaseProps } from './SetupBase';
import '../reset.css';

initI18n();

type SetupProps = Omit<SetupBaseProps, 'loading'> &
  Pick<StakingProps, 'currentChain'> & {
    view: 'popup' | 'expanded';
  };

export const Setup = ({ children, currentChain, view, ...rest }: SetupProps) => {
  const { balancesBalance, walletStoreInMemoryWallet } = useOutsideHandles();
  const portfolioMutators = useDelegationPortfolioStore((s) => s.mutators);
  const delegationDistribution = useObservable(walletStoreInMemoryWallet.delegation.distribution$);
  const currentEpoch = useObservable(walletStoreInMemoryWallet.currentEpoch$);
  const delegationRewardsHistory = useObservable(walletStoreInMemoryWallet.delegation.rewardsHistory$);
  const delegationPortfolio = useObservable(walletStoreInMemoryWallet.delegation.portfolio$);

  // TODO: remove after we introduce a common hydration setter (cardanoCoin, browsePoolsView, currentPortfolio, view) https://input-output.atlassian.net/browse/LW-9979
  useEffect(() => {
    if (![delegationDistribution, delegationRewardsHistory, currentEpoch].every(Boolean)) return;
    portfolioMutators.setCardanoCoinSymbol(currentChain);
    portfolioMutators.setCurrentPortfolio({
      currentEpoch,
      delegationDistribution: [...delegationDistribution.values()],
      delegationPortfolio,
      delegationRewardsHistory,
    });
    portfolioMutators.setView(view);
  }, [
    currentChain,
    currentEpoch,
    delegationDistribution,
    delegationPortfolio,
    delegationRewardsHistory,
    portfolioMutators,
    view,
  ]);

  useBrowsePoolsPersistence();

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
