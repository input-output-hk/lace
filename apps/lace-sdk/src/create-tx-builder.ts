import {
  TransactionBuilder,
  cardanoContextSelectors,
} from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-sdk/util';
import {
  type Observable,
  combineLatest,
  filter,
  firstValueFrom,
  map,
  timeout,
} from 'rxjs';

import type { Cardano } from '@cardano-sdk/core';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';
import type { State, StateObservables } from '@lace-contract/module';
import type { Milliseconds, Result } from '@lace-sdk/util';

// Derived from the cardano-context contract — single source of truth.
// Resolved concretely (not generic) so StateObservables can evaluate
// the parameterless-vs-parameterized conditional in _StateObservables.
type CardanoContextObservables = StateObservables<
  typeof cardanoContextSelectors
>;

/**
 * Structural requirement: the wallet must have been created with
 * Cardano modules loaded (blockchainCardano + cardanoProviderBlockfrost).
 */
export type WalletWithCardanoContext = {
  getState: () => Partial<State>;
  stateObservables: Pick<CardanoContextObservables, 'cardanoContext'>;
};

export type NetworkInfo = {
  chainId: Cardano.ChainId;
  protocolParameters: RequiredProtocolParameters;
};

/**
 * Creates a {@link TransactionBuilder} pre-configured with the active Cardano
 * network and protocol parameters from the wallet's Redux state.
 *
 * Call {@link waitForNetworkInfo} first to ensure the state is ready.
 *
 * @param wallet - A wallet with Cardano context (see {@link WalletWithCardanoContext}).
 * @returns `Ok<TransactionBuilder>` or `Err` if network info is not yet available.
 */
export const createTxBuilder = (
  wallet: WalletWithCardanoContext,
): Result<TransactionBuilder, Error> => {
  const state = wallet.getState() as State;

  const chainId = cardanoContextSelectors.cardanoContext.selectChainId(state);

  if (!chainId) {
    return Err(
      new Error(
        'Cardano network not initialized — ensure a wallet entity has been created and the Cardano blockchain module is loaded',
      ),
    );
  }

  const protocolParameters =
    cardanoContextSelectors.cardanoContext.selectProtocolParameters(state);

  if (!protocolParameters) {
    return Err(
      new Error(
        'Protocol parameters not available — ensure the Cardano provider has synced',
      ),
    );
  }

  return Ok(
    new TransactionBuilder(
      chainId.networkMagic as Cardano.NetworkMagics,
      protocolParameters,
    ),
  );
};

/**
 * Returns a promise that resolves once the Cardano network info (chain ID and
 * protocol parameters) is available in the wallet state. Await this before
 * calling {@link createTxBuilder} to guarantee it succeeds.
 *
 * @param wallet - A wallet with Cardano context (see {@link WalletWithCardanoContext}).
 * @param options - Optional configuration.
 * @param options.timeout - Maximum time to wait for network info before
 *   rejecting with a `TimeoutError`. When omitted the promise waits
 *   indefinitely.
 * @returns The resolved chain ID and protocol parameters.
 */
export const waitForNetworkInfo = async (
  wallet: WalletWithCardanoContext,
  options?: { timeout?: Milliseconds },
): Promise<NetworkInfo> =>
  firstValueFrom(
    combineLatest([
      wallet.stateObservables.cardanoContext.selectChainId$,
      wallet.stateObservables.cardanoContext.selectProtocolParameters$,
    ]).pipe(
      filter(
        (pair): pair is [Cardano.ChainId, RequiredProtocolParameters] =>
          pair[0] != null && pair[1] != null,
      ),
      map(([chainId, protocolParameters]) => ({
        chainId,
        protocolParameters,
      })),
      options?.timeout != null
        ? timeout({ first: options.timeout })
        : passthrough(),
    ),
  );

const passthrough =
  <T>() =>
  (source$: Observable<T>) =>
    source$;
