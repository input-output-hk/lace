import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createMaestroBitcoinProvider } from '@lace-lib/bitcoin-provider-core';
import { Err, Ok } from '@lace-lib/util';
import { from, map, of } from 'rxjs';

import { getBitcoinUtxos, submitBitcoinTx } from '../lace-client';
import {
  laceErrorToProviderError,
  toWireNetwork,
  transportUtxoToContract,
} from '../mappers';

import type { BitcoinWalletResolver } from '../wallet-resolver';
import type {
  BitcoinPaginatedResponse,
  BitcoinProviderDependencies,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';

/**
 * The guest's composite `BitcoinProvider` (ADR 46): the two host-owned methods
 * route to `window.lace` (getUTxOs overlay-adjusted + submitTransaction
 * host-attributed), the seven free-running reads run against maestro through the
 * shared `@lace-lib/bitcoin-provider-core` leaves. It is the sole implementor of
 * `bitcoinProviderContract` in the guest — `bitcoin-provider-maestro` is dropped
 * there. The `resolver` maps the address `getUTxOs` carries back to the
 * (walletId, accountIndex) the host wire needs.
 */
export const initializeDependencies = async (
  {
    runtime: {
      config: {
        bitcoinProvider: { maestroConfig },
      },
    },
  }: Readonly<ModuleInitProps>,
  { logger }: Readonly<ModuleInitDependencies>,
  resolver: BitcoinWalletResolver,
): Promise<BitcoinProviderDependencies> => {
  const maestro = createMaestroBitcoinProvider(maestroConfig, logger);

  return {
    bitcoinProvider: {
      // ---- free-running (maestro via the shared lib leaves) ----
      getLastKnownBlock: maestro.getLastKnownBlock,
      getTransaction: maestro.getTransaction,
      getRawTransaction: maestro.getRawTransaction,
      getTransactions: maestro.getTransactions,
      getTransactionsInMempool: maestro.getTransactionsInMempool,
      getTransactionStatus: maestro.getTransactionStatus,
      estimateFee: maestro.estimateFee,

      // ---- host-owned (routed to window.lace) ----
      getUTxOs: (context, address) => {
        const resolved = resolver.accountForAddress(address);
        if (!resolved) {
          return of(
            Err<ProviderError>(
              new ProviderError(
                ProviderFailure.Unknown,
                undefined,
                `no bitcoin account resolved for address ${address}`,
              ),
            ),
          );
        }
        return from(
          getBitcoinUtxos(
            resolved.walletId,
            resolved.accountIndex,
            toWireNetwork(context.network),
          ),
        ).pipe(
          map(result => {
            if (!result.ok) {
              return Err<ProviderError>(laceErrorToProviderError(result.error));
            }
            // The host serves the account's full utxo set in one shot (no
            // pagination on the wire), and BitcoinWallet never follows the
            // cursor for utxos — one page, empty cursor.
            return Ok<BitcoinPaginatedResponse<BitcoinUTxO>>({
              items: result.value.utxos.map(transportUtxoToContract),
              cursor: '',
            });
          }),
        );
      },
      submitTransaction: (context, rawTransaction) =>
        // Account-agnostic on the wire: the host decodes the inputs and
        // attributes the pending overlay to the owning account itself.
        from(
          submitBitcoinTx(rawTransaction, toWireNetwork(context.network)),
        ).pipe(
          map(result =>
            result.ok
              ? Ok(result.value.txId)
              : Err<ProviderError>(laceErrorToProviderError(result.error)),
          ),
        ),
    },
  };
};
