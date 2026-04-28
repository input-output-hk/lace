import { Cardano } from '@cardano-sdk/core';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { LOVELACE_TOKEN_ID } from '../../../src/const';
import { syncLovelaceTokenTickerWithChain } from '../../../src/store/side-effects/sync-lovelace-token-ticker-with-chain';
import { chainId } from '../../mocks';

import type { StoredTokenMetadata, TokenId } from '@lace-contract/tokens';

const mainnetChainId = Cardano.ChainIds.Mainnet;

describe('syncLovelaceTokenTickerWithChain', () => {
  it('dispatches upsert when lovelace ticker disagrees with active chain (stale tADA on mainnet)', () => {
    testSideEffect(
      syncLovelaceTokenTickerWithChain,
      ({ cold, expectObservable }) => {
        const staleLovelace: StoredTokenMetadata = {
          tokenId: LOVELACE_TOKEN_ID,
          decimals: 6,
          name: 'Cardano',
          ticker: 'tADA',
          blockchainSpecific: {},
        };
        const selectChainId$ = cold<Cardano.ChainId>('a', {
          a: mainnetChainId,
        });
        const selectTokensMetadata$ = cold<
          Partial<Record<TokenId, StoredTokenMetadata>>
        >('a', {
          a: { [LOVELACE_TOKEN_ID]: staleLovelace },
        });

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$ },
            tokens: { selectTokensMetadata$ },
          },
          dependencies: { actions: tokensActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ !').toBe('(a)', {
              a: tokensActions.tokens.upsertTokenMetadata({
                ...staleLovelace,
                ticker: 'ADA',
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches upsert when lovelace ticker is ADA but chain is testnet', () => {
    testSideEffect(
      syncLovelaceTokenTickerWithChain,
      ({ cold, expectObservable }) => {
        const staleLovelace: StoredTokenMetadata = {
          tokenId: LOVELACE_TOKEN_ID,
          decimals: 6,
          name: 'Cardano',
          ticker: 'ADA',
          blockchainSpecific: {},
        };
        const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
        const selectTokensMetadata$ = cold<
          Partial<Record<TokenId, StoredTokenMetadata>>
        >('a', {
          a: { [LOVELACE_TOKEN_ID]: staleLovelace },
        });

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$ },
            tokens: { selectTokensMetadata$ },
          },
          dependencies: { actions: tokensActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ !').toBe('(a)', {
              a: tokensActions.tokens.upsertTokenMetadata({
                ...staleLovelace,
                ticker: 'tADA',
              }),
            });
          },
        };
      },
    );
  });

  it('emits nothing when ticker already matches chain', () => {
    testSideEffect(
      syncLovelaceTokenTickerWithChain,
      ({ cold, expectObservable }) => {
        const lovelace: StoredTokenMetadata = {
          tokenId: LOVELACE_TOKEN_ID,
          decimals: 6,
          name: 'Cardano',
          ticker: 'tADA',
          blockchainSpecific: {},
        };
        const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
        const selectTokensMetadata$ = cold<
          Partial<Record<TokenId, StoredTokenMetadata>>
        >('a', {
          a: { [LOVELACE_TOKEN_ID]: lovelace },
        });

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$ },
            tokens: { selectTokensMetadata$ },
          },
          dependencies: { actions: tokensActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ !').toBe('');
          },
        };
      },
    );
  });

  it('emits nothing when lovelace metadata is missing', () => {
    testSideEffect(
      syncLovelaceTokenTickerWithChain,
      ({ cold, expectObservable }) => {
        const selectChainId$ = cold<Cardano.ChainId>('a', {
          a: mainnetChainId,
        });
        const selectTokensMetadata$ = cold<
          Partial<Record<TokenId, StoredTokenMetadata>>
        >('a', { a: {} });

        return {
          actionObservables: {},
          stateObservables: {
            cardanoContext: { selectChainId$ },
            tokens: { selectTokensMetadata$ },
          },
          dependencies: { actions: tokensActions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ !').toBe('');
          },
        };
      },
    );
  });
});
