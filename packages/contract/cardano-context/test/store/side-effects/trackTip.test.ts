import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Milliseconds, Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoNetworkId } from '../../../src';
import { cardanoContextActions } from '../../../src/store';
import { trackTip } from '../../../src/store/side-effects';
import { tip1, tip2 } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
};

const retriableError = new ProviderError(ProviderFailure.Unhealthy);
const cardanoAccount = { blockchainName: 'Cardano' } as AnyAccount;
const bitcoinAccount = { blockchainName: 'Bitcoin' } as AnyAccount;

describe('cardano-context side effects', () => {
  describe('trackTip', () => {
    const chainId = Cardano.ChainIds.Preprod;

    const tipPollFrequency = Milliseconds(2);

    it('does not call getTip when there are no Cardano accounts', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot, flush }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const getTip = vi.fn().mockReturnValue(of(Ok(tip1)));
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              // Only a Bitcoin account; no Cardano accounts → no polling.
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [bitcoinAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('');
              flush();
              expect(getTip).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('starts polling when a Cardano account is added', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const getTip = vi.fn().mockReturnValue(of(Ok(tip1)));
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              // No Cardano accounts at frame 0; one appears at frame 4.
              wallets: {
                selectActiveNetworkAccounts$: hot('a---b', {
                  a: [bitcoinAccount],
                  b: [bitcoinAccount, cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              // No emissions until frame 4; immediate setTip on activation.
              expectObservable(sideEffect$, '^----!').toBe('----a', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
            },
          };
        },
      );
    });

    it('does not call getTip while wallet is inactive', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot, flush }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const getTip = vi.fn().mockReturnValue(of(Ok(tip1)));
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('f', { f: false }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('-----');
              flush();
              expect(getTip).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('resumes polling with an immediate request when wallet becomes active', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const getTip = vi.fn().mockReturnValue(of(Ok(tip1)));
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              // Inactive at frame 0, becomes active at frame 4
              isWalletActive$: hot('f---t', { f: false, t: true }),
            },
            assertion: sideEffect$ => {
              // No emission until active; immediate setTip on activation
              expectObservable(sideEffect$, '^----!').toBe('----a', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
            },
          };
        },
      );
    });

    // Regression guard: this test fails if `whileActive` is moved
    // mid-pipeline (e.g. between `filter(Boolean)` and `switchMap`) — the
    // leaked `interval` keeps polling and `getTip` is called past the lock.
    it('stops polling when wallet transitions from active to inactive', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot, flush }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          // Mock returns identical `Ok(tip1)`. distinctUntilChanged dedupes
          // emissions, so the side-effect emits `setTip` exactly once even
          // if `getTip` is called many times. The freeze of the call count
          // post-lock is what we assert on.
          const getTip = vi.fn().mockReturnValue(of(Ok(tip1)));
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              // Active at frame 0, locked at frame 5; long idle window after.
              isWalletActive$: hot('t----f', { t: true, f: false }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^------------------!').toBe('a', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
              flush();
              // Calls at frames 0, 2, 4 with 2ms interval; lock at frame 5
              // unsubscribes the pipeline so no further calls fire.
              const expectedCallsBeforeLock = 3;
              expect(getTip.mock.calls.length).toBe(expectedCallsBeforeLock);
            },
          };
        },
      );
    });

    it('polls provider at provided interval and dispatches setTip on success', () => {
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          let calls = 0;
          const getTip = vi.fn().mockImplementation(() =>
            defer(() => {
              calls += 1;
              return of(calls === 1 ? Ok(tip1) : Ok(tip2));
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$, '^----!').toBe('a-b', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
                b: actions.cardanoContext.setTip({
                  tip: tip2,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
            },
          };
        },
      );
    });

    it('retries transient provider errors with exponential backoff and silently swallows on exhaustion', () => {
      const tipPollFrequency = Milliseconds(10_000);
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot, flush }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          let subscriptions = 0;
          const getTip = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return cold('-#', {}, retriableError);
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              // retryBackoff: 300ms + 600ms + 1200ms = 2100ms; final error swallowed → no emission.
              expectObservable(sideEffect$, '^ 2200ms !').toBe('-');
              flush();
              expect(subscriptions).toBe(4);
            },
          };
        },
      );
    });

    it('recovers on retry success and dispatches setTip', () => {
      const tipPollFrequency = Milliseconds(10_000);
      testSideEffect(
        trackTip(tipPollFrequency),
        ({ cold, expectObservable, hot, flush }) => {
          const chainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          let subscriptions = 0;
          const getTip = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              if (subscriptions === 1) return cold('-#', {}, retriableError);
              return of(Ok(tip1));
            }),
          );
          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$: chainId$ },
              wallets: {
                selectActiveNetworkAccounts$: cold('a', {
                  a: [cardanoAccount],
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTip,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              isWalletActive$: hot('t', { t: true }),
            },
            assertion: sideEffect$ => {
              // First call fails at frame 1, retry subscribes at frame 301 and emits Ok synchronously.
              expectObservable(sideEffect$, '^ 305ms !').toBe('301ms a', {
                a: actions.cardanoContext.setTip({
                  tip: tip1,
                  network: CardanoNetworkId(chainId.networkMagic),
                }),
              });
              flush();
              expect(subscriptions).toBe(2);
            },
          };
        },
      );
    });
  });
});
