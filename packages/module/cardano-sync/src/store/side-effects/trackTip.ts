import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { whileActive } from '@lace-contract/wallet-active-state';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  interval,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { Milliseconds, Result } from '@lace-lib/util';

const unwrapOrThrowError = <T, E extends Error>(result: Result<T, E>): T => {
  if (result.isErr()) throw result.unwrapErr();
  return result.unwrap();
};

export const trackTip: (tipPollFrequency: Milliseconds) => SideEffect =
  tipPollFrequency =>
  (
    _,
    {
      cardanoContext: { selectChainId$ },
      wallets: { selectActiveNetworkAccounts$ },
    },
    { actions, cardanoProvider: { getTip }, isWalletActive$, logger },
  ) =>
    // `whileActive` MUST stay at the end of the pipe. Mid-pipeline placement
    // leaves the downstream `switchMap`'s in-flight inner alive on lock — it
    // only blocks future outer emissions, not the already-running interval.
    // See ADR 25.
    combineLatest([
      selectChainId$.pipe(filter(Boolean), distinctUntilChanged()),
      selectActiveNetworkAccounts$.pipe(
        map(accounts =>
          accounts.some(account => account.blockchainName === 'Cardano'),
        ),
        distinctUntilChanged(),
      ),
    ]).pipe(
      switchMap(([chainId, hasCardanoAccounts]) => {
        if (!hasCardanoAccounts) return EMPTY;
        return merge(of(void 0), interval(tipPollFrequency)).pipe(
          exhaustMap(() =>
            getTip({ chainId }).pipe(
              map(unwrapOrThrowError),
              retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
              // No tip -> the natural sync trigger never fires, so a swallowed
              // error here stalls sync with no other symptom. Log loud.
              catchError(error => {
                logger.error(
                  `Tip fetch failed for network ${chainId.networkMagic}; sync rounds cannot trigger without a tip`,
                  error,
                );
                return EMPTY;
              }),
            ),
          ),
          distinctUntilChanged((a, b) => a.hash === b.hash),
          map(tip =>
            actions.cardanoContext.setTip({
              network: CardanoNetworkId(chainId.networkMagic),
              tip,
            }),
          ),
        );
      }),
      whileActive(isWalletActive$),
    );
