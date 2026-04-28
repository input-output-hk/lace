import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { TokenId } from '../../src';
import { tokensSelectors } from '../../src/store/slice/slice';

import {
  buildTestScenario,
  mockAccount1Id,
  mockAccount2Id,
  mockAddress1,
  mockAddress2,
  mockAddress3,
} from './mock-tokens';

import type { RawTokensState } from '../../src/store/slice/rawTokensSlice';
import type { TokensMetadataState } from '../../src/store/slice/tokensMetadataSlice';
import type { Token } from '../../src/types';
import type { State } from '@lace-contract/module';

// Helper functions for creating test state
const createMockState = (
  rawTokensState: RawTokensState,
  tokensMetadataState: TokensMetadataState = { byTokenId: {} },
): State =>
  ({
    rawTokens: rawTokensState,
    tokensMetadata: tokensMetadataState,
  } as unknown as State);

const executeSelector = (
  rawTokensState: RawTokensState,
  accountId: AccountId,
  tokensMetadataState: TokensMetadataState = { byTokenId: {} },
): Token[] => {
  const state = createMockState(rawTokensState, tokensMetadataState);
  return tokensSelectors.tokens.selectAggregatedFungibleTokensByAccountId(
    state,
    accountId,
  );
};

const expectSingleToken = (result: Token[], expected: Partial<Token>): void => {
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject(expected);
};

describe('selectAggregatedFungibleTokensByAccountId', () => {
  describe('edge cases', () => {
    it('should return empty array when account does not exist', () => {
      const result = executeSelector({}, AccountId('non-existent-account'));
      expect(result).toEqual([]);
    });

    it('should return empty array when account has no tokens', () => {
      const accountId = AccountId('account-1');
      const scenario = buildTestScenario([
        {
          tokenId: TokenId('token-1'),
          accountId: mockAccount2Id,
          address: mockAddress1,
          available: 1000000n,
        },
      ]);

      const result = executeSelector(scenario.rawTokensState, accountId);
      expect(result).toEqual([]);
    });
  });

  describe('single address scenarios', () => {
    it('should return fungible token from single address', () => {
      const tokenId = TokenId('token-1');
      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [tokenId]: {
            tokenId,
            ticker: 'TOKEN',
            name: 'Test Token',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expectSingleToken(result, {
        tokenId,
        available: BigNumber(1000000n),
        accountId: mockAccount1Id,
      });
    });

    it('should return multiple fungible tokens from single address each', () => {
      const token1Id = TokenId('token-1');
      const token2Id = TokenId('token-2');

      const scenario = buildTestScenario([
        {
          tokenId: token1Id,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
        {
          tokenId: token2Id,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 2000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [token1Id]: {
            tokenId: token1Id,
            ticker: 'TOKEN1',
            name: 'Test Token 1',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
          [token2Id]: {
            tokenId: token2Id,
            ticker: 'TOKEN2',
            name: 'Test Token 2',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expect(result).toHaveLength(2);
      const token1 = result.find(t => t.tokenId === token1Id);
      const token2 = result.find(t => t.tokenId === token2Id);

      expect(token1?.available).toEqual(BigNumber(1000000n));
      expect(token2?.available).toEqual(BigNumber(2000000n));
    });
  });

  describe('multi-address aggregation', () => {
    it('should aggregate same token across multiple addresses', () => {
      const tokenId = TokenId('token-1');

      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress2,
          available: 2000000n,
        },
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress3,
          available: 3000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [tokenId]: {
            tokenId,
            ticker: 'TOKEN',
            name: 'Test Token',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      // Should aggregate: 1000000 + 2000000 + 3000000 = 6000000
      expectSingleToken(result, {
        tokenId,
        available: BigNumber(6000000n),
      });
    });

    it('should aggregate multiple tokens across multiple addresses', () => {
      const token1Id = TokenId('token-1');
      const token2Id = TokenId('token-2');

      const scenario = buildTestScenario([
        {
          tokenId: token1Id,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
        {
          tokenId: token2Id,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 500000n,
        },
        {
          tokenId: token1Id,
          accountId: mockAccount1Id,
          address: mockAddress2,
          available: 2000000n,
        },
        {
          tokenId: token2Id,
          accountId: mockAccount1Id,
          address: mockAddress2,
          available: 750000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [token1Id]: {
            tokenId: token1Id,
            ticker: 'TOKEN1',
            name: 'Test Token 1',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
          [token2Id]: {
            tokenId: token2Id,
            ticker: 'TOKEN2',
            name: 'Test Token 2',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expect(result).toHaveLength(2);

      const token1 = result.find(t => t.tokenId === token1Id);
      const token2 = result.find(t => t.tokenId === token2Id);

      // Token 1: 1000000 + 2000000 = 3000000
      expect(token1?.available).toEqual(BigNumber(3000000n));

      // Token 2: 500000 + 750000 = 1250000
      expect(token2?.available).toEqual(BigNumber(1250000n));
    });
  });

  describe('NFT filtering', () => {
    it('should exclude NFTs from results', () => {
      const nftTokenId = TokenId('nft-token');
      const fungibleTokenId = TokenId('fungible-token');

      const scenario = buildTestScenario([
        {
          tokenId: nftTokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1n,
        },
        {
          tokenId: fungibleTokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [nftTokenId]: {
            tokenId: nftTokenId,
            name: 'NFT Token',
            decimals: 0,
            blockchainSpecific: {},
            isNft: true,
          },
          [fungibleTokenId]: {
            tokenId: fungibleTokenId,
            ticker: 'FT',
            name: 'Fungible Token',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expectSingleToken(result, {
        tokenId: fungibleTokenId,
      });
      expect(result[0].metadata?.isNft).toBe(false);
    });

    it('should return empty array when all tokens are NFTs', () => {
      const nft1TokenId = TokenId('nft-1');
      const nft2TokenId = TokenId('nft-2');

      const scenario = buildTestScenario([
        {
          tokenId: nft1TokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1n,
        },
        {
          tokenId: nft2TokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [nft1TokenId]: {
            tokenId: nft1TokenId,
            name: 'NFT 1',
            decimals: 0,
            blockchainSpecific: {},
            isNft: true,
          },
          [nft2TokenId]: {
            tokenId: nft2TokenId,
            name: 'NFT 2',
            decimals: 0,
            blockchainSpecific: {},
            isNft: true,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expect(result).toEqual([]);
    });

    it('should exclude NFT even when spread across multiple addresses', () => {
      const nftTokenId = TokenId('nft-token');

      const scenario = buildTestScenario([
        {
          tokenId: nftTokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1n,
        },
        {
          tokenId: nftTokenId,
          accountId: mockAccount1Id,
          address: mockAddress2,
          available: 1n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [nftTokenId]: {
            tokenId: nftTokenId,
            name: 'NFT Token',
            decimals: 0,
            blockchainSpecific: {},
            isNft: true,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expect(result).toEqual([]);
    });
  });

  describe('account isolation', () => {
    it('should only return tokens for the specified account', () => {
      const tokenId = TokenId('token-1');

      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
        {
          tokenId,
          accountId: mockAccount2Id,
          address: mockAddress2,
          available: 2000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [tokenId]: {
            tokenId,
            ticker: 'TOKEN',
            name: 'Test Token',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result1 = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );
      const result2 = executeSelector(
        scenario.rawTokensState,
        mockAccount2Id,
        tokensMetadata,
      );

      expectSingleToken(result1, {
        available: BigNumber(1000000n),
        accountId: mockAccount1Id,
      });

      expectSingleToken(result2, {
        available: BigNumber(2000000n),
        accountId: mockAccount2Id,
      });
    });
  });

  describe('token metadata handling', () => {
    it('should handle tokens without metadata', () => {
      const tokenId = TokenId('token-1');

      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
      ]);

      const result = executeSelector(scenario.rawTokensState, mockAccount1Id);

      expectSingleToken(result, { tokenId });
      expect(result[0].metadata).toBeUndefined();
    });

    it('should include metadata when available', () => {
      const tokenId = TokenId('token-1');

      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [tokenId]: {
            tokenId,
            ticker: 'TKN',
            name: 'Test Token',
            decimals: 6,
            image: 'http://example.com/token.png',
            blockchainSpecific: { policyId: 'policy123' },
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expectSingleToken(result, { tokenId });
      expect(result[0].metadata?.ticker).toBe('TKN');
      expect(result[0].metadata?.name).toBe('Test Token');
      expect(result[0].metadata?.image).toBe('http://example.com/token.png');
      expect(result[0].metadata?.decimals).toBe(6);
    });
  });

  describe('context data preservation', () => {
    it('should use first tokens context data for aggregated token', () => {
      const tokenId = TokenId('token-1');

      const scenario = buildTestScenario([
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress1,
          available: 1000000n,
        },
        {
          tokenId,
          accountId: mockAccount1Id,
          address: mockAddress2,
          available: 2000000n,
        },
      ]);

      const tokensMetadata: TokensMetadataState = {
        byTokenId: {
          [tokenId]: {
            tokenId,
            ticker: 'TOKEN',
            decimals: 6,
            blockchainSpecific: {},
            isNft: false,
          },
        },
      };

      const result = executeSelector(
        scenario.rawTokensState,
        mockAccount1Id,
        tokensMetadata,
      );

      expectSingleToken(result, {
        accountId: mockAccount1Id,
        blockchainName: 'Cardano',
      });
      // The address will be from one of the tokens (implementation uses first token)
      expect([mockAddress1, mockAddress2]).toContain(result[0].address);
    });
  });
});
