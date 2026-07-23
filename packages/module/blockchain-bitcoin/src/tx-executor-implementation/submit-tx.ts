import {
  genericErrorResults,
  type TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import { HexBytes } from '@lace-lib/util';
import { of, catchError, combineLatest, map, mergeMap, take } from 'rxjs';

import { derivePendingActivityFromRawTx } from '../store/helpers/derive-pending-activity-from-raw-tx';

import type { SignedBitcoinTransactionDto } from '../common/transaction';
import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';

export const makeSubmitTx = (
  dependencies: SideEffectDependencies,
): TxExecutorImplementation['submitTx'] => {
  return props => {
    return of(props.serializedTx).pipe(
      mergeMap(serializedTx => {
        const payload = JSON.parse(
          HexBytes.toUTF8(HexBytes(serializedTx)),
        ) as SignedBitcoinTransactionDto;
        const network = payload.network as BitcoinNetwork;

        return dependencies.bitcoinProvider
          .submitTransaction({ network }, payload.hex)
          .pipe(
            mergeMap(result => {
              if (result.isErr()) {
                throw new Error(
                  `Transaction submission failed: ${result.error?.reason}`,
                );
              }

              const txId = result.value;
              dependencies.logger.debug(
                `Transaction submitted with txId: ${txId}`,
              );

              return dependencies.bitcoinAccountWallets$.pipe(
                take(1),
                mergeMap(wallets => {
                  const wallet = wallets[props.accountId];
                  if (!wallet) {
                    return of({ success: true as const, txId });
                  }
                  return combineLatest([wallet.utxos$, wallet.addresses$]).pipe(
                    take(1),
                    map(([utxos, derivedAddresses]) => {
                      try {
                        const accountAddresses = new Set(
                          derivedAddresses.map(a => a.address),
                        );
                        const activity = derivePendingActivityFromRawTx({
                          rawTxHex: payload.hex,
                          network,
                          accountId: props.accountId,
                          accountAddresses,
                          accountUtxos: utxos,
                        });
                        return {
                          success: true as const,
                          txId,
                          blockchainSpecificActivityMetadata:
                            activity?.blockchainSpecific,
                        };
                      } catch (error) {
                        dependencies.logger.error(
                          '[blockchain-bitcoin] failed to derive pending activity from submitted tx',
                          error,
                        );
                        return { success: true as const, txId };
                      }
                    }),
                  );
                }),
              );
            }),
          );
      }),
      catchError((error: Error) => of(genericErrorResults.submitTx({ error }))),
    );
  };
};
