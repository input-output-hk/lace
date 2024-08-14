import { useCallback } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useSecrets } from '@lace/core';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { password, clearSecrets } = useSecrets();
  const { inMemoryWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const tx = delegationTxBuilder.build();
    const signedTx = await withSignTxConfirmation(() => tx.sign(), password.value);
    await inMemoryWallet.submitTx(signedTx);
    clearSecrets();
  }, [delegationTxBuilder, inMemoryWallet, password, clearSecrets]);

  return { signAndSubmitTransaction };
};
