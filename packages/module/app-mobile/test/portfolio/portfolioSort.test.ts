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
  getTokenSortOrder,
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

  it('uses ascending order when no sort option is active', () => {
    expect(getTokenSortOrder(undefined, undefined)).toBe(ORDERS.ASC);
    expect(getTokenSortOrder(ORDERS.DESC, undefined)).toBe(ORDERS.ASC);
  });
});
