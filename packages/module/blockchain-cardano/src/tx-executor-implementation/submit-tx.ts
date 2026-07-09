import { derivePendingActivityFromCbor } from '@lace-contract/cardano-context';
import {
  genericErrorResults,
  type TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import { HexBytes } from '@lace-sdk/util';
import { combineLatest, mergeMap, map, of, take } from 'rxjs';

import type { AnyAddress } from '@lace-contract/addresses';
import type { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';

export const makeSubmitTx =
  (
    dependencies: SideEffectDependencies,
  ): TxExecutorImplementation['submitTx'] =>
  props =>
    dependencies.txExecutorCardano.cardanoChainId$.pipe(
      mergeMap(chainId => {
        if (!chainId) {
          return of(
            genericErrorResults.submitTx({
              error: new Error('Chain ID not found'),
            }),
          );
        }
        return dependencies.cardanoProvider
          .submitTx({ signedTransaction: props.serializedTx }, { chainId })
          .pipe(
            mergeMap(result => {
              if (!result.isOk()) {
                return of(
                  genericErrorResults.submitTx({ error: result.error }),
                );
              }
              return combineLatest([
                dependencies.txExecutorCardano.cardanoAccountUtxos$,
                dependencies.txExecutorCardano.cardanoAddresses$,
              ]).pipe(
                take(1),
                map(([allAccountUtxos, cardanoAddresses]) => {
                  try {
                    const accountAddresses: CardanoPaymentAddress[] =
                      cardanoAddresses
                        .filter(
                          (addr: AnyAddress) =>
                            addr.accountId === props.accountId &&
                            addr.blockchainName === 'Cardano',
                        )
                        .map(
                          addr =>
                            addr.address as unknown as CardanoPaymentAddress,
                        );
                    const activity = derivePendingActivityFromCbor({
                      serializedTx: HexBytes(props.serializedTx),
                      accountId: props.accountId,
                      accountAddresses,
                      accountUtxos: allAccountUtxos[props.accountId] ?? [],
                    });
                    return {
                      success: true,
                      txId: result.value,
                      blockchainSpecificActivityMetadata:
                        activity?.blockchainSpecific,
                    } as const;
                  } catch (error) {
                    dependencies.logger.error(
                      '[blockchain-cardano] failed to derive pending activity from submitted tx',
                      error,
                    );
                    return { success: true, txId: result.value } as const;
                  }
                }),
              );
            }),
          );
      }),
    );
