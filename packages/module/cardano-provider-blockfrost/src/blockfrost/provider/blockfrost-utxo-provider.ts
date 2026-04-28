import { Err, Ok } from '@lace-sdk/util';
import { catchError, from, map, of, type Observable } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';
import { BlockfrostToCardanoSDK } from '../blockfrost-to-cardano-sdk';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoRewardAccount } from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
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
}
