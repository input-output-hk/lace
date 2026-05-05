import { Serialization } from '@cardano-sdk/core';
import { catchError, firstValueFrom, from, merge, of, switchMap } from 'rxjs';

import {
  createCombinedInputResolver,
  txInEquals,
} from './utils/input-resolver';

import type {
  ResolvedTransactionInputs,
  SerializedForeignResolvedInput,
} from './slice';
import type { Cardano } from '@cardano-sdk/core';
import type {
  AccountUtxoMap,
  CardanoProvider,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

/**
 * Action creators required for the foreign input resolution flow.
 * These match the Redux slice actions for starting resolution and storing results.
 * Uses generic TAction to support any Redux action type.
 *
 * @template TStartAction - Type of the action returned by startResolvingInputs
 * @template TSetAction - Type of the action returned by setResolvedTransactionInputs
 */
export type ForeignInputsActionCreators<
  TStartAction = unknown,
  TSetAction = unknown,
> = {
  startResolvingInputs: () => TStartAction;
  setResolvedTransactionInputs: (
    payload: ResolvedTransactionInputs | null,
  ) => TSetAction;
};

/**
 * Parameters for the createResolveForeignInputsFlow factory function.
 *
 * @template TTriggerAction - Type of the trigger action containing the transaction hex
 * @template TStartAction - Type of the action returned by startResolvingInputs
 * @template TSetAction - Type of the action returned by setResolvedTransactionInputs
 */
export type CreateResolveForeignInputsFlowParams<
  TTriggerAction,
  TStartAction,
  TSetAction,
> = {
  /** Observable that triggers the resolution when a transaction is set */
  triggerAction$: Observable<TTriggerAction>;
  /** Function to extract transaction hex from the trigger action */
  getTxHex: (action: TTriggerAction) => string;
  /** Observable providing account UTXO mapping */
  selectAccountUtxos$: Observable<AccountUtxoMap>;
  /** Observable providing the current chain ID */
  selectChainId$: Observable<Cardano.ChainId | undefined>;
  /** Cardano provider for resolving foreign inputs via API */
  cardanoProvider: CardanoProvider;
  /** Action creators for dispatching resolution state updates */
  actions: ForeignInputsActionCreators<TStartAction, TSetAction>;
};

/**
 * Creates an observable flow for resolving foreign transaction inputs.
 *
 * Foreign inputs are transaction inputs that reference UTXOs not owned by the local wallet.
 * These need to be resolved via an external provider (e.g., Blockfrost) to display the
 * source addresses in the transaction signing UI.
 *
 * The flow performs the following steps:
 * 1. Dispatches startResolvingInputs action to indicate resolution in progress
 * 2. Retrieves the current chain ID and account UTXOs from state
 * 3. Parses the transaction CBOR to extract input references
 * 4. Identifies which inputs are not in the local UTXO set (foreign inputs)
 * 5. Resolves each foreign input via the Cardano provider API
 * 6. Aggregates resolved addresses with their coin/asset values
 * 7. Serializes BigInt values to strings for Redux storage
 * 8. Dispatches setResolvedTransactionInputs with the results or error
 *
 * @template TAction - Type of the trigger action
 * @param params - Configuration parameters for the resolution flow
 * @returns Observable that emits Redux actions for the resolution lifecycle
 */
export const createResolveForeignInputsFlow = <
  TTriggerAction,
  TStartAction,
  TSetAction,
>({
  triggerAction$,
  getTxHex,
  selectAccountUtxos$,
  selectChainId$,
  cardanoProvider,
  actions,
}: CreateResolveForeignInputsFlowParams<
  TTriggerAction,
  TStartAction,
  TSetAction
>): Observable<TSetAction | TStartAction> =>
  triggerAction$.pipe(
    switchMap(action => {
      const txHex = getTxHex(action);

      return merge(
        of(actions.startResolvingInputs()),
        from(
          resolveForeignInputsAsync({
            txHex,
            selectAccountUtxos$,
            selectChainId$,
            cardanoProvider,
          }),
        ).pipe(
          catchError(error =>
            of<ResolvedTransactionInputs>({
              foreignResolvedInputs: [],
              isResolving: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to resolve foreign inputs',
            }),
          ),
          switchMap(result => of(actions.setResolvedTransactionInputs(result))),
        ),
      );
    }),
  );

/**
 * Parameters for the async foreign input resolution function.
 */
type ResolveForeignInputsAsyncParams = {
  txHex: string;
  selectAccountUtxos$: Observable<AccountUtxoMap>;
  selectChainId$: Observable<Cardano.ChainId | undefined>;
  cardanoProvider: CardanoProvider;
};

/**
 * Asynchronously resolves foreign transaction inputs.
 *
 * @param params - Parameters containing transaction hex and state/provider dependencies
 * @returns Promise resolving to the resolved transaction inputs state
 */
const resolveForeignInputsAsync = async ({
  txHex,
  selectAccountUtxos$,
  selectChainId$,
  cardanoProvider,
}: ResolveForeignInputsAsyncParams): Promise<ResolvedTransactionInputs> => {
  const chainId = await firstValueFrom(selectChainId$);
  if (!chainId) {
    return {
      foreignResolvedInputs: [],
      isResolving: false,
      error: 'Chain ID not available',
    };
  }

  const accountUtxos = await firstValueFrom(selectAccountUtxos$);
  const allUtxos = Object.values(accountUtxos).flat();

  const tx = Serialization.Transaction.fromCbor(Serialization.TxCBOR(txHex));
  const body = tx.body().toCore();

  const foreignInputs = body.inputs.filter(
    (txIn: Cardano.TxIn) =>
      !allUtxos.some(([utxoInput]) => txInEquals(utxoInput, txIn)),
  );

  if (foreignInputs.length === 0) {
    return {
      foreignResolvedInputs: [],
      isResolving: false,
      error: null,
    };
  }

  const inputResolver = createCombinedInputResolver(allUtxos, cardanoProvider, {
    chainId,
  });

  const foreignResolvedInputs: SerializedForeignResolvedInput[] = [];

  for (const txIn of foreignInputs) {
    const resolved = await inputResolver.resolveInput(txIn);
    if (resolved) {
      foreignResolvedInputs.push({
        txIn: { txId: txIn.txId, index: txIn.index },
        txOutCbor: Serialization.TransactionOutput.fromCore(resolved).toCbor(),
      });
    }
  }

  return {
    foreignResolvedInputs,
    isResolving: false,
    error: null,
  };
};
