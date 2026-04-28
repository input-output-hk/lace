import { Cardano } from '@cardano-sdk/core';
import * as CardanoContext from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import activitiesListUiCustomisation from '../../src/exposed-modules/activities-item-ui-customisation';

import type { ActivityTokenBalanceChange } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type { AppConfig } from '@lace-contract/module';
import type { StoredTokenMetadata } from '@lace-contract/tokens';

const config = {
  cexplorerUrls: {
    [Cardano.NetworkMagics.Mainnet]: 'https://cexplorer.io',
    [Cardano.NetworkMagics.Preview]: 'https://preview.cexplorer.io',
    [Cardano.NetworkMagics.Preprod]: 'https://preprod.cexplorer.io',
    [Cardano.NetworkMagics.Sanchonet]: 'https://sanchonet.cexplorer.io',
  },
} as unknown as AppConfig;

describe('activities-item-ui-customisation', () => {
  describe('uiCustomisationSelector', () => {
    it('should return true for Cardano blockchain', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeTrue = customisation.uiCustomisationSelector({
        blockchainName: 'Cardano',
      });
      expect(shouldBeTrue).toBe(true);
    });

    it('should return false for non-Cardano blockchain', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeFalse = customisation.uiCustomisationSelector({
        blockchainName: 'Bitcoin',
      });
      expect(shouldBeFalse).toBe(false);
    });
  });

  describe('getExplorerUrl', () => {
    beforeEach(() => {
      vi.spyOn(CardanoContext, 'isCardanoAddress').mockImplementation(
        () => true,
      );
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const mockAddress = {
      data: { networkMagic: Cardano.NetworkMagics.Mainnet },
    } as unknown as AnyAddress<CardanoAddressData>;

    it('should return empty string when config is not provided', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeEmpty = customisation.getExplorerUrl({
        config: undefined,
        address: mockAddress,
        activityId: 'tx123',
      });
      expect(shouldBeEmpty).toBe('');
    });

    it('should return empty string when address is not a Cardano address', () => {
      vi.spyOn(CardanoContext, 'isCardanoAddress').mockImplementation(
        () => false,
      );

      const customisation = activitiesListUiCustomisation();
      const shouldBeEmpty = customisation.getExplorerUrl({
        config,
        address: mockAddress,
        activityId: 'tx123',
      });
      expect(shouldBeEmpty).toBe('');
    });

    it('should return empty string when address data is not available', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeEmpty = customisation.getExplorerUrl({
        config,
        address: { ...mockAddress, data: undefined },
        activityId: 'tx123',
      });
      expect(shouldBeEmpty).toBe('');
    });

    it('should return correct explorer URL', () => {
      const customisation = activitiesListUiCustomisation();
      const shouldBeMainnetUrl = customisation.getExplorerUrl({
        config,
        address: mockAddress,
        activityId: 'tx123',
      });
      expect(shouldBeMainnetUrl).toBe('https://cexplorer.io/tx/tx123');
    });
  });

  describe('getTokensInfoSummary', () => {
    const mockTranslations = {
      nfts: 'NFTs',
      tokens: 'Tokens',
      mixed: 'Assets',
      unknownToken: 'Unknown Token',
    };

    const createMockTokenBalanceChange = (
      tokenId: TokenId,
      amount: BigNumber,
      token?: Partial<StoredTokenMetadata>,
    ): ActivityTokenBalanceChange => ({
      tokenId,
      amount,
      token: { tokenId, ...token } as StoredTokenMetadata,
    });

    const ADA_TOKEN_ID = TokenId('lovelace');
    const nativeTokenId1 = TokenId('native-token-1');

    const getTokensInfoSummary = (
      tokenBalanceChanges: ActivityTokenBalanceChange[],
    ) => {
      const customisation = activitiesListUiCustomisation();
      return customisation.getTokensInfoSummary?.(
        tokenBalanceChanges,
        mockTranslations,
      );
    };

    beforeEach(() => {
      vi.spyOn(CardanoContext, 'LOVELACE_TOKEN_ID', 'get').mockReturnValue(
        ADA_TOKEN_ID,
      );
    });

    describe('ADA balance change', () => {
      it('returns formatted ADA amount', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(2500000n), {
            decimals: 6,
            displayDecimalPlaces: 2,
            ticker: 'ADA',
            name: 'Cardano',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '2.50',
            label: 'ADA',
          },
        });
      });
    });

    describe('single token change', () => {
      it('displays token ticker when ADA amount is below 5 ADA threshold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(2000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(nativeTokenId1, BigNumber(100000n), {
            decimals: 3,
            displayDecimalPlaces: 2,
            ticker: 'NATIVE',
            name: 'Native Token',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '≈100.00',
            label: 'NATIVE',
          },
        });
      });

      it('falls back to tokens only when ADA amount is above 5 ADA threshold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(6000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(nativeTokenId1, BigNumber(100000n), {
            decimals: 3,
            ticker: 'NATIVE',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '2',
            label: mockTranslations.tokens,
          },
        });
      });

      it('uses token name when no ticker available', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(1000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(nativeTokenId1, BigNumber(50000n), {
            decimals: 2,
            displayDecimalPlaces: 1,
            name: 'My Native Token',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '≈500.0',
            label: 'My Native Token',
          },
        });
      });

      it('uses unknown token label when no ticker or name', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(1000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(nativeTokenId1, BigNumber(50000n), {
            decimals: 2,
            displayDecimalPlaces: 1,
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '≈500.0',
            label: mockTranslations.unknownToken,
          },
        });
      });

      it('handles negative ADA amounts (absolute value below threshold)', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(-2000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(nativeTokenId1, BigNumber(100000n), {
            decimals: 3,
            ticker: 'NATIVE',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '≈100.00',
            label: 'NATIVE',
          },
        });
      });
    });

    describe('NFTs only transactions', () => {
      it('returns amount and name for single NFT when below 5 ADA threshold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(4999999n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('nft-1'), BigNumber(1n), {
            name: 'Cool NFT',
            isNft: true,
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '',
            label: 'Cool NFT',
          },
        });
      });

      it('returns NFT count for multiple NFTs when below 5 ADA threshold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(4999999n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('nft-1'), BigNumber(1n), {
            decimals: 0,
            name: 'Cool NFT 1',
            isNft: true,
          }),
          createMockTokenBalanceChange(TokenId('nft-2'), BigNumber(1n), {
            decimals: 0,
            name: 'Cool NFT 2',
            isNft: true,
          }),
          createMockTokenBalanceChange(TokenId('nft-3'), BigNumber(1n), {
            decimals: 0,
            name: 'Cool NFT 3',
            isNft: true,
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '3',
            label: mockTranslations.nfts,
          },
        });
      });

      it('returns mixed assets when above 5 ADA threshold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(5000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('nft-1'), BigNumber(1n), {
            decimals: 0,
            name: 'Cool NFT 1',
            isNft: true,
          }),
          createMockTokenBalanceChange(TokenId('nft-2'), BigNumber(1n), {
            decimals: 0,
            name: 'Cool NFT 2',
            isNft: true,
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '3',
            label: mockTranslations.mixed,
          },
          subtitle: `1 ${mockTranslations.tokens}, 2 ${mockTranslations.nfts}`,
        });
      });
    });

    describe('tokens only transactions', () => {
      it('returns native token count when ADA below threshhold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(4999999n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('token-1'), BigNumber(1000n), {
            decimals: 3,
            name: 'Token 1',
          }),
          createMockTokenBalanceChange(TokenId('token-2'), BigNumber(2000n), {
            decimals: 6,
            name: 'Token 2',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '2',
            label: 'Tokens',
          },
        });
      });

      it('includes ADA in token count when above threshhold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(5000000n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('token-1'), BigNumber(1000n), {
            decimals: 3,
            name: 'Token 1',
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '2',
            label: 'Tokens',
          },
        });
      });
    });

    describe('mixed NFTs and tokens transactions', () => {
      it('returns mixed summary counting only native tokens when ADA below threshhold', () => {
        const tokenBalanceChanges = [
          createMockTokenBalanceChange(ADA_TOKEN_ID, BigNumber(4999999n), {
            decimals: 6,
            ticker: 'ADA',
          }),
          createMockTokenBalanceChange(TokenId('token-1'), BigNumber(1000n), {
            decimals: 3,
            name: 'Token 1',
          }),
          createMockTokenBalanceChange(TokenId('nft-1'), BigNumber(1n), {
            decimals: 0,
            name: 'NFT 1',
            isNft: true,
          }),
          createMockTokenBalanceChange(TokenId('token-2'), BigNumber(2000n), {
            decimals: 6,
            name: 'Token 2',
          }),
          createMockTokenBalanceChange(TokenId('nft-2'), BigNumber(1n), {
            decimals: 0,
            name: 'NFT 2',
            isNft: true,
          }),
        ];

        expect(getTokensInfoSummary(tokenBalanceChanges)).toEqual({
          title: {
            amount: '4',
            label: mockTranslations.mixed,
          },
          subtitle: `2 ${mockTranslations.tokens}, 2 ${mockTranslations.nfts}`,
        });
      });
    });

    describe('edge cases', () => {
      // These should technically not be possible, but it's good to have defaults
      it('handles empty token balance changes array', () => {
        expect(getTokensInfoSummary([])).toEqual({
          title: {
            amount: '0',
            label: mockTranslations.unknownToken,
          },
        });
      });
    });
  });
});
