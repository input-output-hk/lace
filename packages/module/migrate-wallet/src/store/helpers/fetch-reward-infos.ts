import { combineLatest, map } from 'rxjs';

import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoProvider,
  CardanoRewardAccount,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export const fetchRewardInfos$ = (
  rewardAccounts: CardanoRewardAccount[],
  chainId: Cardano.ChainId,
  cardanoProvider: CardanoProvider,
): Observable<
  (RewardAccountInfo & { rewardAccount: CardanoRewardAccount })[]
> =>
  combineLatest(
    rewardAccounts.map(rewardAccount =>
      cardanoProvider.getRewardAccountInfo({ rewardAccount }, { chainId }).pipe(
        map(result => {
          if (result.isErr()) throw result.unwrapErr();
          return { ...result.unwrap(), rewardAccount };
        }),
      ),
    ),
  );
