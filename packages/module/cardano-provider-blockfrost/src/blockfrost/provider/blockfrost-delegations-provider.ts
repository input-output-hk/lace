import { Cardano } from '@cardano-sdk/core';
import { BigNumber, Err, Ok } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  GetAccountRewardsProps,
  DelegationInfo,
} from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

type BlockfrostDelegationList = Responses['account_delegation_content'];

export class BlockfrostDelegationsProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetches all delegation history for a given reward account.
   *
   * @param rewardAccount CardanoRewardAccount to fetch the delegations for
   * @returns Observable with Result containing all delegations or an error
   */
  public getAccountDelegations({
    rewardAccount,
  }: GetAccountRewardsProps): Observable<
    Result<DelegationInfo[], ProviderError>
  > {
    return from(
      this.paginatedRequests<BlockfrostDelegationList>({
        endpoint: `accounts/${rewardAccount}/delegations?order=desc`,
        pageSize: 100,
      }),
    ).pipe(
      map(delegations =>
        Ok(
          delegations.map(delegation => ({
            activeEpoch: Cardano.EpochNo(delegation.active_epoch),
            txHash: Cardano.TransactionId(delegation.tx_hash),
            amount: BigNumber(BigInt(delegation.amount)),
            poolId: Cardano.PoolId(delegation.pool_id),
          })),
        ),
      ),
      catchError(error => of(Err(error as ProviderError))),
    );
  }
}
