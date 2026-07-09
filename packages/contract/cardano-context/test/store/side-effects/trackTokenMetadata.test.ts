import {
  type Cardano,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { failuresActions } from '@lace-contract/failures';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Milliseconds, Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
  LOVELACE_TOKEN_ID,
} from '../../../src/const';
import { cardanoContextActions } from '../../../src/store';
import { trackTokenMetadata } from '../../../src/store/side-effects';
import { TokenMetadataFailureId } from '../../../src/value-objects';
import {
  account0someAdaTokens,
  account1someAdaTokens,
  account1someOtherTokens,
  chainId,
  midnightDustTokens,
} from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type {
  RawToken,
  StoredTokenMetadata,
  TokenId,
  TokenMetadata,
} from '@lace-contract/tokens';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
  ...failuresActions,
};
const batchInterval = Milliseconds(5);

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;

const retriableError = new ProviderError(ProviderFailure.Unhealthy);

describe('cardano-context side effects', () => {
  describe('trackTokenMetadata', () => {
    it('queries token metadata for every Cardano token without metadata and emits upsertTokensMetadata in batches', () => {
      testSideEffect(
        trackTokenMetadata(batchInterval),
        ({ cold, hot, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllRaw$ = hot<RawToken[]>('a-b-c', {
            a: [midnightDustTokens],
            b: [midnightDustTokens, account0someAdaTokens],
            c: [
              midnightDustTokens,
              account0someAdaTokens,
              account1someAdaTokens,
              account1someOtherTokens,
            ],
          });
          const selectTokensMetadata$ = hot<
            Partial<Record<TokenId, StoredTokenMetadata>>
          >('a', {
            a: {
              [account1someOtherTokens.tokenId]: {
                tokenId: account1someOtherTokens.tokenId,
                decimals: 0,
                blockchainSpecific: {
                  metadataSchemaVersion: CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
                },
              },
            },
          });

          const lovelaceMetadata = {
            decimals: 6,
            blockchainSpecific: {
              metadataSchemaVersion: CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
            },
          };
          const getTokenMetadata = vi
            .fn()
            .mockReturnValue(of(Ok<TokenMetadata>(lovelaceMetadata)));

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
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
              expectObservable(sideEffect$, '^ 20ms !').toBe('-------d', {
                d: actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    { tokenId: LOVELACE_TOKEN_ID, ...lovelaceMetadata },
                  ],
                }),
              });

              flush();
              expect(getTokenMetadata).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('retries retriable errors with exponential backoff then emits addFailure with loadTokenMetadata retryAction', () => {
      testSideEffect(
        trackTokenMetadata(batchInterval),
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllRaw$ = cold<RawToken[]>('a', {
            a: [account0someAdaTokens],
          });
          const selectTokensMetadata$ = cold<
            Partial<Record<TokenId, StoredTokenMetadata>>
          >('a', { a: {} });

          let subscriptions = 0;
          const getTokenMetadata = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              return cold('-#', {}, retriableError);
            }),
          );

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
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
                  failureId: TokenMetadataFailureId(LOVELACE_TOKEN_ID),
                  message:
                    'sync.error.token-metadata-fetch-failed' as TranslationKey,
                  retryAction: actions.cardanoContext.loadTokenMetadata({
                    tokenId: LOVELACE_TOKEN_ID,
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

    it('recovers on retry success and emits upsertTokensMetadata without addFailure', () => {
      testSideEffect(
        trackTokenMetadata(batchInterval),
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllRaw$ = cold<RawToken[]>('a', {
            a: [account0someAdaTokens],
          });
          const selectTokensMetadata$ = cold<
            Partial<Record<TokenId, StoredTokenMetadata>>
          >('a', { a: {} });

          const lovelaceMetadata = { decimals: 6, blockchainSpecific: {} };
          let subscriptions = 0;
          const getTokenMetadata = vi.fn().mockImplementation(() =>
            defer(() => {
              subscriptions += 1;
              if (subscriptions === 1) return cold('-#', {}, retriableError);
              return cold('(a|)', { a: Ok<TokenMetadata>(lovelaceMetadata) });
            }),
          );

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
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
              // retry subscribes at frame 301, emits Ok; bufferTime(5) flushes at 306.
              expectObservable(sideEffect$, '^ 310ms !').toBe('306ms a', {
                a: actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    { tokenId: LOVELACE_TOKEN_ID, ...lovelaceMetadata },
                  ],
                }),
              });
              flush();
              expect(subscriptions).toBe(2);
            },
          };
        },
      );
    });

    it('auto-dismisses an existing failure on successful fetch', () => {
      testSideEffect(
        trackTokenMetadata(batchInterval),
        ({ cold, expectObservable }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllRaw$ = cold<RawToken[]>('a', {
            a: [account0someAdaTokens],
          });
          const selectTokensMetadata$ = cold<
            Partial<Record<TokenId, StoredTokenMetadata>>
          >('a', { a: {} });

          const failureId = TokenMetadataFailureId(LOVELACE_TOKEN_ID);
          const existingFailure: Failure = {
            failureId,
            message: 'sync.error.token-metadata-fetch-failed' as TranslationKey,
          };
          const selectFailureById$ = of((id: FailureId): Failure | undefined =>
            id === failureId ? existingFailure : undefined,
          );

          const lovelaceMetadata = { decimals: 6, blockchainSpecific: {} };
          const getTokenMetadata = vi
            .fn()
            .mockReturnValue(of(Ok<TokenMetadata>(lovelaceMetadata)));

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
              failures: { selectFailureById$ },
            },
            dependencies: {
              cardanoProvider: {
                getTokenMetadata,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              // bufferTime(5) flushes at frame 5; success path emits upsert + dismiss synchronously.
              expectObservable(sideEffect$, '^ 10ms !').toBe('5ms (ab)', {
                a: actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    { tokenId: LOVELACE_TOKEN_ID, ...lovelaceMetadata },
                  ],
                }),
                b: actions.failures.dismissFailure(failureId),
              });
            },
          };
        },
      );
    });

    it('refreshes stale Cardano metadata missing the schema version', () => {
      testSideEffect(
        trackTokenMetadata(batchInterval),
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllRaw$ = cold<RawToken[]>('a', {
            a: [account0someAdaTokens],
          });
          const selectTokensMetadata$ = cold<
            Partial<Record<TokenId, StoredTokenMetadata>>
          >('a', {
            a: {
              [LOVELACE_TOKEN_ID]: {
                tokenId: LOVELACE_TOKEN_ID,
                decimals: 6,
                blockchainSpecific: {},
              },
            },
          });

          const refreshedMetadata = {
            decimals: 6,
            blockchainSpecific: {
              metadataSchemaVersion: CARDANO_TOKEN_METADATA_SCHEMA_VERSION,
            },
          };
          const getTokenMetadata = vi
            .fn()
            .mockReturnValue(of(Ok<TokenMetadata>(refreshedMetadata)));

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
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
              expectObservable(sideEffect$, '^ 20ms !').toBe('-----a', {
                a: actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      ...refreshedMetadata,
                    },
                  ],
                }),
              });

              flush();
              expect(getTokenMetadata).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });
  });
});
