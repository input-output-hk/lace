import { Err, Ok } from '@lace-lib/util';
import { isNotFoundError } from '@lace-lib/util-provider';
import { catchError, from, map, of, type Observable } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';
import { BlockfrostToCardanoSDK } from '../blockfrost-to-cardano-sdk';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

/**
 * Provider responsible for fetching UTxOs for a given reward account (stake address).
 * Uses Blockfrost `accounts/{stake_address}/utxos` endpoint.
 */
export class BlockfrostUtxoProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetch UTxOs controlled by a reward account.
   *
   * @param rewardAccount stake address (e.g. `stake1...`)
   * @param pageSize pagination size (default 100)
   */
  public getAccountUtxos({
    rewardAccount,
    pageSize = 100,
  }: {
    rewardAccount: CardanoRewardAccount;
    pageSize?: number;
  }): Observable<Result<Cardano.Utxo[], ProviderError>> {
    return from(
      this.paginatedRequests<Responses['account_utxo_content']>({
        endpoint: `accounts/${rewardAccount}/utxos?order=desc`,
        pageSize,
      }),
    ).pipe(
      map(items => Ok(BlockfrostToCardanoSDK.accountUtxos(items))),
      catchError(error => of(Err(error as ProviderError))),
    );
  }

  /**
   * Fetch the UTxOs sitting at a single payment address, with inline datums
   * populated (via `addressUtxoContent`). Used to discover script-address
   * UTxOs such as the cNIGHT designation registration UTxO.
   *
   * Blockfrost returns 404 for an address that has never held funds; that is
   * a valid empty result here, not an error.
   *
   * @param address payment address (e.g. `addr1...` / a script `addr1w...`)
   * @param pageSize pagination size (default 100)
   */
  public getUtxosAtAddress({
    address,
    pageSize = 100,
  }: {
    address: CardanoPaymentAddress;
    pageSize?: number;
  }): Observable<Result<Cardano.Utxo[], ProviderError>> {
    return from(
      this.paginatedRequests<Responses['address_utxo_content']>({
        endpoint: `addresses/${address}/utxos?order=desc`,
        pageSize,
      }),
    ).pipe(
      map(items =>
        Ok(
          items.map(utxo =>
            BlockfrostToCardanoSDK.addressUtxoContent(address, utxo),
          ),
        ),
      ),
      catchError(error =>
        // Blockfrost responds 404 for an address with no UTxO history — a
        // valid empty result, not an error.
        isNotFoundError(error)
          ? of(Ok<Cardano.Utxo[]>([]))
          : of(Err(error as ProviderError)),
      ),
    );
  }
}
