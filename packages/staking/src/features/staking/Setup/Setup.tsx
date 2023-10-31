import { useObservable } from '@lace/common';
import { useEffect } from 'react';
import { initI18n } from '../../i18n';
import '../reset.css';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { StakingProps } from '../types';
import { SetupBase, SetupBaseProps } from './SetupBase';

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

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
