import { BigNumber } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/ui-toolkit', () => ({
  ORDERS: {
    ASC: 'asc',
    DESC: 'desc',
  },
}));

import {
  applyAscendingSortOrder,
  compareTokensByTicker,
  DEFAULT_TOKEN_SORT_OPTION,
  getAvailableTokenSortOptions,
  getDefaultTokenSortOrder,
  resolveEffectiveTokenSort,
  resolveTokenSortOption,
} from '../../src/pages/portfolio/utils/portfolioSort';

import type { Token } from '@lace-contract/tokens';

const ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

const createToken = (ticker: string): Token =>
  ({
    tokenId: ticker,
    available: BigNumber(0n),
    pending: BigNumber(0n),
    decimals: 0,
    displayLongName: ticker,
    displayShortName: ticker,
    metadata: {
      blockchainSpecific: {},
      decimals: 0,
      ticker,
    },
  } as unknown as Token);

describe('portfolioSort', () => {
  const tokens = ['ZED', 'ADA', 'MIN', 'BOOK'].map(createToken);

  it('sorts ticker A to Z when order is ascending', () => {
    const sorted = [...tokens].sort((left, right) =>
      applyAscendingSortOrder(compareTokensByTicker(left, right), ORDERS.ASC),
    );

    expect(sorted.map(token => token.metadata?.ticker)).toEqual([
      'ADA',
      'BOOK',
      'MIN',
      'ZED',
    ]);
  });

  it('sorts ticker Z to A when order is descending', () => {
    const sorted = [...tokens].sort((left, right) =>
      applyAscendingSortOrder(compareTokensByTicker(left, right), ORDERS.DESC),
    );

    expect(sorted.map(token => token.metadata?.ticker)).toEqual([
      'ZED',
      'MIN',
      'BOOK',
      'ADA',
    ]);
  });

  it('defaults to sorting by value in descending order', () => {
    expect(DEFAULT_TOKEN_SORT_OPTION).toBe('value');
    expect(getDefaultTokenSortOrder(DEFAULT_TOKEN_SORT_OPTION)).toBe(
      ORDERS.DESC,
    );
  });

  describe('resolveEffectiveTokenSort', () => {
    it('keeps the order that belongs to an explicit option', () => {
      expect(resolveEffectiveTokenSort('ticker', ORDERS.DESC)).toEqual({
        option: 'ticker',
        order: ORDERS.DESC,
      });
    });

    it.each([ORDERS.ASC, ORDERS.DESC])(
      'discards a leftover %s order when no option is active',
      order => {
        expect(resolveEffectiveTokenSort(undefined, order)).toEqual({
          option: 'value',
          order: ORDERS.DESC,
        });
      },
    );
  });

  describe('resolveTokenSortOption', () => {
    it('keeps an option the current network offers', () => {
      expect(resolveTokenSortOption('value', true)).toBe('value');
      expect(resolveTokenSortOption('ticker', false)).toBe('ticker');
    });

    it('drops value when token pricing is unavailable', () => {
      expect(getAvailableTokenSortOptions(false)).not.toContain('value');
      expect(resolveTokenSortOption('value', false)).toBeUndefined();
    });

    it('drops an unrecognised option', () => {
      expect(
        resolveTokenSortOption(
          'marketCap' as unknown as typeof DEFAULT_TOKEN_SORT_OPTION,
          true,
        ),
      ).toBeUndefined();
    });
  });
});
