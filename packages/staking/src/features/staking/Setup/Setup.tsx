import { BigIntMath } from '@cardano-sdk/util';
import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import BigNumber from 'bignumber.js';
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

// hotfix: percentages from the cardano-js-sdk because for some
// not yet understood reason may not always add up to 100
// hence we are patching them here.
// Once LW-8703 is done, this patch can be removed
const patchPercentages = (delegationDistribution: DelegatedStake[]): DelegatedStake[] => {
  const totalPortfolioStake = BigIntMath.sum(delegationDistribution.map(({ stake }) => stake));

  return delegationDistribution.map((delegation) => ({
    ...delegation,
    percentage: new BigNumber(delegation.stake.toString())
      .div(totalPortfolioStake.toString())
      .toNumber() as Wallet.Percent,
  }));
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
    portfolioMutators.setCurrentPortfolio({
      currentEpoch,
      delegationDistribution: patchPercentages([...delegationDistribution.values()]),
      delegationRewardsHistory,
    });
    portfolioMutators.setView(view);
  }, [delegationDistribution, delegationRewardsHistory, currentEpoch, portfolioMutators, currentChain, view]);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
