import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { createChainMinimumAmountTokenValidator } from '../../src/exposed-modules/chain-minimum-amount-token-validator';

import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const createMockToken = (tokenId: string): Token => ({
  tokenId: TokenId(tokenId),
  blockchainName: 'Cardano',
  accountId: 'test-account' as AccountId,
  address: 'test-address' as Address,
  available: BigNumber(0n),
  pending: BigNumber(0n),
  decimals: 6,
  displayLongName: 'Token',
  displayShortName: 'TKN',
  metadata: {
    ticker: 'TKN',
    name: 'Token',
    decimals: 6,
    blockchainSpecific: {},
  },
});

describe('Cardano ChainMinimumAmountTokenValidator', () => {
  const validator = createChainMinimumAmountTokenValidator();

  describe('blockchainName', () => {
    it('should have correct blockchain name', () => {
      expect(validator.blockchainName).toBe('Cardano');
    });
  });

  describe('hasChainMinimumAmount', () => {
    it('returns true for the Cardano native token (lovelace)', () => {
      expect(
        validator.hasChainMinimumAmount(createMockToken(LOVELACE_TOKEN_ID)),
      ).toBe(true);
    });

    it('returns false for any non-lovelace token', () => {
      expect(
        validator.hasChainMinimumAmount(createMockToken('native-asset.id')),
      ).toBe(false);
    });
  });

  describe('formatMinimumAmount', () => {
    it('converts a typical minAda (1_000_000 lovelace) to "1"', () => {
      const token = createMockToken(LOVELACE_TOKEN_ID);
      expect(validator.formatMinimumAmount(BigNumber(1_000_000n), token)).toBe(
        '1',
      );
    });

    it('converts 1 lovelace to "0.000001"', () => {
      const token = createMockToken(LOVELACE_TOKEN_ID);
      expect(validator.formatMinimumAmount(BigNumber(1n), token)).toBe(
        '0.000001',
      );
    });

    it('converts zero to "0"', () => {
      const token = createMockToken(LOVELACE_TOKEN_ID);
      expect(validator.formatMinimumAmount(BigNumber(0n), token)).toBe('0');
    });
  });
});
