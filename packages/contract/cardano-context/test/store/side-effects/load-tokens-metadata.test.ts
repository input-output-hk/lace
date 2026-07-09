import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { failuresActions } from '@lace-contract/failures';
import { tokensActions } from '@lace-contract/tokens';
import { TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { loadTokensMetadata } from '../../../src/store/side-effects/load-tokens-metadata';
import { TokenMetadataFailureId } from '../../../src/value-objects';
import { chainId } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { TokenMetadata } from '@lace-contract/tokens';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
  ...failuresActions,
};

const testTokenId = TokenId('test-token-id');
const testTokenMetadata: TokenMetadata = {
  name: 'Test Token',
  ticker: 'TEST',
  decimals: 6,
  image: 'https://example.com/token.png',
  blockchainSpecific: {
    subject: 'test-subject',
    policy: 'test-policy',
  },
};

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;
const retriableError = new ProviderError(ProviderFailure.Unhealthy);

describe('cardano-context side effects', () => {
  describe('loadTokensMetadata', () => {
    it('successfully loads token metadata and dispatches upsertTokensMetadata', () => {
      testSideEffect(loadTokensMetadata, ({ hot, cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadTokenMetadata$: hot('a', {
              a: actions.cardanoContext.loadTokenMetadata({
                tokenId: testTokenId,
              }),
            }),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTokenMetadata: vi
              .fn()
              .mockReturnValue(of(Ok<TokenMetadata>(testTokenMetadata))),
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.tokens.upsertTokensMetadata({
              metadatas: [
                {
                  tokenId: testTokenId,
                  ...testTokenMetadata,
                },
              ],
            }),
          });
        },
      }));
    });

    it('retries retriable errors then emits addFailure with loadTokenMetadata retryAction', () => {
      testSideEffect(
        loadTokensMetadata,
        ({ hot, cold, expectObservable, flush }) => {
          let subscriptions = 0;
          const getTokenMetadata = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return cold('-#', {}, retriableError);
            }),
          );
          return {
            actionObservables: {
              cardanoContext: {
                loadTokenMetadata$: hot('a', {
                  a: actions.cardanoContext.loadTokenMetadata({
                    tokenId: testTokenId,
                  }),
                }),
              },
            },
            stateObservables: {
              cardanoContext: {
                selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
              },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTokenMetadata,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              // errors at frames 1, 302, 903, 2104; retryBackoff delays 300ms + 600ms + 1200ms.
              expectObservable(sideEffect$).toBe('2104ms a', {
                a: actions.failures.addFailure({
                  failureId: TokenMetadataFailureId(testTokenId),
                  message:
                    'sync.error.token-metadata-fetch-failed' as TranslationKey,
                  retryAction: actions.cardanoContext.loadTokenMetadata({
                    tokenId: testTokenId,
                  }),
                }),
              });
              flush();
              expect(subscriptions).toBe(4);
            },
          };
        },
      );
    });

    it('auto-dismisses an existing failure on successful fetch', () => {
      testSideEffect(loadTokensMetadata, ({ hot, cold, flush }) => {
        const failureId = TokenMetadataFailureId(testTokenId);
        const existingFailure: Failure = {
          failureId,
          message: 'sync.error.token-metadata-fetch-failed' as TranslationKey,
        };
        const selectFailureById$ = of((id: FailureId): Failure | undefined =>
          id === failureId ? existingFailure : undefined,
        );
        return {
          actionObservables: {
            cardanoContext: {
              loadTokenMetadata$: hot('a', {
                a: actions.cardanoContext.loadTokenMetadata({
                  tokenId: testTokenId,
                }),
              }),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
            },
            failures: { selectFailureById$ },
          },
          dependencies: {
            cardanoProvider: {
              getTokenMetadata: vi
                .fn()
                .mockReturnValue(of(Ok<TokenMetadata>(testTokenMetadata))),
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
          },
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(action => emissions.push(action));
            flush();

            expect(emissions).toEqual([
              actions.tokens.upsertTokensMetadata({
                metadatas: [
                  {
                    tokenId: testTokenId,
                    ...testTokenMetadata,
                  },
                ],
              }),
              actions.failures.dismissFailure(failureId),
            ]);
          },
        };
      });
    });

    it('handles multiple loadTokenMetadata actions with different chainIds', () => {
      testSideEffect(loadTokensMetadata, ({ hot, cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadTokenMetadata$: hot('a-b', {
              a: actions.cardanoContext.loadTokenMetadata({
                tokenId: testTokenId,
              }),
              b: actions.cardanoContext.loadTokenMetadata({
                tokenId: TokenId('test-token-id-2'),
              }),
            }),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold<Cardano.ChainId>('a-b', {
              a: chainId,
              b: Cardano.ChainIds.Mainnet,
            }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTokenMetadata: vi
              .fn()
              .mockReturnValueOnce(of(Ok<TokenMetadata>(testTokenMetadata)))
              .mockReturnValueOnce(
                of(
                  Ok<TokenMetadata>({
                    ...testTokenMetadata,
                    name: 'Test Token 2',
                    ticker: 'TEST2',
                  }),
                ),
              ),
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a-b', {
            a: actions.tokens.upsertTokensMetadata({
              metadatas: [
                {
                  tokenId: testTokenId,
                  ...testTokenMetadata,
                },
              ],
            }),
            b: actions.tokens.upsertTokensMetadata({
              metadatas: [
                {
                  tokenId: TokenId('test-token-id-2'),
                  ...testTokenMetadata,
                  name: 'Test Token 2',
                  ticker: 'TEST2',
                },
              ],
            }),
          });
        },
      }));
    });
  });
});
