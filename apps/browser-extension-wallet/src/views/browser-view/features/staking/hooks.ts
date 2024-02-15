import { useCallback } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { usePassword } from '../send-transaction';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { password, removePassword } = usePassword();
  const { inMemoryWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const tx = delegationTxBuilder.build();
    const signedTx = await withSignTxConfirmation(() => tx.sign(), password);
    await inMemoryWallet.submitTx(signedTx);
    removePassword();
  }, [delegationTxBuilder, removePassword, inMemoryWallet, password]);

  return { signAndSubmitTransaction };
};
