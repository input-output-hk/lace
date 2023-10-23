import { useObservable } from '@lace/common';
import isNil from 'lodash/isNil';
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
  const loading =
    isNil(walletStoreInMemoryWallet.protocolParameters$) || isNil(walletStoreInMemoryWallet.delegation.rewardAccounts$);

  useEffect(() => {
    // TODO: handle more elegantly, this is a hack to make sure the tx builder is initialized
    if (loading || !walletStoreInMemoryWallet.createTxBuilder) return;
    if (![delegationDistribution, delegationRewardsHistory, currentEpoch, walletStoreInMemoryWallet].every(Boolean))
      return;
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
    loading,
  ]);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
