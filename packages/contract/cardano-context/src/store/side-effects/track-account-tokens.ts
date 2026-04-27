import { coalesceValueQuantities } from '@cardano-sdk/core';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import groupBy from 'lodash/groupBy';
import {
  combineLatest,
  distinct,
  distinctUntilChanged,
  map,
  mergeAll,
  mergeMap,
} from 'rxjs';

import { LOVELACE_TOKEN_ID } from '../../const';

import type { SideEffect } from '../../contract';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

const computeAccountTokens =
  (accountId: AccountId): SideEffect =>
  (
    _,
    { cardanoContext: { selectAccountUtxos$, selectRewardAccountDetails$ } },
    { actions },
  ) =>
    combineLatest([selectAccountUtxos$, selectRewardAccountDetails$]).pipe(
      map(([accountUtxoMap, rewardAccountDetailsMap]) => ({
        accountUtxos: accountUtxoMap[accountId],
        rewardBalance:
          rewardAccountDetailsMap[accountId]?.rewardAccountInfo
            .withdrawableAmount ?? BigNumber(0n),
      })),
      distinctUntilChanged(
        (a, b) =>
          a.accountUtxos === b.accountUtxos &&
          a.rewardBalance === b.rewardBalance,
      ),
      map(({ accountUtxos, rewardBalance }) => ({
        utxos: accountUtxos || [],
        rewardBalance,
      })),
      map(({ utxos, rewardBalance }) => ({
        addressValues: Object.entries(
          groupBy(utxos, ([_, txOut]) => txOut.address),
        ).map(
          ([address, utxosAtAddress]) =>
            [
              address as Address,
              coalesceValueQuantities(
                utxosAtAddress.map(([_, txOut]) => txOut.value),
              ),
            ] as const,
        ),
        rewardBalance,
      })),
      map(({ addressValues, rewardBalance }) =>
        actions.tokens.setAccountTokens({
          blockchainName: 'Cardano',
          accountId,
          byAddress: addressValues.map(([address, value], index) => ({
            address,
            tokens: [
              {
                tokenId: LOVELACE_TOKEN_ID,
                available:
                  index === 0
                    ? BigNumber(value.coins + BigNumber.valueOf(rewardBalance))
                    : BigNumber(value.coins),
                pending: BigNumber(0n),
              },
              ...[...(value.assets?.entries() || [])].map(
                ([assetId, quantity]) => ({
                  tokenId: TokenId(assetId),
                  available: BigNumber(quantity),
                  pending: BigNumber(0n),
                }),
              ),
            ],
          })),
        }),
      ),
    );

/**
 * Computes tokens from utxos and withdrawable reward amount for all activated Cardano accounts.
 * ADA balance is set as sum of UTXO coins and withdrawable amount (added to first address).
 */
export const trackAccountTokens: SideEffect = (
  actionObservables,
  stateObservables,
  dependencies,
) =>
  stateObservables.cardanoContext.selectActiveCardanoAccounts$.pipe(
    mergeAll(),
    distinct(accumulator => accumulator.accountId),
    mergeMap(({ accountId }) =>
      computeAccountTokens(accountId)(
        actionObservables,
        stateObservables,
        dependencies,
      ),
    ),
  );
