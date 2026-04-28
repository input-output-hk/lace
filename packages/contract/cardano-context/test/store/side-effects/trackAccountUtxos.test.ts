import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src';
import { CardanoRewardAccount, CardanoPaymentAddress } from '../../../src';
import { trackAccountUtxos } from '../../../src/store/side-effects/track-account-utxos';
import { account0Context, cardanoAccount0Addr, chainId } from '../../mocks';

import type { CardanoProvider } from '../../../src';
import type { AnyAddress } from '@lace-contract/addresses';

const actions = {
  ...cardanoContextActions,
};

const accountId1 = account0Context.accountId;
const accountId2 = AccountId('test-account-2');

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);
const rewardAccount2 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);

const mockAddress1: AnyAddress = {
  ...cardanoAccount0Addr,
  data: {
    rewardAccount: rewardAccount1,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const mockAddress2: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
  ),
  accountId: accountId2,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount2,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

// Create UTxO using mockAddress1's payment credential (from cardanoAccount0Addr)
const legitimateUtxoForAccount1: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    txId: Cardano.TransactionId(
      '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    value: {
      coins: BigInt(10),
      assets: new Map(),
    },
  },
];

// Create UTxO using mockAddress2's payment credential
const legitimateUtxoForAccount2: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
    ),
    txId: Cardano.TransactionId(
      '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
    ),
    index: 1,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
    ),
    value: {
      coins: BigInt(5),
      assets: new Map(),
    },
  },
];

// Non-retriable: BadRequest does not pass PROVIDER_REQUEST_RETRY_CONFIG.shouldRetry,
// so existing failure tests fail fast without triggering retryBackoff delays.
const providerError = new ProviderError(ProviderFailure.BadRequest);
// Retriable: Unhealthy is classified as transient by isRetriableError and
// exercises the full retryBackoff schedule (300ms + 600ms + 1200ms).
const retriableProviderError = new ProviderError(ProviderFailure.Unhealthy);

describe('trackAccountUtxos', () => {
  it('re-fetches UTxOs for all accounts when any transaction count changes', () => {
    const getAccountUtxos = vi.fn().mockImplementation(({ rewardAccount }) => {
      if (rewardAccount === rewardAccount1)
        return of(Ok([legitimateUtxoForAccount1]));
      if (rewardAccount === rewardAccount2)
        return of(Ok([legitimateUtxoForAccount2]));
      return of(Ok([]));
    });

    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [mockAddress1, mockAddress2],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountUtxos$: cold('a', { a: {} }),
          selectAccountTransactionsTotal$: cold('a-------b-------c', {
            a: { [accountId1]: 5, [accountId2]: 10 },
            b: { [accountId1]: 6, [accountId2]: 10 },
            c: { [accountId1]: 6, [accountId2]: 11 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
        actions,
        logger: dummyLogger,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(ab)----(ab)----(ab)', {
          a: actions.cardanoContext.setAccountUtxos({
            accountId: accountId1,
            utxos: [legitimateUtxoForAccount1],
          }),
          b: actions.cardanoContext.setAccountUtxos({
            accountId: accountId2,
            utxos: [legitimateUtxoForAccount2],
          }),
        });
      },
    }));
  });

  it('dispatches failed action when provider fails with a non-retriable error', () => {
    const getAccountUtxos = vi.fn().mockReturnValue(of(Err(providerError)));

    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountUtxos$: cold('a', { a: {} }),
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountId1]: 10 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
        actions,
        logger: dummyLogger,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.cardanoContext.getAccountUtxosFailed({
            accountId: accountId1,
            chainId,
            failure: providerError.reason,
          }),
        });
      },
    }));
  });

  it('does nothing if addresses have no reward accounts', () => {
    const addressWithoutRewardAccount = {
      ...mockAddress1,
      data: { rewardAccount: undefined },
    };
    const getAccountUtxos = vi.fn();

    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [addressWithoutRewardAccount],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountUtxos$: cold('a', { a: {} }),
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountId1]: 10 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
        actions,
        logger: dummyLogger,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-');
      },
    }));
  });

  it('fetches UTxOs when a new account appears in transaction totals', () => {
    const getAccountUtxos = vi.fn().mockImplementation(({ rewardAccount }) => {
      if (rewardAccount === rewardAccount1)
        return of(Ok([legitimateUtxoForAccount1]));
      if (rewardAccount === rewardAccount2)
        return of(Ok([legitimateUtxoForAccount2]));
      return of(Ok([]));
    });

    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [mockAddress1, mockAddress2],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountUtxos$: cold('a', { a: {} }),
          selectAccountTransactionsTotal$: cold('a---b', {
            a: { [accountId1]: 5 },
            b: { [accountId1]: 5, [accountId2]: 3 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
        actions,
        logger: dummyLogger,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a---(ab)', {
          a: actions.cardanoContext.setAccountUtxos({
            accountId: accountId1,
            utxos: [legitimateUtxoForAccount1],
          }),
          b: actions.cardanoContext.setAccountUtxos({
            accountId: accountId2,
            utxos: [legitimateUtxoForAccount2],
          }),
        });
      },
    }));
  });

  describe('franken address filtering', () => {
    // Create a franken UTxO with a different payment credential
    // Using a valid testnet address that has a different payment credential than mockAddress1
    const frankenUtxo: Cardano.Utxo = [
      {
        address: Cardano.PaymentAddress(
          'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
        ),
        txId: Cardano.TransactionId(
          '1111111111111111111111111111111111111111111111111111111111111111',
        ),
        index: 0,
      },
      {
        address: Cardano.PaymentAddress(
          'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
        ),
        value: {
          coins: BigInt(5_000_000),
          assets: new Map(),
        },
      },
    ];

    it('filters out franken UTxOs and stores only legitimate ones', () => {
      // Account 1 gets mixed legitimate and franken
      // Account 2 gets only legitimate
      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          if (rewardAccount === rewardAccount1)
            return of(Ok([legitimateUtxoForAccount1, frankenUtxo]));
          if (rewardAccount === rewardAccount2)
            return of(Ok([legitimateUtxoForAccount2]));
          return of(Ok([]));
        });
      const logger = { ...dummyLogger, warn: vi.fn() };

      testSideEffect(
        trackAccountUtxos,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', {
                a: [mockAddress1, mockAddress2],
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 5, [accountId2]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId: accountId1,
                utxos: [legitimateUtxoForAccount1],
              }),
              b: actions.cardanoContext.setAccountUtxos({
                accountId: accountId2,
                utxos: [legitimateUtxoForAccount2],
              }),
            });

            flush();
            // Verify logger was called only once (for account 1)
            expect(logger.warn).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(
              expect.stringContaining('Filtered 1 franken UTxOs'),
            );
          },
        }),
      );
    });

    it('sets empty array when all UTxOs are franken addresses', () => {
      const getAccountUtxos = vi.fn().mockReturnValue(of(Ok([frankenUtxo])));
      const logger = { ...dummyLogger, warn: vi.fn() };

      testSideEffect(
        trackAccountUtxos,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress1] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId: accountId1,
                utxos: [],
              }),
            });

            flush();
            // Verify logger was called for filtering
            expect(logger.warn).toHaveBeenCalledWith(
              expect.stringContaining('Filtered 1 franken UTxOs'),
            );
          },
        }),
      );
    });
  });

  it('cancels in-flight fetches on rapid updates via switchMap', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const getAccountUtxos = vi.fn().mockImplementation(() => {
        // Each fetch takes 3 frames
        return cold('---a|', { a: Ok([legitimateUtxoForAccount1]) });
      });

      return {
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress1] }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectAccountUtxos$: cold('a', { a: {} }),
            // Rapid updates: 5 at frame 0, 6 at frame 1, 7 at frame 2
            selectAccountTransactionsTotal$: cold('abc', {
              a: { [accountId1]: 5 },
              b: { [accountId1]: 6 }, // While first fetch still running
              c: { [accountId1]: 7 }, // While first fetch still running
            }),
          },
        },
        dependencies: {
          cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('------a', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId: accountId1,
              utxos: [legitimateUtxoForAccount1],
            }),
          });

          flush();
          // switchMap subscribes to the fetch each time (3 calls), but cancels the first 2
          expect(getAccountUtxos).toHaveBeenCalledTimes(3);
        },
      };
    });
  });

  it('processes multiple accounts concurrently when transaction counts change simultaneously', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      // Mock with delays to demonstrate concurrent processing
      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          const delay = '---a|'; // 3 frames delay for each fetch
          if (rewardAccount === rewardAccount1) {
            return cold(delay, { a: Ok([legitimateUtxoForAccount1]) });
          }
          if (rewardAccount === rewardAccount2) {
            return cold(delay, { a: Ok([legitimateUtxoForAccount2]) });
          }
          return of(Ok([]));
        });

      return {
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [mockAddress1, mockAddress2],
            }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectAccountUtxos$: cold('a', { a: {} }),
            // Both accounts start with transaction data simultaneously
            selectAccountTransactionsTotal$: cold('a', {
              a: { [accountId1]: 5, [accountId2]: 10 },
            }),
          },
        },
        dependencies: {
          cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // With concurrent processing: both complete at frame 4 (3-frame fetch + 1-frame exhaustMap delay)
          // With serialized processing would be a----b (frame 4 and frame 8)
          expectObservable(sideEffect$).toBe('----(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId: accountId1,
              utxos: [legitimateUtxoForAccount1],
            }),
            b: actions.cardanoContext.setAccountUtxos({
              accountId: accountId2,
              utxos: [legitimateUtxoForAccount2],
            }),
          });

          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(2);
        },
      };
    });
  });

  describe('multi-stake-key support', () => {
    it('fetches and merges UTxOs for account with multiple stake keys', () => {
      const rewardAccount1 = CardanoRewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      );
      const rewardAccount2 = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );

      // Single account (accountId1) with TWO addresses having different stake keys
      const address1 = mockAddress1; // Already has rewardAccount1, accountId1
      const address2 = {
        ...mockAddress2, // Different payment address
        accountId: accountId1, // ← Same account as address1!
        data: {
          ...(mockAddress2.data ?? {}),
          rewardAccount: rewardAccount2, // Different stake key
        },
      };

      const utxos1 = [legitimateUtxoForAccount1]; // From stake key 1
      const utxos2 = [legitimateUtxoForAccount2]; // From stake key 2

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          if (rewardAccount === rewardAccount1) return of(Ok(utxos1));
          if (rewardAccount === rewardAccount2) return of(Ok(utxos2));
          return of(Ok([]));
        });

      testSideEffect(
        trackAccountUtxos,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [address1, address2] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 5 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId: accountId1,
                utxos: [...utxos1, ...utxos2], // Merged from both stake keys
              }),
            });

            flush();
            // Verify getAccountUtxos called twice (once per stake key)
            expect(getAccountUtxos).toHaveBeenCalledTimes(2);
            expect(getAccountUtxos).toHaveBeenCalledWith(
              { rewardAccount: rewardAccount1 },
              { chainId },
            );
            expect(getAccountUtxos).toHaveBeenCalledWith(
              { rewardAccount: rewardAccount2 },
              { chainId },
            );
          },
        }),
      );
    });

    it('emits error when any stake key fetch fails (non-retriable)', () => {
      const rewardAccount1 = CardanoRewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      );
      const rewardAccount2 = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );

      // Single account with two addresses having different stake keys
      const address1 = mockAddress1;
      const address2 = {
        ...mockAddress2,
        accountId: accountId1,
        data: {
          ...(mockAddress2.data ?? {}),
          rewardAccount: rewardAccount2,
        },
      };

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          if (rewardAccount === rewardAccount1) {
            return of(Ok([legitimateUtxoForAccount1]));
          }
          if (rewardAccount === rewardAccount2) {
            return of(Err(providerError)); // Second fails
          }
          return of(Ok([]));
        });

      testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', { a: [address1, address2] }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectAccountUtxos$: cold('a', { a: {} }),
            selectAccountTransactionsTotal$: cold('a', {
              a: { [accountId1]: 5 },
            }),
          },
        },
        dependencies: {
          cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.getAccountUtxosFailed({
              accountId: accountId1,
              chainId,
              failure: providerError.reason,
            }),
          });
        },
      }));
    });
  });

  describe('retry behavior', () => {
    it('retries retriable errors with exponential backoff before failing', () => {
      // Each retry resubscribes the upstream; wrapping the observable in defer()
      // means the factory (and thus the subscription counter) runs per-attempt.
      // retryBackoff delays: 300ms + 600ms + 1200ms = 2100ms, plus 4 × 1ms
      // frame overhead from cold('-#') = emission at frame 2104.
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        let subscriptions = 0;
        const getAccountUtxos = vi.fn().mockImplementation(() =>
          defer(() => {
            subscriptions += 1;
            return cold('-#', {}, retriableProviderError);
          }),
        );

        return {
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress1] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('2104ms a', {
              a: actions.cardanoContext.getAccountUtxosFailed({
                accountId: accountId1,
                chainId,
                failure: retriableProviderError.reason,
              }),
            });

            flush();
            // 1 initial attempt + 3 retries
            expect(subscriptions).toBe(4);
          },
        };
      });
    });

    it('recovers without emitting failure when a retry succeeds', () => {
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        let subscriptions = 0;
        const getAccountUtxos = vi.fn().mockImplementation(() =>
          defer(() => {
            subscriptions += 1;
            if (subscriptions === 1) {
              return cold('-#', {}, retriableProviderError);
            }
            return cold('a|', { a: Ok([legitimateUtxoForAccount1]) });
          }),
        );

        return {
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress1] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // 1st attempt: cold('-#') errors at frame 1.
            // retryBackoff waits 300ms and resubscribes at frame 301; the new
            // cold('a|') emits at frame 301 and completes at frame 302, so
            // forkJoin emits the success value at frame 302.
            expectObservable(sideEffect$).toBe('302ms a', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId: accountId1,
                utxos: [legitimateUtxoForAccount1],
              }),
            });

            flush();
            // 1 failed attempt + 1 successful retry
            expect(subscriptions).toBe(2);
          },
        };
      });
    });

    it('does not retry non-retriable errors', () => {
      const getAccountUtxos = vi.fn().mockReturnValue(of(Err(providerError)));

      testSideEffect(
        trackAccountUtxos,
        ({ cold, expectObservable, flush }) => ({
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress1] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountUtxos$: cold('a', { a: {} }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: { getAccountUtxos } as unknown as CardanoProvider,
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.getAccountUtxosFailed({
                accountId: accountId1,
                chainId,
                failure: providerError.reason,
              }),
            });

            flush();
            expect(getAccountUtxos).toHaveBeenCalledTimes(1);
          },
        }),
      );
    });
  });
});
