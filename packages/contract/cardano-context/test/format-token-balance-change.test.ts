import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  formatTokenBalanceChangeAmount,
  formatTokenBalanceChangeSymbol,
} from '../src/format-token-balance-change';

import type { ActivityTokenBalanceChange } from '@lace-contract/activities';

const lovelaceChange = (amount: bigint): ActivityTokenBalanceChange => ({
  tokenId: TokenId('lovelace'),
  amount: BigNumber(amount),
  token: undefined,
});

const assetId = TokenId(
  '63f01fe6cd68ec6438c95a46cea4a6cd27efb791b5e8cc1fa92af3294962696c65636f696e3334',
);

describe('formatTokenBalanceChangeAmount', () => {
  it('adds fee back when lovelace delta is negative', () => {
    const change = lovelaceChange(-1_180_000n);
    expect(formatTokenBalanceChangeAmount(change, '1000000')).toBe('-0.18');
  });

  it('does not adjust when lovelace delta is positive', () => {
    const change = lovelaceChange(5_000_000n);
    expect(formatTokenBalanceChangeAmount(change, '1000000')).toBe('5.00');
  });

  it('does not adjust when fee is undefined', () => {
    const change = lovelaceChange(-1_180_000n);
    expect(formatTokenBalanceChangeAmount(change, undefined)).toBe('-1.18');
  });

  it('denominates non-lovelace amounts using token metadata', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: assetId,
      amount: BigNumber(1500n),
      token: {
        decimals: 2,
        isNft: false,
      } as ActivityTokenBalanceChange['token'],
    };
    expect(formatTokenBalanceChangeAmount(change, '1000')).toBe('15.00');
  });

  it('returns raw amount when token metadata is missing', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: assetId,
      amount: BigNumber(7n),
      token: undefined,
    };
    expect(formatTokenBalanceChangeAmount(change, undefined)).toBe('7.00');
  });
});

describe('formatTokenBalanceChangeSymbol', () => {
  it('returns the native coin symbol for lovelace', () => {
    expect(
      formatTokenBalanceChangeSymbol(lovelaceChange(1n), 'tADA', '?'),
    ).toBe('tADA');
  });

  it('prefers ticker when available', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: assetId,
      amount: BigNumber(1n),
      token: {
        ticker: 'IBIL',
        name: 'Ibilecoin',
      } as ActivityTokenBalanceChange['token'],
    };
    expect(formatTokenBalanceChangeSymbol(change, 'ADA', '?')).toBe('IBIL');
  });

  it('falls back to name when ticker is missing', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: assetId,
      amount: BigNumber(1n),
      token: {
        name: 'Ibilecoin',
      } as ActivityTokenBalanceChange['token'],
    };
    expect(formatTokenBalanceChangeSymbol(change, 'ADA', '?')).toBe(
      'Ibilecoin',
    );
  });

  it('falls back to asset fingerprint when token metadata is missing', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: assetId,
      amount: BigNumber(1n),
      token: undefined,
    };
    expect(formatTokenBalanceChangeSymbol(change, 'ADA', '?')).toMatch(
      /^asset1/,
    );
  });

  it('returns unknown ticker label when tokenId is not a valid asset id', () => {
    const change: ActivityTokenBalanceChange = {
      tokenId: TokenId('not-a-valid-asset-id'),
      amount: BigNumber(1n),
      token: undefined,
    };
    expect(formatTokenBalanceChangeSymbol(change, 'ADA', 'Unknown')).toBe(
      'Unknown',
    );
  });
});
