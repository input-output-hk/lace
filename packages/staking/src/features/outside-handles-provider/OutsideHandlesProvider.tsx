import { PropsWithChildren, useMemo } from 'react';
import { Provider } from './context';
import { OutsideHandlesContextValue } from './types';

type OutsideHandlesProviderProps = PropsWithChildren<OutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({
  backgroundServiceAPIContextSetWalletPassword,
  children,
  delegationDetails,
  delegationStoreSelectedStakePoolDetails,
  delegationStoreSetDelegationTxBuilder,
  delegationStoreSetSelectedStakePool,
  openExternalLink,
  password,
  passwordRemovePassword,
  submittingStateSetIsRestaking,
  walletStoreGetKeyAgentType,
  walletStoreInMemoryWallet,
  walletStoreWalletUICardanoCoin,
}: OutsideHandlesProviderProps) => {
  const contextValue = useMemo<OutsideHandlesContextValue>(
    () => ({
      backgroundServiceAPIContextSetWalletPassword,
      delegationDetails,
      delegationStoreSelectedStakePoolDetails,
      delegationStoreSetDelegationTxBuilder,
      delegationStoreSetSelectedStakePool,
      openExternalLink,
      password,
      passwordRemovePassword,
      submittingStateSetIsRestaking,
      walletStoreGetKeyAgentType,
      walletStoreInMemoryWallet,
      walletStoreWalletUICardanoCoin,
    }),
    [
      backgroundServiceAPIContextSetWalletPassword,
      delegationDetails,
      delegationStoreSelectedStakePoolDetails,
      delegationStoreSetDelegationTxBuilder,
      delegationStoreSetSelectedStakePool,
      openExternalLink,
      password,
      passwordRemovePassword,
      submittingStateSetIsRestaking,
      walletStoreGetKeyAgentType,
      walletStoreInMemoryWallet,
      walletStoreWalletUICardanoCoin,
    ]
  );
  return <Provider value={contextValue}>{children}</Provider>;
};
