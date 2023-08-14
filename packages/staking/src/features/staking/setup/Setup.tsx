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
  const rewardAccountInfo = useObservable(walletStoreInMemoryWallet.delegation.rewardAccounts$);

  useEffect(() => {
    setCurrentPortfolio({ cardanoCoin, rewardAccountInfo });
  }, [rewardAccountInfo, setCurrentPortfolio, cardanoCoin]);

  return <SetupBase {...rest}>{children}</SetupBase>;
};
