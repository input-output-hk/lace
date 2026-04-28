import { signerAuthFromPrompt } from '@lace-contract/signer';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { HexBytes } from '@lace-sdk/util';
import { catchError, defer, map, of } from 'rxjs';

import type { BitcoinSignerContext } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { TxExecutorImplementation } from '@lace-contract/tx-executor';

export const makeConfirmTx = ({
  accessAuthSecret,
  authenticate,
  signerFactory,
}: SideEffectDependencies): TxExecutorImplementation['confirmTx'] => {
  return ({ serializedTx, wallet, accountId }) => {
    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    return defer(() => {
      const context: BitcoinSignerContext = { wallet, accountId, auth };
      const signer = signerFactory.createTransactionSigner(context);
      return signer.sign({ serializedTx: HexBytes(serializedTx) });
    }).pipe(
      map(result => ({
        serializedTx: result.serializedTx,
        success: true as const,
      })),
      catchError((error: Error) =>
        of(genericErrorResults.confirmTx({ error })),
      ),
    );
  };
};
