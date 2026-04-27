import {
  genericErrorResults,
  type TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import { HexBytes } from '@lace-sdk/util';
import { of, catchError, map, switchMap } from 'rxjs';

import type { SignedBitcoinTransactionDto } from '../common/transaction';
import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';

export const makeSubmitTx = (
  dependencies: SideEffectDependencies,
): TxExecutorImplementation['submitTx'] => {
  return props => {
    return of(props.serializedTx).pipe(
      switchMap(serializedTx => {
        const payload = JSON.parse(
          HexBytes.toUTF8(HexBytes(serializedTx)),
        ) as SignedBitcoinTransactionDto;

        return dependencies.bitcoinProvider.submitTransaction(
          { network: payload.network as BitcoinNetwork },
          payload.hex,
        );
      }),
      map(result => {
        if (result.isErr()) {
          throw new Error(
            `Transaction submission failed: ${result.error?.reason}`,
          );
        }

        const txId = result.value;
        dependencies.logger.debug(`Transaction submitted with txId: ${txId}`);

        return { success: true as const, txId };
      }),
      catchError((error: Error) => of(genericErrorResults.submitTx({ error }))),
    );
  };
};
