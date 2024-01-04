import { useCallback } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { usePassword } from '../send-transaction';
import { filter, firstValueFrom, tap } from 'rxjs';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { password, removePassword } = usePassword();
  const { inMemoryWallet, cardanoWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const tx = delegationTxBuilder.build();
    const { hash } = await tx.inspect();
    void firstValueFrom(
      cardanoWallet.signerManager.transactionWitnessRequest$.pipe(
        filter((req) => req.transaction.getId() === hash),
        tap((req) => req.sign(password ? Buffer.from(password, 'utf8') : void 0))
      )
    );
    const signedTx = await tx.sign();
    removePassword();
    await inMemoryWallet.submitTx(signedTx);
  }, [delegationTxBuilder, removePassword, inMemoryWallet, cardanoWallet, password]);

  return { signAndSubmitTransaction };
};
