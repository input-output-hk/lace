import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { tokensActions } from '@lace-contract/tokens';
import { TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { loadTokensMetadata } from '../../../src/store/side-effects/load-tokens-metadata';
import { chainId } from '../../mocks';

import type { CardanoProviderDependencies } from '../../../src/types';
import type { TokenMetadata } from '@lace-contract/tokens';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
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

    it('handles getTokenMetadata failure and dispatches getTokenMetadataFailed', () => {
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
        },
        dependencies: {
          cardanoProvider: {
            getTokenMetadata: vi
              .fn()
              .mockReturnValue(
                of(Err(new ProviderError(ProviderFailure.ConnectionFailure))),
              ),
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.getTokenMetadataFailed({
              tokenId: testTokenId,
              failure: ProviderFailure.ConnectionFailure,
            }),
          });
        },
      }));
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

    it('handles mixed success and failure scenarios', () => {
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
            selectChainId$: cold<Cardano.ChainId>('a', { a: chainId }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTokenMetadata: vi
              .fn()
              .mockReturnValueOnce(of(Ok<TokenMetadata>(testTokenMetadata)))
              .mockReturnValueOnce(
                of(Err(new ProviderError(ProviderFailure.BadRequest))),
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
            b: actions.cardanoContext.getTokenMetadataFailed({
              tokenId: TokenId('test-token-id-2'),
              failure: ProviderFailure.BadRequest,
            }),
          });
        },
      }));
    });
  });
});
