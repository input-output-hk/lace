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

  useEffect(() => {
    if (!delegationDistribution) return;
    setCurrentPortfolio({ cardanoCoin, delegationDistribution: [...delegationDistribution.values()] });
  }, [delegationDistribution, setCurrentPortfolio, cardanoCoin]);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
