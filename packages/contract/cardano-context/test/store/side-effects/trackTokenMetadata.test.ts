import {
  type Cardano,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Milliseconds, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { LOVELACE_TOKEN_ID } from '../../../src/const';
import { cardanoContextActions } from '../../../src/store';
import { trackTokenMetadata } from '../../../src/store/side-effects';
import {
  account0someAdaTokens,
  account1someAdaTokens,
  account1someOtherTokens,
  chainId,
  midnightDustTokens,
} from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
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
};
const batchInterval = Milliseconds(5);

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
                blockchainSpecific: {},
              },
            },
          });

          const lovelaceMetadata = { decimals: 6, blockchainSpecific: {} };
          const getTokenMetadata = vi
            .fn()
            .mockReturnValue(of(Ok<TokenMetadata>(lovelaceMetadata)));

          return {
            actionObservables: {},
            stateObservables: {
              cardanoContext: { selectChainId$ },
              tokens: { selectAllRaw$, selectTokensMetadata$ },
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

    describe('when provider returns an error', () => {
      it('dispatches getTokenMetadataFailed', () => {
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

            const error = new ProviderError(ProviderFailure.ConnectionFailure);
            const getTokenMetadata = vi.fn().mockReturnValue(of(Err(error)));

            return {
              actionObservables: {},
              stateObservables: {
                cardanoContext: { selectChainId$ },
                tokens: { selectAllRaw$, selectTokensMetadata$ },
              },
              dependencies: {
                cardanoProvider: {
                  getTokenMetadata,
                } as unknown as CardanoProviderDependencies['cardanoProvider'],
                actions,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$, '^ 20ms !').toBe('a', {
                  a: actions.cardanoContext.getTokenMetadataFailed({
                    tokenId: LOVELACE_TOKEN_ID,
                    failure: error.reason,
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
});
