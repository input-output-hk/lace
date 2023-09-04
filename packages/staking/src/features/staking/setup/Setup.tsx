import { useObservable } from '@lace/common';
import { useEffect } from 'react';
import { initI18n } from '../../i18n';
import '../reset.css';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { SetupBase, SetupBaseProps } from './SetupBase';

initI18n();

type SetupProps = Omit<SetupBaseProps, 'loading'>;

export const Setup = ({ children, ...rest }: SetupProps) => {
  const {
    balancesBalance,
    walletStoreInMemoryWallet,
    walletStoreWalletUICardanoCoin: cardanoCoin,
  } = useOutsideHandles();
  const { setCurrentPortfolio } = useDelegationPortfolioStore((s) => s.mutators);
  const delegationDistribution = useObservable(walletStoreInMemoryWallet.delegation.distribution$);
  const currentEpoch = useObservable(walletStoreInMemoryWallet.currentEpoch$);
  const delegationRewardsHistory = useObservable(walletStoreInMemoryWallet.delegation.rewardsHistory$);

  useEffect(() => {
    if (![delegationDistribution, delegationRewardsHistory, currentEpoch].every(Boolean)) return;
    setCurrentPortfolio({
      cardanoCoin,
      currentEpoch,
      delegationDistribution: [...delegationDistribution.values()],
      delegationRewardsHistory,
    });
  }, [delegationDistribution, delegationRewardsHistory, currentEpoch, cardanoCoin, setCurrentPortfolio]);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
