import { coalesceValueQuantities } from '@cardano-sdk/core';
import { BigNumber } from '@lace-lib/util';
import groupBy from 'lodash/groupBy';
import {
  combineLatest,
  distinct,
  distinctUntilChanged,
  filter,
  map,
  mergeAll,
  mergeMap,
} from 'rxjs';

import { isExtensionTokenAccount } from '../../extensions';
import { toAccountTokens } from '../helpers/account-tokens';

import type { SideEffect } from '../../contract';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

const computeAccountTokens =
  (accountId: AccountId): SideEffect =>
  (
    _,
    {
      cardanoContext: {
        selectAccountUtxosWithInFlight$,
        selectRewardAccountDetailsWithInFlight$,
      },
    },
    { actions },
  ) =>
    // The in-flight view, not the raw set: a submitted-but-unsettled spend
    // (e.g. a migration sweep) must leave the source's balance the moment it
    // is submitted and credit the destination once — the raw sets double-count
    // it until both providers catch up (LW-15318).
    // Rewards likewise: a pending withdrawal's rewards already sit in its
    // outputs, so the in-flight view stops counting them as withdrawable.
    combineLatest([
      selectAccountUtxosWithInFlight$,
      selectRewardAccountDetailsWithInFlight$,
    ]).pipe(
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
            tokens: toAccountTokens(
              value,
              index === 0 ? BigNumber.valueOf(rewardBalance) : 0n,
            ),
          })),
        }),
      ),
    );

/**
 * Computes tokens from utxos and withdrawable reward amount for all activated
 * Cardano accounts, except those a feature's own store tracks.
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
    filter(account => !isExtensionTokenAccount(account)),
    mergeMap(account =>
      computeAccountTokens(account.accountId)(
        actionObservables,
        stateObservables,
        dependencies,
      ),
    ),
  );
