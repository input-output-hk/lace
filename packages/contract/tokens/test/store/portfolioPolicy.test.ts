import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { TokenId } from '../../src';
import {
  portfolioPolicyActions,
  portfolioPolicyReducers,
} from '../../src/store/slice/portfolioPolicySlice';
import {
  reducers,
  tokensActions,
  tokensSelectors,
} from '../../src/store/slice/slice';

import type { StoredTokenMetadata } from '../../src/types';
import type { State } from '@lace-contract/module';

const usdrId = TokenId('usdr-fixture-policy.55534472');

const meta = (tokenId: TokenId, ticker: string): StoredTokenMetadata => ({
  tokenId,
  name: ticker,
  ticker,
  decimals: 6,
  blockchainSpecific: {},
});

const accountId = 'acc-1';
const address = 'addr-1';
const rawEntry = (tokenId: TokenId) => ({
  tokenId,
  available: BigNumber(1_000_000n),
  pending: BigNumber(0n),
  accountId,
  address,
  blockchainName: 'Cardano' as const,
});

describe('portfolioPolicy slice', () => {
  const reducer = portfolioPolicyReducers.portfolioPolicy;

  it('starts empty', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.curatedMetadataByTokenId).toEqual({});
  });

  it('registers curated metadata keyed by tokenId (idempotent overwrite)', () => {
    const first = reducer(
      undefined,
      portfolioPolicyActions.registerCuratedMetadata({
        metadatas: [meta(usdrId, 'USDr')],
      }),
    );
    const updated = reducer(
      first,
      portfolioPolicyActions.registerCuratedMetadata({
        metadatas: [meta(usdrId, 'USDr2')],
      }),
    );
    expect(updated.curatedMetadataByTokenId[usdrId]?.ticker).toBe('USDr2');
    expect(Object.keys(updated.curatedMetadataByTokenId)).toHaveLength(1);
  });
});

describe('portfolioPolicy wiring into tokens store', () => {
  it('exposes the reducer + registration action + registry selector', () => {
    expect(reducers.portfolioPolicy).toBeTypeOf('function');
    expect(tokensActions.tokens.registerCuratedMetadata).toBeTypeOf('function');
    const state = {
      portfolioPolicy: {
        curatedMetadataByTokenId: { [usdrId]: meta(usdrId, 'USDr') },
      },
    } as unknown as State;
    expect(
      tokensSelectors.tokens.selectCuratedMetadataByTokenId(state),
    ).toEqual({ [usdrId]: meta(usdrId, 'USDr') });
  });
});

describe('selectAllTokens curated fallback', () => {
  const buildState = (onChain: Partial<Record<TokenId, StoredTokenMetadata>>) =>
    ({
      rawTokens: { [accountId]: { [address]: { [usdrId]: rawEntry(usdrId) } } },
      tokensMetadata: { byTokenId: onChain },
      portfolioPolicy: {
        curatedMetadataByTokenId: { [usdrId]: meta(usdrId, 'USDr') },
      },
    } as unknown as State);

  it('uses curated metadata when on-chain metadata is missing', () => {
    const usdr = tokensSelectors.tokens
      .selectAllTokens(buildState({}))
      .find(t => t.tokenId === usdrId);
    expect(usdr?.metadata?.ticker).toBe('USDr');
    expect(usdr?.decimals).toBe(6);
  });

  it('prefers on-chain metadata over curated when present', () => {
    const usdr = tokensSelectors.tokens
      .selectAllTokens(
        buildState({
          [usdrId]: { ...meta(usdrId, 'OCUSDr'), decimals: 8 },
        }),
      )
      .find(t => t.tokenId === usdrId);
    expect(usdr?.metadata?.ticker).toBe('OCUSDr');
    expect(usdr?.decimals).toBe(8);
  });
});
