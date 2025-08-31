import { useMemo } from 'react';

export const useMultiDelegationEnabled = (): boolean =>
  // Temporarily disabled for debugging - no need to access wallet state
  // const { walletType } = useWalletStore();

  useMemo(
    () =>
      // TEMPORARILY DISABLED FOR DEBUGGING - Force use of local Staking component
      false,

    // Original logic (commented out for debugging):
    // switch (walletType) {
    //   case WalletType.Ledger:
    //     return process.env.USE_MULTI_DELEGATION_STAKING_LEDGER === 'true';
    //   case WalletType.Trezor:
    //     return process.env.USE_MULTI_DELEGATION_STAKING_TREZOR === 'true';
    //   default:
    //     return true;
    // }
    []
  ); // Removed walletType dependency since we're returning false
