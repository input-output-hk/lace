import { WalletType } from '@cardano-sdk/web-extension';
import { useWalletStore } from '@src/stores';
import { useMemo } from 'react';

export const useMultiDelegationEnabled = (): boolean => {
  const { getWalletType } = useWalletStore();

  return useMemo(() => {
    const walletType = getWalletType();
    switch (walletType) {
      case WalletType.Ledger:
        return process.env.USE_MULTI_DELEGATION_STAKING_LEDGER === 'true';
      case WalletType.Trezor:
        return process.env.USE_MULTI_DELEGATION_STAKING_TREZOR === 'true';
      default:
        return true;
    }
  }, [getWalletType]);
};
