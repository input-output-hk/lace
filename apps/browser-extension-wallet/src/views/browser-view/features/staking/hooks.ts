import { useCallback } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { inMemoryWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const signedTx = await delegationTxBuilder.delegatePortfiolio().build().sign();
    await inMemoryWallet.submitTx(signedTx.tx);
  }, [delegationTxBuilder, inMemoryWallet]);

  return { signAndSubmitTransaction };
};
