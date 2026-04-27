import { EMPTY, map, merge as rxMerge, type Observable, switchMap } from 'rxjs';

import { extractUniqueStakeKeys } from '../helpers';
import { prepareCardanoAccountsData } from '../helpers/prepareCardanoAccountsData';

import type { SideEffect, Action } from '../../contract';
import type { AccountMetadata } from '../helpers/prepareCardanoAccountsData';

/**
 * Fetches reward account info for the first stake key in an account.
 */
const fetchDetailsForFirstStakeKey = (
  account: AccountMetadata,
  dependencies: Parameters<SideEffect>[2],
): Observable<Action> => {
  const { accountAddresses, chainId, accountId } = account;
  const {
    cardanoProvider: { getRewardAccountInfo },
    actions,
  } = dependencies;

  const stakeKeys = extractUniqueStakeKeys(accountAddresses);

  if (stakeKeys.length === 0) return EMPTY;

  const rewardAccount = stakeKeys[0];

  return getRewardAccountInfo({ rewardAccount }, { chainId }).pipe(
    map(rewardAccountInfoResult => {
      if (rewardAccountInfoResult.isErr()) {
        return actions.cardanoContext.getRewardAccountDetailsFailed({
          accountId,
          rewardAccount,
          chainId,
          failure: rewardAccountInfoResult.unwrapErr().reason,
        });
      }

      return actions.cardanoContext.setRewardAccountDetails({
        accountId,
        details: {
          rewardAccountInfo: rewardAccountInfoResult.unwrap(),
        },
      });
    }),
  );
};

/**
 * Side effect that tracks reward account details for all Cardano accounts.
 *
 * Uses `switchMap` on the accounts array so that when the set of active
 * accounts changes (e.g. wallet removed then restored with the same
 * recovery phrase), previous per-account fetch subscriptions are cancelled
 * and new ones are created.
 *
 * Fetches details for only the first stake key per account.
 */
export const trackRewardAccountDetails: SideEffect = (
  _,
  stateObservables,
  dependencies,
) =>
  prepareCardanoAccountsData(stateObservables).pipe(
    switchMap(accounts =>
      rxMerge(
        ...accounts.map(account =>
          fetchDetailsForFirstStakeKey(account, dependencies),
        ),
      ),
    ),
  );
