import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  EMPTY,
  forkJoin,
  map,
  merge as rxMerge,
  of,
  type Observable,
  type OperatorFunction,
  switchMap,
} from 'rxjs';

import { extractUniqueStakeKeys } from '../helpers';
import {
  extractOwnedPaymentCredentials,
  filterFrankenUtxos,
} from '../helpers/filter-franken-utxos';
import { prepareCardanoAccountsData } from '../helpers/prepareCardanoAccountsData';

import type { SideEffect, Action } from '../../contract';
import type { AccountMetadata } from '../helpers/prepareCardanoAccountsData';
import type {
  Cardano,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import type { AccountId } from '@lace-contract/wallet-repo';

type FetchResult = {
  utxos: Cardano.Utxo[];
  error?: {
    accountId: AccountId;
    chainId: Cardano.ChainId;
    failure: ProviderFailure;
  };
};

/**
 * Fetches UTxOs for all unique stake keys in an account using parallel requests.
 * Merges successful results and handles errors.
 *
 * Retries retriable provider errors with exponential backoff before surfacing
 * a failure. The Err result is returned as a ProviderError so
 * `PROVIDER_REQUEST_RETRY_CONFIG.shouldRetry` can classify it; after retries
 * are exhausted, `catchError` converts it back into a FetchResult value so
 * sibling accounts in the outer `rxMerge` are not cancelled.
 */
const fetchUtxosForAllStakeKeys = (
  account: AccountMetadata,
  dependencies: Parameters<SideEffect>[2],
): Observable<FetchResult> => {
  const { accountAddresses, chainId, accountId } = account;
  const {
    cardanoProvider: { getAccountUtxos },
  } = dependencies;

  // Extract all unique stake keys
  const stakeKeys = extractUniqueStakeKeys(accountAddresses);

  // Edge case: no stake keys found
  if (stakeKeys.length === 0) return EMPTY;

  // Parallel fetch UTxOs for all stake keys
  return forkJoin(
    stakeKeys.map(rewardAccount =>
      getAccountUtxos({ rewardAccount }, { chainId }),
    ),
  ).pipe(
    // Convert Err results to thrown errors so retryBackoff can see them
    map(results => {
      const firstError = results.find(r => r.isErr());
      if (firstError) throw firstError.unwrapErr();
      return { utxos: results.flatMap(r => r.unwrap()) };
    }),
    retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    // After retries exhausted, convert thrown error back to FetchResult shape
    catchError((error: ProviderError) =>
      of<FetchResult>({
        utxos: [],
        error: {
          accountId,
          chainId,
          failure: error.reason,
        },
      }),
    ),
  );
};

/**
 * Filters franken addresses from fetched UTxOs and logs filtered count.
 */
const filterFrankenAddresses = (
  account: AccountMetadata,
  dependencies: Parameters<SideEffect>[2],
): OperatorFunction<FetchResult, FetchResult> =>
  map(fetchResult => {
    const { logger } = dependencies;

    // Pass through errors unchanged
    if (fetchResult.error) {
      return {
        utxos: [],
        error: fetchResult.error,
      };
    }

    // Extract owned payment credentials for filtering franken addresses
    const ownedCredentials = extractOwnedPaymentCredentials(
      account.accountAddresses,
    );

    // Filter out franken address UTxOs (addresses with payment credentials we don't own)
    const { legitimate, franken } = filterFrankenUtxos(
      fetchResult.utxos,
      ownedCredentials,
    );

    // Log filtered franken addresses for debugging
    if (franken.length > 0) {
      logger.warn(
        `Filtered ${franken.length} franken UTxOs for account ${account.accountId}`,
      );
    }

    return { utxos: legitimate };
  });

/**
 * Emits appropriate Redux action based on fetch result.
 */
const emitUtxosActions = (
  account: AccountMetadata,
  dependencies: Parameters<SideEffect>[2],
): OperatorFunction<FetchResult, Action> =>
  map(result => {
    const { actions } = dependencies;

    if (result.error) {
      return actions.cardanoContext.getAccountUtxosFailed(result.error);
    }

    return actions.cardanoContext.setAccountUtxos({
      accountId: account.accountId,
      utxos: result.utxos,
    });
  });

/**
 * Orchestrates the complete UTxO fetching and processing pipeline for a single account.
 * Note: Concurrency control (exhaustMap) is handled in trackAndFetchAccountUtxos.
 */
const fetchAndProcessAccountUtxos = (
  account: AccountMetadata,
  dependencies: Parameters<SideEffect>[2],
): Observable<Action> =>
  fetchUtxosForAllStakeKeys(account, dependencies).pipe(
    filterFrankenAddresses(account, dependencies),
    emitUtxosActions(account, dependencies),
  );

/**
 * Side effect that tracks UTxOs for all Cardano accounts.
 *
 * Uses `switchMap` on the accounts array so that when the set of active
 * accounts changes (e.g. wallet removed then restored with the same
 * recovery phrase), previous per-account fetch subscriptions are cancelled
 * and new ones are created.
 *
 * Supports multi-delegation by extracting all unique stake keys from an account's
 * addresses and fetching UTxOs for each in parallel. Results are merged into a
 * single UTxO set for the account.
 *
 * Filters out "franken addresses" - UTxOs where the address combines the user's
 * stake credential with a payment credential they don't own. Only UTxOs with
 * payment credentials matching the account's discovered addresses are stored.
 */
export const trackAccountUtxos: SideEffect = (
  _,
  stateObservables,
  dependencies,
) =>
  prepareCardanoAccountsData(stateObservables).pipe(
    switchMap(accounts =>
      rxMerge(
        ...accounts.map(account =>
          fetchAndProcessAccountUtxos(account, dependencies),
        ),
      ),
    ),
  );
