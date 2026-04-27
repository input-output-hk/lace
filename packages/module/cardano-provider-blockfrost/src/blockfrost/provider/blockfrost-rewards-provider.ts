import { Cardano } from '@cardano-sdk/core';
import { BigNumber, Err, Ok } from '@lace-sdk/util';
import { catchError, from, map, of } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  GetAccountRewardsProps,
  GetRewardAccountInfoProps,
  Reward,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

type BlockfrostRewardList = Responses['account_reward_content'];
// Extend the SDK type to include `registered` field added in a recent Blockfrost API
// version (not yet update on @blockfrost/blockfrost-js).
// `registered` is true when the stake key is registered (regardless of delegation status),
// while `active` is only true when registered AND delegated to a pool.
type BlockfrostAccountContent = Responses['account_content'] & {
  registered?: boolean;
};

export class BlockfrostRewardsProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  /**
   * Fetches the total rewards balance for a given reward account.
   *
   * @param rewardAccount CardanoRewardAccount to fetch the balance for
   * @param epochs Optional range of epochs to filter the rewards
   * @returns Observable with Result containing the rewards or an error
   */
  public getAccountRewards({
    rewardAccount,
  }: GetAccountRewardsProps): Observable<Result<Reward[], ProviderError>> {
    return from(
      this.paginatedRequests<BlockfrostRewardList>({
        endpoint: `accounts/${rewardAccount}/rewards?order=desc`,
        pageSize: 100,
      }),
    ).pipe(
      map(rewards =>
        Ok(
          rewards.map(reward => ({
            epoch: Cardano.EpochNo(reward.epoch),
            rewards: BigNumber(BigInt(reward.amount)),
            poolId: Cardano.PoolId(reward.pool_id),
          })),
        ),
      ),
      catchError(error => of(Err(error as ProviderError))),
    );
  }

  /**
   * Fetches stake account information for a given reward account.
   *
   * @param rewardAccount CardanoRewardAccount to fetch info for
   * @returns Observable with Result containing RewardAccountInfo or an error
   */
  public getRewardAccountInfo({
    rewardAccount,
  }: GetRewardAccountInfoProps): Observable<
    Result<RewardAccountInfo, ProviderError>
  > {
    return from(
      this.request<BlockfrostAccountContent>(`accounts/${rewardAccount}`)
        .then(
          (account): Result<RewardAccountInfo, ProviderError> =>
            Ok({
              isActive: account.active,
              isRegistered: account.registered ?? account.active,
              ...(account.pool_id && {
                poolId: Cardano.PoolId(account.pool_id),
              }),
              ...(account.drep_id && { drepId: account.drep_id }),
              rewardsSum: BigNumber(BigInt(account.rewards_sum)),
              withdrawableAmount: BigNumber(
                BigInt(account.withdrawable_amount),
              ),
              controlledAmount: BigNumber(BigInt(account.controlled_amount)),
            }),
        )
        .catch(error => Err(error as ProviderError)),
    );
  }
}
