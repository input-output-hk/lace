import { PropsWithChildren, useMemo } from 'react';
import { Provider } from './context';
import { OutsideHandlesContextValue } from './types';

type OutsideHandlesProviderProps = PropsWithChildren<OutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({
  backgroundServiceAPIContextSetWalletPassword,
  balancesBalance,
  children,
  delegationDetails,
  delegationStoreSelectedStakePoolDetails,
  delegationStoreSetDelegationTxBuilder,
  delegationStoreSetSelectedStakePool,
  fetchCoinPricePriceResult,
  openExternalLink,
  password,
  passwordRemovePassword,
  stakingRewards,
  submittingStateSetIsRestaking,
  walletStoreGetKeyAgentType,
  walletStoreInMemoryWallet,
  walletStoreWalletUICardanoCoin,
}: OutsideHandlesProviderProps) => {
  const contextValue = useMemo<OutsideHandlesContextValue>(
    () => ({
      backgroundServiceAPIContextSetWalletPassword,
      balancesBalance,
      delegationDetails,
      delegationStoreSelectedStakePoolDetails,
      delegationStoreSetDelegationTxBuilder,
      delegationStoreSetSelectedStakePool,
      fetchCoinPricePriceResult,
      openExternalLink,
      password,
      passwordRemovePassword,
      stakingRewards,
      submittingStateSetIsRestaking,
      walletStoreGetKeyAgentType,
      walletStoreInMemoryWallet,
      walletStoreWalletUICardanoCoin,
    }),
    [
      backgroundServiceAPIContextSetWalletPassword,
      balancesBalance,
      delegationDetails,
      delegationStoreSelectedStakePoolDetails,
      delegationStoreSetDelegationTxBuilder,
      delegationStoreSetSelectedStakePool,
      fetchCoinPricePriceResult,
      openExternalLink,
      password,
      passwordRemovePassword,
      stakingRewards,
      submittingStateSetIsRestaking,
      walletStoreGetKeyAgentType,
      walletStoreInMemoryWallet,
      walletStoreWalletUICardanoCoin,
    ]
  );
  return <Provider value={contextValue}>{children}</Provider>;
};
