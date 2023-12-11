import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useMemo } from 'react';

export const useMultiDelegationEnabled = (): boolean => {
  const { getKeyAgentType } = useWalletStore();

  return useMemo(() => {
    const keyAgentType = getKeyAgentType();
    switch (keyAgentType) {
      case Wallet.KeyManagement.KeyAgentType.Ledger:
        return process.env.USE_MULTI_DELEGATION_STAKING_LEDGER === 'true';
      case Wallet.KeyManagement.KeyAgentType.Trezor:
        return process.env.USE_MULTI_DELEGATION_STAKING_TREZOR === 'true';
      default:
        return true;
    }
  }, [getKeyAgentType]);
};
