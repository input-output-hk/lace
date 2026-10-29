import { coalesceValueQuantities } from '@cardano-sdk/core';
import { BigNumber } from '@lace-lib/util';
import {
  combineLatest,
  distinct,
  distinctUntilChanged,
  map,
  mergeAll,
  mergeMap,
} from 'rxjs';

import { toAccountTokens } from '../../store/helpers/account-tokens';
import { CardanoPaymentAddress } from '../../types';
import { isCardanoCustodyAccount } from '../account';

import type { CardanoCustodyAccount } from '../account';
import type { CardanoCustodySideEffect } from '../contract';

/**
 * A custody account holds what its owner can spend through Lace while it is
 * live: plain funds without a reference script, own reserves and withdrawable
 * rewards. No Lace builder spends a plain fund carrying a reference script or
 * a foreign reserve, the control UTxO's lovelace is the state's minimum and
 * the owner's fee reserve, grant UTxOs hold lovelace only a sweep frees,
 * stranded deposits cannot be spent, and account tokens are no holding, so
 * none of them reaches the tokens store.
 *
 * The rewards come from the balance view of the reward details: a pending
 * withdrawal's rewards already sit in its outputs, which the classification
 * reads in flight, so they must not count a second time. The classified
 * state itself keeps the raw amount the chain reports.
 */
export const computeCustodyAccountTokens =
  (account: CardanoCustodyAccount): CardanoCustodySideEffect =>
  (
    _,
    {
      cardanoCustody: { selectCardanoCustodyAccountState$ },
      cardanoContext: { selectRewardAccountDetailsWithInFlight$ },
    },
    { actions },
  ) =>
    combineLatest([
      selectCardanoCustodyAccountState$.pipe(
        map(selectAccountState => selectAccountState(account.accountId)),
      ),
      selectRewardAccountDetailsWithInFlight$.pipe(
        map(
          details =>
            details[account.accountId]?.rewardAccountInfo.withdrawableAmount,
        ),
      ),
    ]).pipe(
      distinctUntilChanged(
        ([previousState, previousRewards], [state, rewards]) =>
          previousState === state && previousRewards === rewards,
      ),
      map(([accountState, inFlightRewards]) =>
        actions.tokens.setAccountTokens({
          blockchainName: 'Cardano',
          accountId: account.accountId,
          byAddress:
            accountState?.status === 'live'
              ? [
                  {
                    address: CardanoPaymentAddress(
                      account.blockchainSpecific.address,
                    ),
                    tokens: toAccountTokens(
                      coalesceValueQuantities(
                        [
                          ...accountState.funds.filter(
                            ([, txOut]) => txOut.scriptReference === undefined,
                          ),
                          ...accountState.reserves.own,
                        ].map(([, txOut]) => txOut.value),
                      ),
                      inFlightRewards === undefined
                        ? accountState.withdrawableRewards
                        : BigNumber.valueOf(inFlightRewards),
                    ),
                  },
                ]
              : [],
        }),
      ),
    );

/**
 * Tracks the tokens of every active custody account, which the Cardano
 * context's own token tracking leaves to this store.
 */
export const trackCustodyAccountTokens: CardanoCustodySideEffect = (
  actionObservables,
  stateObservables,
  dependencies,
) =>
  stateObservables.cardanoContext.selectActiveCardanoAccounts$.pipe(
    mergeAll(),
    distinct(account => account.accountId),
    mergeMap(account =>
      isCardanoCustodyAccount(account)
        ? computeCustodyAccountTokens(account)(
            actionObservables,
            stateObservables,
            dependencies,
          )
        : [],
    ),
  );
