import { Cardano } from '@cardano-sdk/core';
import { BigNumber, Err, Ok } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  GetAccountRewardsProps,
  WithdrawalInfo,
} from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

type BlockfrostWithdrawalList = Responses['account_withdrawal_content'];

export class BlockfrostWithdrawalsProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetches all withdrawal history for a given reward account.
   *
   * @param rewardAccount CardanoRewardAccount to fetch the withdrawals for
   * @returns Observable with Result containing all withdrawals or an error
   */
  public getAccountWithdrawals({
    rewardAccount,
  }: GetAccountRewardsProps): Observable<
    Result<WithdrawalInfo[], ProviderError>
  > {
    return from(
      this.paginatedRequests<BlockfrostWithdrawalList>({
        endpoint: `accounts/${rewardAccount}/withdrawals?order=desc`,
        pageSize: 100,
      }),
    ).pipe(
      map(withdrawals =>
        Ok(
          withdrawals.map(withdrawal => ({
            txHash: Cardano.TransactionId(withdrawal.tx_hash),
            amount: BigNumber(BigInt(withdrawal.amount)),
          })),
        ),
      ),
      catchError(error => of(Err(error as ProviderError))),
    );
  }
}
