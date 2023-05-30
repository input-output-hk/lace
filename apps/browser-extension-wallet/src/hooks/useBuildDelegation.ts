import { useWalletStore } from '../stores';
import { useCallback } from 'react';
import { CardanoTxBuild } from '../types';
import { useDelegationStore } from '../features/delegation/stores';
import { Wallet } from '@lace/cardano';

export const useBuildDelegation = (): (() => Promise<CardanoTxBuild>) => {
  const { inMemoryWallet } = useWalletStore();
  const { selectedStakePool } = useDelegationStore();

  return useCallback(async () => {
    const txConfig = await Wallet.buildDelegation(inMemoryWallet, selectedStakePool.id);
    return inMemoryWallet.initializeTx(txConfig);
  }, [inMemoryWallet, selectedStakePool.id]);
};
