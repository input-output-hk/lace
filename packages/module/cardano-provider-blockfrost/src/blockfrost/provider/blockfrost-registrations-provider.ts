import { Cardano } from '@cardano-sdk/core';
import { Err, Ok } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  GetAccountRewardsProps,
  RegistrationInfo,
} from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

type BlockfrostRegistrationList = Responses['account_registration_content'];

export class BlockfrostRegistrationsProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetches all registration history for a given reward account.
   *
   * @param rewardAccount CardanoRewardAccount to fetch the registrations for
   * @returns Observable with Result containing all registrations or an error
   */
  public getAccountRegistrations({
    rewardAccount,
  }: GetAccountRewardsProps): Observable<
    Result<RegistrationInfo[], ProviderError>
  > {
    return from(
      this.paginatedRequests<BlockfrostRegistrationList>({
        endpoint: `accounts/${rewardAccount}/registrations?order=desc`,
        pageSize: 100,
      }),
    ).pipe(
      map(registrations =>
        Ok(
          registrations.map(registration => ({
            txHash: Cardano.TransactionId(registration.tx_hash),
            action: registration.action,
          })),
        ),
      ),
      catchError(error => of(Err(error as ProviderError))),
    );
  }
}
