import { useObservable } from '@lace/common';
import { useEffect } from 'react';
import { initI18n } from '../../i18n';
import '../reset.css';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { SetupBase, SetupBaseProps } from './SetupBase';

initI18n();

type SetupProps = SetupBaseProps;

export const Setup = ({ children, ...rest }: SetupProps) => {
  const { walletStoreInMemoryWallet, walletStoreWalletUICardanoCoin: cardanoCoin } = useOutsideHandles();
  const { setCurrentPortfolio } = useDelegationPortfolioStore((s) => s.mutators);
  const delegationDistribution = useObservable(walletStoreInMemoryWallet.delegation.distribution$);
  console.log('DEBUG original', delegationDistribution);

  useEffect(() => {
    if (!delegationDistribution) return;
    console.log('DEBUG values', [...delegationDistribution.values()]);
    setCurrentPortfolio({ cardanoCoin, delegationDistribution: [...delegationDistribution.values()] });
  }, [delegationDistribution, setCurrentPortfolio, cardanoCoin]);

  return <SetupBase {...rest}>{children}</SetupBase>;
};
