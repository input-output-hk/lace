import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useMemo } from 'react';
import { isFeatureEnabled } from '@src/utils/feature-flags';

export const useMultiDelegationEnabled = (): boolean => {
  const { getKeyAgentType } = useWalletStore();

  return useMemo(() => {
    const keyAgentType = getKeyAgentType();
    switch (keyAgentType) {
      case Wallet.KeyManagement.KeyAgentType.Ledger:
        return isFeatureEnabled('MULTI_DELEGATION_STAKING_LEDGER');
      case Wallet.KeyManagement.KeyAgentType.Trezor:
        return isFeatureEnabled('MULTI_DELEGATION_STAKING_TREZOR');
      default:
        return true;
    }
  }, [getKeyAgentType]);
};
