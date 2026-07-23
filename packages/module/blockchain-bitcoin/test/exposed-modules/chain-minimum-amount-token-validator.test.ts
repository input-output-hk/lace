import { BITCOIN_TOKEN_ID } from '@lace-contract/bitcoin-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import { describe, it, expect } from 'vitest';

import { createChainMinimumAmountTokenValidator } from '../../src/exposed-modules/chain-minimum-amount-token-validator';

import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const createMockToken = (tokenId: string): Token => ({
  tokenId: TokenId(tokenId),
  blockchainName: 'Bitcoin',
  accountId: 'test-account' as AccountId,
  address: 'test-address' as Address,
  available: BigNumber(0n),
  pending: BigNumber(0n),
  decimals: 8,
  displayLongName: 'Token',
  displayShortName: 'TKN',
  metadata: {
    ticker: 'TKN',
    name: 'Token',
    decimals: 8,
    blockchainSpecific: {},
  },
});

describe('Bitcoin ChainMinimumAmountTokenValidator', () => {
  const validator = createChainMinimumAmountTokenValidator();

  describe('blockchainName', () => {
    it('should have correct blockchain name', () => {
      expect(validator.blockchainName).toBe('Bitcoin');
    });
  });

  describe('hasChainMinimumAmount', () => {
    it('returns true for the Bitcoin native token', () => {
      expect(
        validator.hasChainMinimumAmount(createMockToken(BITCOIN_TOKEN_ID)),
      ).toBe(true);
    });

    it('returns false for any non-Bitcoin token', () => {
      expect(
        validator.hasChainMinimumAmount(createMockToken('not-bitcoin')),
      ).toBe(false);
    });
  });

  describe('formatMinimumAmount', () => {
    it('converts the dust threshold (546 sat) to BTC', () => {
      const token = createMockToken(BITCOIN_TOKEN_ID);
      expect(validator.formatMinimumAmount(BigNumber(546n), token)).toBe(
        '0.00000546',
      );
    });

    it('converts 1 BTC (100_000_000 sat) to "1"', () => {
      const token = createMockToken(BITCOIN_TOKEN_ID);
      expect(
        validator.formatMinimumAmount(BigNumber(100_000_000n), token),
      ).toBe('1');
    });

    it('converts zero to "0"', () => {
      const token = createMockToken(BITCOIN_TOKEN_ID);
      expect(validator.formatMinimumAmount(BigNumber(0n), token)).toBe('0');
    });
  });
});
