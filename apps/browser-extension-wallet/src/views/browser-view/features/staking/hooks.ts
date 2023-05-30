import { useCallback } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { inMemoryWallet } = useWalletStore();
  const { delegationBuiltTx } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const signedTx = await inMemoryWallet.finalizeTx({ tx: delegationBuiltTx });
    await inMemoryWallet.submitTx(signedTx);
  }, [inMemoryWallet, delegationBuiltTx]);

  return { signAndSubmitTransaction };
};
