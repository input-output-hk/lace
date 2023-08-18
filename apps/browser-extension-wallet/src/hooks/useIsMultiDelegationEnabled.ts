import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useMemo } from 'react';

export const useIsMultiDelegationEnabled = (): boolean => {
  const { getKeyAgentType } = useWalletStore();
  const inMemoryWallet = useMemo(
    () => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
    [getKeyAgentType]
  );

  return process.env.USE_MULTI_DELEGATION_STAKING === 'true' && inMemoryWallet;
};
