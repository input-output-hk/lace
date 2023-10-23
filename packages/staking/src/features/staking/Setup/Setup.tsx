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

  useEffect(() => {
    if (![delegationDistribution, delegationRewardsHistory, currentEpoch].every(Boolean)) return;
    portfolioMutators.setCardanoCoinSymbol(currentChain);
    portfolioMutators.setInMemoryWallet(walletStoreInMemoryWallet);
    portfolioMutators.setCurrentPortfolio({
      currentEpoch,
      delegationDistribution: [...delegationDistribution.values()],
      delegationRewardsHistory,
    });
    portfolioMutators.setView(view);
  }, [
    delegationDistribution,
    delegationRewardsHistory,
    currentEpoch,
    portfolioMutators,
    currentChain,
    view,
    walletStoreInMemoryWallet,
  ]);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
